import { type Locale } from '../locales';

// 日志函数
export const log = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
};

// MD5 hash 函数
export const md5 = (str: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return crypto.subtle.digest('SHA-256', data).then(hash => {
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 8); // 只取前8位，足够区分了
  });
};

// 获取系统默认语言
export const getDefaultLocale = (): Locale => {
  const systemLanguages = navigator.languages || [navigator.language];
  // 检查是否有中文（简体或繁体）
  const hasChinese = systemLanguages.some(lang => 
    lang.toLowerCase().startsWith('zh') || 
    lang.toLowerCase() === 'zh' || 
    lang.toLowerCase() === 'zh-cn' || 
    lang.toLowerCase() === 'zh-tw' || 
    lang.toLowerCase() === 'zh-hk'
  );
  return hasChinese ? 'zh' : 'en';
};

// 从URL中提取仓库信息
export const getRepoInfo = (url: string) => {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
  } catch (error) {
    console.error('Failed to parse repo URL:', error);
  }
  return null;
}; 