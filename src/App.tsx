import { useState, ChangeEvent, useEffect } from 'react';
import { Button, Input, message, Layout, Typography, Form, List, Switch, Grid } from 'antd';
import Editor from "@monaco-editor/react";
import { WebContainer } from '@webcontainer/api';
import { Octokit } from 'octokit';
import { messages, type Locale } from './locales';
import { initWebContainer, runCommand } from './services/webcontainer';
import { findExistingGist, getFileName, createGist, updateGist } from './services/gist';
import { log, getDefaultLocale, getRepoInfo } from './utils';
import { DEFAULT_REPO_URL, DEFAULT_INCLUDE, DEFAULT_EXCLUDE, GITHUB_TOKEN_KEY, REPO_URL_KEY } from './constants';
import './styles/App.css';

// 扩展 window 类型
declare global {
  interface Window {
    webcontainerInstance: WebContainer | null;
  }
}

const { Header, Content } = Layout;
const { Title } = Typography;
const { Item: FormItem } = Form;
const { TextArea, Password } = Input;
const { useBreakpoint } = Grid;

function App() {
  const [repoUrl, setRepoUrl] = useState(() => localStorage.getItem(REPO_URL_KEY) || DEFAULT_REPO_URL);
  const [includePattern, setIncludePattern] = useState(DEFAULT_INCLUDE);
  const [excludePattern, setExcludePattern] = useState(DEFAULT_EXCLUDE);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [locale, setLocale] = useState<Locale>(getDefaultLocale());
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem(GITHUB_TOKEN_KEY) || '');
  const [gistUrl, setGistUrl] = useState('');
  const [gistId, setGistId] = useState('');
  const screens = useBreakpoint();
  const t = messages[locale];

  // 保存 token 到 localStorage
  useEffect(() => {
    if (githubToken) {
      localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
    }
  }, [githubToken]);

  // 保存 repoUrl 到 localStorage
  useEffect(() => {
    if (repoUrl) {
      localStorage.setItem(REPO_URL_KEY, repoUrl);
    } else {
      localStorage.removeItem(REPO_URL_KEY);
    }
  }, [repoUrl]);

  // 监听系统语言变化
  useEffect(() => {
    const handleLanguageChange = () => {
      setLocale(getDefaultLocale());
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
  };

  const handleSaveToGist = async () => {
    if (!githubToken) {
      message.error(t.errors.tokenRequired);
      return;
    }

    if (!markdown) {
      return;
    }

    const repoInfo = getRepoInfo(repoUrl);
    if (!repoInfo) {
      message.error(t.errors.invalidUrl);
      return;
    }

    try {
      setLoading(true);
      setStatus(t.status.savingToGist);

      const octokit = new Octokit({ auth: githubToken });
      
      const fileName = await getFileName(repoInfo, includePattern, excludePattern, DEFAULT_EXCLUDE);

      // 如果没有保存的gist id，尝试查找已存在的gist
      if (!gistId) {
        setStatus(t.status.searchingGist);
        const existingGistId = await findExistingGist(octokit);
        if (existingGistId) {
          setGistId(existingGistId);
          setStatus(t.status.foundExistingGist);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 显示状态消息1秒
        }
      }

      let response;
      if (gistId) {
        // 更新现有的gist
        response = await updateGist(octokit, gistId, fileName, markdown);
      } else {
        // 创建新的gist
        response = await createGist(octokit, fileName, markdown);
        if (response.id) {
          setGistId(response.id);
        }
      }

      // 获取文件的URL
      if (response?.files && fileName in response.files && response.files[fileName]?.raw_url) {
        setGistUrl(response.files[fileName].raw_url);
        setStatus(t.status.gistSaved);
        message.success(t.status.gistSaved);
      } else {
        throw new Error('Failed to get file URL');
      }
    } catch (error) {
      console.error('Failed to save gist:', error);
      message.error(t.errors.gistSaveFailed);
      // 如果更新失败，清除gist id
      if (error instanceof Error && error.message.includes('Not Found')) {
        setGistId('');
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const cleanupEnvironment = async () => {
    log('开始清理环境');
    // 重置状态
    setMarkdown('');
    setProcessedFiles([]);
    setGistUrl('');
    setStatus('');

    // 清理 WebContainer
    if (window.webcontainerInstance) {
      log('销毁现有的 WebContainer 实例');
      try {
        await window.webcontainerInstance.teardown();
        window.webcontainerInstance = null;
      } catch (error) {
        log('清理 WebContainer 实例出错:', error);
      }
    }
  };

  const handleConvert = async () => {
    try {
      log('开始转换流程');
      setLoading(true);
      setStatus(t.status.init);

      // 首先清理环境
      await cleanupEnvironment();

      // 解析 include 和 exclude 模式
      const includes = includePattern.split(',').map(p => p.trim()).filter(Boolean);
      const excludes = excludePattern.split(',').map(p => p.trim()).filter(Boolean);

      // 验证 URL 格式
      const repoRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+/;
      if (!repoRegex.test(repoUrl)) {
        throw new Error(t.errors.invalidUrl);
      }
      log('URL 验证通过:', repoUrl);

      // 获取或初始化 WebContainer
      const container = await initWebContainer();
      log('WebContainer 准备就绪');

      // 克隆仓库
      setStatus(t.status.cloning);
      log('开始克隆仓库');
      await runCommand(container, 'node', ['clone.js', repoUrl, 'repo'], (message) => {
        try {
          const progress = JSON.parse(message);
          setStatus(`${t.status.cloning} ${progress.phase} ${progress.loaded || 0}/${progress.total || 0}`);
        } catch {
          setStatus(`${t.status.cloning} ${message}`);
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
            
            if (code !== 9 && code !== 10 && code !== 13 && code < 32) {
              nonPrintableCount++;
            }
          }

          return nonPrintableCount < sample.length * 0.05;
        };

        // 检查文件是否为非文本文件
        const isNonTextFile = (filename: string): boolean => {
          const nonTextExtensions = {
            // 图片文件
            images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif', '.raw', '.psd'],
            
            // 音视频文件
            media: [
              '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',  // 音频
              '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'  // 视频
            ],
            
            // 压缩文件
            archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.iso'],
            
            // 二进制和可执行文件
            executables: ['.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite', '.class'],
            
            // 字体文件
            fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
            
            // 文档和办公文件
            documents: [
              '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
              '.pages', '.numbers', '.key', '.odt', '.ods', '.odp'
            ],
            
            // 设计文件
            design: ['.ai', '.eps', '.sketch', '.fig', '.xd'],

            // 其他二进制文件
            others: ['.pyc', '.pyo', '.o', '.obj', '.lib', '.a', '.deb', '.rpm']
          };

          const lowerFilename = filename.toLowerCase();
          return Object.values(nonTextExtensions)
            .flat()
            .some(ext => lowerFilename.endsWith(ext));
        };

        try {
          // 使用 fast-glob 在 WebContainer 内扫描文件
          setStatus(t.status.scanning);
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
                reject(new Error(t.errors.scanFailed));
              }
            });
          });

          const matchedFiles = JSON.parse(output) as string[];
          log('找到匹配的文件列表:', matchedFiles);
          setStatus(t.status.foundFiles.replace('{count}', String(matchedFiles.length)));

          // 处理每个匹配的文件
          for (const relativePath of matchedFiles) {
            const fullPath = `repo/${relativePath}`;
            setStatus(`${t.status.processing}: ${relativePath}`);
            log(`处理: ${relativePath}`);

            try {
              // 首先检查是否为非文本文件
              if (isNonTextFile(relativePath)) {
                log(`跳过非文本文件: ${relativePath}`);
                continue;
              }

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

      setStatus(t.status.generating);
      log('开始生成 Markdown');
      const markdownContent = await processFiles();
      log('Markdown 生成完成');
      setMarkdown(markdownContent);

      setStatus('');
      log('转换流程完成');
      message.success(t.status.complete);
    } catch (error) {
      log('转换过程出错:', error);
      setStatus('');
      message.error(error instanceof Error ? error.message : t.errors.convertFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="app-layout">
      <a href="https://github.com/eightHundreds/repo-to-md" className="github-corner" aria-label="View source on GitHub">
        <svg width="80" height="80" viewBox="0 0 250 250" style={{ fill: '#151513', color: '#fff', position: 'absolute', top: 0, border: 0, right: 0 }} aria-hidden="true">
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
          <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{ transformOrigin: '130px 106px' }} className="octo-arm"></path>
          <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path>
        </svg>
      </a>
      <Header className="app-header">
        <Title level={3} className="app-header-title">{t.title}</Title>
        <div className="language-switch">
          <Typography.Text>中文</Typography.Text>
          <Switch
            checked={locale === 'en'}
            onChange={(checked) => setLocale(checked ? 'en' : 'zh')}
            checkedChildren="EN"
            unCheckedChildren="中"
            size={screens.xs ? 'small' : 'default'}
          />
          <Typography.Text>English</Typography.Text>
        </div>
      </Header>
      <Content className='app-content'>
        <div className="content-wrapper">
          <div className="form-section">
            <Form layout="vertical">
              <FormItem
                label={t.repoUrl.label}
                required
                tooltip={t.repoUrl.tooltip}
              >
                <Input
                  placeholder={t.repoUrl.placeholder}
                  value={repoUrl}
                  onChange={handleInputChange}
                  size={screens.xs ? 'middle' : 'large'}
                />
              </FormItem>
              <FormItem
                label={t.githubToken.label}
                tooltip={t.githubToken.tooltip}
              >
                <Password
                  placeholder={t.githubToken.placeholder}
                  value={githubToken}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setGithubToken(e.target.value)}
                  size={screens.xs ? 'middle' : 'large'}
                />
              </FormItem>
              <FormItem
                label={<>{t.includePattern.label} <span style={{ color: '#999', fontWeight: 'normal' }}>{t.includePattern.optional}</span></>}
                tooltip={t.includePattern.tooltip}
              >
                <TextArea
                  placeholder={t.includePattern.placeholder}
                  value={includePattern}
                  onChange={(e) => setIncludePattern(e.target.value)}
                  size={screens.xs ? 'middle' : 'large'}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  className="text-area"
                />
              </FormItem>
              <FormItem
                label={<>{t.excludePattern.label} <span style={{ color: '#999', fontWeight: 'normal' }}>{t.excludePattern.optional}</span></>}
                tooltip={t.excludePattern.tooltip}
              >
                <TextArea
                  placeholder={t.excludePattern.placeholder}
                  value={excludePattern}
                  onChange={(e) => setExcludePattern(e.target.value)}
                  size={screens.xs ? 'middle' : 'large'}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  className="text-area"
                />
              </FormItem>
              <FormItem>
                <Button
                  type="primary"
                  onClick={handleConvert}
                  loading={loading}
                  className="full-width-button"
                  size={screens.xs ? 'middle' : 'large'}
                >
                  {t.buttons.convert}
                </Button>
                {markdown && (
                  <>
                    <Button
                      className="download-button"
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
                      size={screens.xs ? 'middle' : 'large'}
                    >
                      {t.buttons.download}
                    </Button>
                    <Button
                      className="gist-button"
                      onClick={handleSaveToGist}
                      loading={loading}
                      size={screens.xs ? 'middle' : 'large'}
                    >
                      {t.buttons.saveToGist}
                    </Button>
                  </>
                )}
              </FormItem>
              {status && <div className="status-text">{status}</div>}
              {gistUrl && (
                <div className="gist-url">
                  <a href={gistUrl} target="_blank" rel="noopener noreferrer">
                    {gistUrl}
                  </a>
                </div>
              )}
              
              {processedFiles.length > 0 && (
                <div className="processed-files">
                  <Typography.Text strong>
                    {t.status.processedFiles} ({processedFiles.length})
                  </Typography.Text>
                  <List
                    size={screens.xs ? 'small' : 'default'}
                    className="files-list"
                    dataSource={processedFiles}
                    renderItem={item => (
                      <List.Item className="file-list-item">
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
          
          <div className="editor-section">
            <div className="editor-wrapper">
              <Editor
                height="100%"
                defaultLanguage="markdown"
                value={markdown}
                onChange={(value) => setMarkdown(value || '')}
                options={{
                  readOnly: false,
                  minimap: { enabled: !screens.xs },
                  wordWrap: 'on',
                  fontSize: screens.xs ? 12 : 14,
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
