export type Locale = 'zh' | 'en';

export const messages = {
  zh: {
    title: 'GitHub 仓库转 Markdown',
    repoUrl: {
      label: 'GitHub 仓库 URL',
      tooltip: '输入要转换的 GitHub 仓库地址',
      placeholder: '例如：https://github.com/owner/repo'
    },
    githubToken: {
      label: 'GitHub Token',
      tooltip: '用于访问私有仓库和创建Gist（可选）。所有内容将保存到同一个Gist中。',
      placeholder: '输入你的GitHub个人访问令牌'
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
      download: '下载 Markdown',
      saveToGist: '保存到 Gist'
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
      processedFiles: '已处理的文件',
      savingToGist: '保存到 Gist...',
      gistSaved: 'Gist 保存成功！',
      searchingGist: '搜索已有 Gist...',
      foundExistingGist: '找到已有 Gist，将添加到其中'
    },
    errors: {
      invalidUrl: '无效的 GitHub 仓库 URL',
      scanFailed: '文件扫描失败',
      convertFailed: '转换失败',
      browserNotSupported: '浏览器安全设置不支持 WebContainer，请确保网站运行在 HTTPS 或 localhost 环境下',
      gistSaveFailed: '保存到 Gist 失败',
      tokenRequired: '需要 GitHub Token 来保存 Gist',
      gistSearchFailed: '搜索 Gist 失败'
    }
  },
  en: {
    title: 'GitHub Repository to Markdown',
    repoUrl: {
      label: 'GitHub Repository URL',
      tooltip: 'Enter the GitHub repository URL to convert',
      placeholder: 'e.g., https://github.com/owner/repo'
    },
    githubToken: {
      label: 'GitHub Token',
      tooltip: 'For accessing private repos and creating Gists (optional). All content will be saved to the same Gist.',
      placeholder: 'Enter your GitHub personal access token'
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
      download: 'Download Markdown',
      saveToGist: 'Save to Gist'
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
      processedFiles: 'Processed Files',
      savingToGist: 'Saving to Gist...',
      gistSaved: 'Gist saved successfully!',
      searchingGist: 'Searching for existing Gist...',
      foundExistingGist: 'Found existing Gist, will add to it'
    },
    errors: {
      invalidUrl: 'Invalid GitHub repository URL',
      scanFailed: 'File scanning failed',
      convertFailed: 'Conversion failed',
      browserNotSupported: 'Browser security settings do not support WebContainer. Please ensure the site runs on HTTPS or localhost',
      gistSaveFailed: 'Failed to save to Gist',
      tokenRequired: 'GitHub Token is required to save Gist',
      gistSearchFailed: 'Failed to search for Gist'
    }
  }
} as const; 