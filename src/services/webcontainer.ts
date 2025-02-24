import { WebContainer } from '@webcontainer/api';
import { log } from '../utils';
import { globScript } from './glob';

// 初始化 WebContainer
export const initWebContainer = async () => {
  log('开始初始化 WebContainer');
  try {
    // 确保没有遗留的实例
    if (window.webcontainerInstance) {
      log('销毁遗留的 WebContainer 实例');
      await window.webcontainerInstance.teardown();
      window.webcontainerInstance = null;
    }

    log('尝试启动 WebContainer');
    const webcontainerInstance = await WebContainer.boot();
    window.webcontainerInstance = webcontainerInstance;
    log('WebContainer 启动成功');

    // 安装必要的依赖
    log('开始挂载 package.json');
    await webcontainerInstance.mount({
      'package.json': {
        file: {
          contents: JSON.stringify({
            name: 'repo-processor',
            type: 'module',
            dependencies: {
              'isomorphic-git': '^1.25.3',
              '@isomorphic-git/lightning-fs': '^4.6.0',
              'fast-glob': '^3.3.2'
            }
          }, null, 2)
        }
      },
      'clone.js': {
        file: {
          contents: `
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web/index.js';
import { promises as fs } from 'fs';

const url = process.argv[2];
const dir = process.argv[3];

// 立即退出函数
const exit = (code) => {
  console.log(\`退出进程，退出码: \${code}\`);
  process.exit(code);
};

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('未处理的 Promise 拒绝:', error);
  exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  exit(1);
});

async function clone() {
  try {
    console.log('开始克隆:', url, '到', dir);
    
    // 确保目录存在
    await fs.mkdir(dir, { recursive: true });
    
    await git.clone({
      fs,
      http,
      url,
      dir,
      depth: 1,
      singleBranch: true,
      onProgress: (progress) => {
        console.log(JSON.stringify(progress));
      },
      onAuth: () => ({
        username: process.env.GITHUB_TOKEN || undefined,
        password: process.env.GITHUB_TOKEN || undefined,
      }),
    });
    
    console.log('克隆完成');
    // 确保在所有操作完成后立即退出
    setTimeout(() => exit(0), 100);
  } catch (error) {
    console.error('克隆失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
    }
    exit(1);
  }
}

// 启动克隆并确保错误被捕获
clone().catch((error) => {
  console.error('克隆过程出错:', error);
  exit(1);
});`
        }
      },
      'glob.js': {
        file: {
          contents: globScript
        }
      }
    });
    log('文件挂载成功');

    // 安装依赖
    log('开始安装依赖');
    const installProcess = await webcontainerInstance.spawn('npm', ['install']);
    log('npm install 进程已启动');

    // 等待安装完成
    const exitCode = await installProcess.exit;
    log('npm install 完成，退出码:', exitCode);

    if (exitCode !== 0) {
      throw new Error('依赖安装失败');
    }
    log('依赖安装成功');

    return webcontainerInstance;
  } catch (error) {
    log('初始化失败', error);
    if (error instanceof Error && error.message.includes('SharedArrayBuffer')) {
      throw new Error('浏览器安全设置不支持 WebContainer，请确保网站运行在 HTTPS 或 localhost 环境下');
    }
    throw error;
  }
};

// 执行命令并等待完成
export const runCommand = async (container: WebContainer, command: string, args: string[] = [], progressCallback?: (message: string) => void) => {
  log(`开始执行命令: ${command} ${args.join(' ')}`);
  const process = await container.spawn(command, args);
  log('进程已启动');

  // 等待进程完成，同时处理输出
  const exitCode = await new Promise<number>((resolve) => {
    // 处理输出
    const reader = process.output.getReader();
    const readOutput = async () => {
      try {
        while (true) {
          const result = await reader.read();
          if (result.value) {
            log('命令输出:', result.value);
            if (progressCallback) {
              progressCallback(result.value);
            }
          }
        }
      } catch (error) {
        log('读取输出错误:', error);
      } finally {
        reader.releaseLock();
      }
    };

    // 启动输出读取
    readOutput();

    // 等待进程退出
    process.exit.then(resolve);
  });

  log('命令执行完成，退出码:', exitCode);

  if (exitCode !== 0) {
    throw new Error(`命令执行失败: ${command} ${args.join(' ')}`);
  }
}; 