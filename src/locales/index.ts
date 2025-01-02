export type Locale = 'zh' | 'en';

export const messages = {
  zh: {
    title: 'GitHub 仓库转 Markdown',
    repoUrl: {
      label: 'GitHub 仓库 URL',
      tooltip: '输入要转换的 GitHub 仓库地址',
      placeholder: '例如：https://github.com/owner/repo'
    },
    includePattern: {
      label: '包含文件模式',
      optional: '(可选)',
      tooltip: '使用 glob 语法指定要包含的文件，多个模式用逗号分隔',
      placeholder: '例如：**/*.{js,jsx,ts,tsx,md,json}'
    },
    excludePattern: {
      label: '排除文件模式',
      optional: '(可选)',
      tooltip: '使用 glob 语法指定要排除的文件，多个模式用逗号分隔',
      placeholder: '例如：**/node_modules/**,**/dist/**'
    },
    buttons: {
      convert: '转换',
      download: '下载 Markdown'
    },
    status: {
      init: '初始化...',
      cleaning: '清理旧目录...',
      cloning: '克隆仓库...',
      scanning: '扫描文件...',
      processing: '处理文件',
      generating: '生成 Markdown...',
      complete: '转换完成！',
      foundFiles: '找到 {count} 个匹配文件',
      processedFiles: '已处理的文件'
    },
    errors: {
      invalidUrl: '无效的 GitHub 仓库 URL',
      scanFailed: '文件扫描失败',
      convertFailed: '转换失败',
      browserNotSupported: '浏览器安全设置不支持 WebContainer，请确保网站运行在 HTTPS 或 localhost 环境下'
    }
  },
  en: {
    title: 'GitHub Repository to Markdown',
    repoUrl: {
      label: 'GitHub Repository URL',
      tooltip: 'Enter the GitHub repository URL to convert',
      placeholder: 'e.g., https://github.com/owner/repo'
    },
    includePattern: {
      label: 'Include Pattern',
      optional: '(optional)',
      tooltip: 'Use glob syntax to specify files to include, separate multiple patterns with commas',
      placeholder: 'e.g., **/*.{js,jsx,ts,tsx,md,json}'
    },
    excludePattern: {
      label: 'Exclude Pattern',
      optional: '(optional)',
      tooltip: 'Use glob syntax to specify files to exclude, separate multiple patterns with commas',
      placeholder: 'e.g., **/node_modules/**,**/dist/**'
    },
    buttons: {
      convert: 'Convert',
      download: 'Download Markdown'
    },
    status: {
      init: 'Initializing...',
      cleaning: 'Cleaning old directory...',
      cloning: 'Cloning repository...',
      scanning: 'Scanning files...',
      processing: 'Processing file',
      generating: 'Generating Markdown...',
      complete: 'Conversion complete!',
      foundFiles: 'Found {count} matching files',
      processedFiles: 'Processed Files'
    },
    errors: {
      invalidUrl: 'Invalid GitHub repository URL',
      scanFailed: 'File scanning failed',
      convertFailed: 'Conversion failed',
      browserNotSupported: 'Browser security settings do not support WebContainer. Please ensure the site runs on HTTPS or localhost'
    }
  }
} as const; 