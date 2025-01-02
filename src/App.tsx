import { useState, ChangeEvent } from 'react';
import { Button, Input, message, Layout, Typography, Form, List } from 'antd';
import Editor from "@monaco-editor/react";
import { WebContainer } from '@webcontainer/api';

// 扩展 window 类型
declare global {
  interface Window {
    webcontainerInstance: WebContainer | null;
  }
}

const { Header, Content } = Layout;
const { Title } = Typography;
const { Item: FormItem } = Form;
const { TextArea } = Input;

const DEFAULT_REPO_URL = '';
const DEFAULT_INCLUDE = '';
const DEFAULT_EXCLUDE = '**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/venv/**,**/__pycache__/**,**/*.pyc,**/package-lock.json,**/yarn.lock,**/pnpm-lock.yaml,**/.env,**/.DS_Store,**/coverage/**,**/.idea/**,**/.vscode/**,**/tmp/**,**/temp/**';

// 保存 WebContainer 实例
let webcontainerInstance: WebContainer | null = null;

// 日志函数
const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

// 初始化 WebContainer
const initWebContainer = async () => {
  log('开始初始化 WebContainer');
  try {
    // 如果已经存在实例，先销毁它
    if (webcontainerInstance) {
      log('销毁现有的 WebContainer 实例');
      webcontainerInstance.teardown();
      webcontainerInstance = null;
      window.webcontainerInstance = null;
    }

    log('尝试启动 WebContainer');
    webcontainerInstance = await WebContainer.boot();
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
          contents: `
import fg from 'fast-glob';

const includes = process.argv[2] ? process.argv[2].split(',') : ['**/*'];
const excludes = process.argv[3] ? process.argv[3].split(',') : [];

async function findFiles() {
  try {
    const files = await fg(includes, {
      cwd: 'repo',
      ignore: [...excludes, '**/node_modules/**', '**/.*/**'],
      dot: false,
      absolute: false,
      onlyFiles: true,
      markDirectories: false
    });
    
    console.log(JSON.stringify(files));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findFiles();`
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

  } catch (error) {
    log('初始化失败', error);
    if (error instanceof Error && error.message.includes('SharedArrayBuffer')) {
      throw new Error('浏览器安全设置不支持 WebContainer，请确保网站运行在 HTTPS 或 localhost 环境下');
    }
    throw error;
  }
  return webcontainerInstance;
};

