export const DEFAULT_REPO_URL = '';
export const DEFAULT_INCLUDE = '';
export const DEFAULT_EXCLUDE = '**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/venv/**,**/__pycache__/**,**/*.pyc,**/package-lock.json,**/yarn.lock,**/pnpm-lock.yaml,**/.env,**/.DS_Store,**/coverage/**,**/.idea/**,**/.vscode/**,**/tmp/**,**/temp/**';
export const GITHUB_TOKEN_KEY = 'github_token';
export const REPO_URL_KEY = 'repo_url';
export const GIST_DESCRIPTION = 'Repository content collection by repo-to-md';

// 非文本文件扩展名
export const NON_TEXT_EXTENSIONS = {
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
} as const; 