// 执行命令并等待完成
const runCommand = async (container: WebContainer, command: string, args: string[] = [], progressCallback?: (message: string) => void) => {
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

function App() {
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO_URL);
  const [includePattern, setIncludePattern] = useState(DEFAULT_INCLUDE);
  const [excludePattern, setExcludePattern] = useState(DEFAULT_EXCLUDE);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);

  const handleConvert = async () => {
    try {
      log('开始转换流程');
      setLoading(true);
      setStatus('初始化...');

      // 解析 include 和 exclude 模式
      const includes = includePattern.split(',').map(p => p.trim()).filter(Boolean);
      const excludes = excludePattern.split(',').map(p => p.trim()).filter(Boolean);

      // 验证 URL 格式
      const repoRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+/;
      if (!repoRegex.test(repoUrl)) {
        throw new Error('无效的 GitHub 仓库 URL');
      }
      log('URL 验证通过:', repoUrl);

      // 获取或初始化 WebContainer
      const container = await initWebContainer();
      log('WebContainer 准备就绪');

      // 清理旧的仓库目录（如果存在）
      try {
        setStatus('清理旧目录...');
        log('开始清理旧目录');
        await container.fs.rm('repo', { recursive: true });
        log('旧目录清理完成');
      } catch (error) {
        log('清理旧目录失败（可能不存在）:', error);
      }

      // 克隆仓库
      setStatus('克隆仓库...');
      log('开始克隆仓库');
      await runCommand(container, 'node', ['clone.js', repoUrl, 'repo'], (message) => {
        try {
          const progress = JSON.parse(message);
          setStatus(`克隆仓库中: ${progress.phase} ${progress.loaded || 0}/${progress.total || 0}`);
        } catch {
          setStatus(`克隆仓库中: ${message}`);
        }
        log('克隆进度:', message);
      });
      log('仓库克隆完成');

      // 读取文件系统
      const processFiles = async (): Promise<string> => {
        log('开始处理文件');
        let content = '';
        const fileList: string[] = [];

        // 检查文件是否为文本文件
        const isTextFile = (content: string): boolean => {
          // 检查前 1000 个字符
          const sample = content.slice(0, 1000);
          
          // 统计不可打印字符的数量
          let nonPrintableCount = 0;
          
          for (let i = 0; i < sample.length; i++) {
            const code = sample.charCodeAt(i);
            
            // 允许的字符范围：
            // 9: tab, 10: 换行, 13: 回车
            // 32-126: ASCII 可打印字符
            // 128-65535: 扩展 ASCII 和 Unicode 字符（包括中文）
            // 大于 65535 的 Unicode 字符（用两个 code unit 表示的字符）
            if (code !== 9 && code !== 10 && code !== 13 && code < 32) {
              nonPrintableCount++;
            }
          }

          // 如果不可打印字符数量超过样本的 5%，则认为是二进制文件
          return nonPrintableCount < sample.length * 0.05;
        };

        try {
          // 使用 fast-glob 在 WebContainer 内扫描文件
          setStatus('扫描文件...');
          log('开始扫描匹配文件');
          
          const process = await container.spawn('node', [
            'glob.js',
            includes.join(','),
            excludes.join(',')
          ]);

          // 获取匹配的文件列表
          const output = await new Promise<string>((resolve, reject) => {
            let result = '';
            
            process.output.pipeTo(new WritableStream({
              write(data) {
                result += data;
              }
            }));

            process.exit.then((code) => {
              if (code === 0) {
                resolve(result);
              } else {
                reject(new Error('文件扫描失败'));
              }
            });
          });

          const matchedFiles = JSON.parse(output) as string[];
          log('找到匹配的文件列表:', matchedFiles);
          setStatus(`找到 ${matchedFiles.length} 个匹配文件`);

          // 处理每个匹配的文件
          for (const relativePath of matchedFiles) {
            const fullPath = `repo/${relativePath}`;
            setStatus(`处理文件: ${relativePath}`);
            log(`处理: ${relativePath}`);

            try {
              const fileContent = await container.fs.readFile(fullPath, 'utf-8');
              if (isTextFile(fileContent)) {
                content += `------ ${relativePath} -----\n\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
                fileList.push(relativePath);
              } else {
                log(`跳过文件 ${relativePath}，检测为二进制文件`);
              }
            } catch (error) {
              log(`跳过文件 ${relativePath}，无法以文本格式读取:`, error);
            }
          }
        } catch (error) {
          log('文件处理出错:', error);
          throw error;
        }

        setProcessedFiles(fileList);
        log('文件处理完成');
        return content;
      };

      setStatus('生成 Markdown...');
      log('开始生成 Markdown');
      const markdownContent = await processFiles();
      log('Markdown 生成完成');
      setMarkdown(markdownContent);

      setStatus('');
      log('转换流程完成');
      message.success('转换完成！');
    } catch (error) {
      log('转换过程出错:', error);
      setStatus('');
      message.error(error instanceof Error ? error.message : '转换失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100vw' }}>
      <Header style={{ background: '#fff', padding: '0 20px', textAlign: 'center' }}>
        <Title level={3}>GitHub 仓库转 Markdown</Title>
      </Header>
      <Content>
        <div style={{ 
          width: '90%', 
          maxWidth: '1400px', 
          margin: '20px auto',
          display: 'flex',
          gap: '20px'
        }}>
          <div style={{ flex: '1 1 300px', maxWidth: '300px' }}>
            <Form layout="vertical">
              <FormItem
                label="GitHub 仓库 URL"
                required
                tooltip="输入要转换的 GitHub 仓库地址"
              >
                <Input
                  placeholder="例如：https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={handleInputChange}
                  size="large"
                />
              </FormItem>
              <FormItem
                label={<>包含文件模式 <span style={{ color: '#999', fontWeight: 'normal' }}>(可选)</span></>}
                tooltip="使用 glob 语法指定要包含的文件，多个模式用逗号分隔"
              >
                <TextArea
                  placeholder="例如：**/*.{js,jsx,ts,tsx,md,json}"
                  value={includePattern}
                  onChange={(e) => setIncludePattern(e.target.value)}
                  size="large"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ resize: 'none' }}
                />
              </FormItem>
              <FormItem
                label={<>排除文件模式 <span style={{ color: '#999', fontWeight: 'normal' }}>(可选)</span></>}
                tooltip="使用 glob 语法指定要排除的文件，多个模式用逗号分隔"
              >
                <TextArea
                  placeholder="例如：**/node_modules/**,**/dist/**"
                  value={excludePattern}
                  onChange={(e) => setExcludePattern(e.target.value)}
                  size="large"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ resize: 'none' }}
                />
              </FormItem>
              <FormItem>
                <Button
                  type="primary"
                  onClick={handleConvert}
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  转换
                </Button>
                {markdown && (
                  <Button
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => {
                      const blob = new Blob([markdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'repository.md';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    下载 Markdown
                  </Button>
                )}
              </FormItem>
              {status && <div style={{ color: '#1890ff' }}>{status}</div>}
              
              {processedFiles.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <Typography.Text strong>已处理的文件 ({processedFiles.length})</Typography.Text>
                  <List
                    size="small"
                    style={{ 
                      marginTop: '8px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid #f0f0f0',
                      borderRadius: '4px'
                    }}
                    dataSource={processedFiles}
                    renderItem={item => (
                      <List.Item style={{ padding: '4px 8px' }}>
                        <Typography.Text ellipsis style={{ width: '100%' }}>
                          {item}
                        </Typography.Text>
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </Form>
          </div>
          
          <div style={{ flex: '1 1 0%' }}>
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '2px',
              height: 'calc(100vh - 120px)'
            }}>
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={markdown}
                onChange={(value) => setMarkdown(value || '')}
                options={{
                  readOnly: false,
                  minimap: { enabled: true },
                  wordWrap: 'on',
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
