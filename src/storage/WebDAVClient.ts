/**
 * WebDAV 客户端
 * 
 * 生产环境使用 POST /api/webdav RPC 方式
 * 开发环境直连 WebDAV 服务
 */

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  path?: string;
}

export interface WebDAVClientOptions {
  config: WebDAVConfig;
  filename?: string;
}

/**
 * WebDAV 存储实现
 * 
 * 通过 Vercel Edge Function 代理 WebDAV 请求
 */
export class WebDAVStorage {
  private config: WebDAVConfig;
  private filename: string;
  private isDev: boolean;
  
  constructor(options: WebDAVClientOptions) {
    this.config = options.config;
    this.filename = options.filename || 'flowday.json';
    // 开发环境检测：Vite 注入的 import.meta.env.DEV
    // @ts-ignore - Vite 特有的环境变量
    this.isDev = import.meta.env?.DEV ?? false;
  }
  
  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isDev) {
        // 开发环境直连
        const auth = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
        const response = await fetch(`${this.config.url}/`, {
          method: 'PROPFIND',
          headers: {
            'Authorization': auth,
            'Depth': '0',
            'Content-Type': 'application/xml',
          },
        });
        
        if (response.status === 207 || response.status === 200) {
          return { success: true };
        }
        return { success: false, error: `HTTP ${response.status}` };
      } else {
        // 生产环境使用 RPC
        const result = await this.callApi<{ success: boolean; error?: string }>('test');
        return result;
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '连接失败' };
    }
  }
  
  /**
   * 调用 API RPC
   */
  private async callApi<T>(
    action: 'test' | 'stat' | 'get' | 'put' | 'mkdir',
    data?: string
  ): Promise<T> {
    const response = await fetch('/api/webdav', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        username: this.config.username,
        password: this.config.password,
        path: this.config.path || '/',
        data,
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error: ${response.status} - ${text.substring(0, 100)}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  /**
   * 获取文件路径
   */
  private getFilePath(): string {
    let basePath = this.config.path || '/';
    
    // 如果路径以 / 结尾，说明是目录，追加文件名
    if (basePath.endsWith('/')) {
      return `${basePath}${this.filename}`;
    }
    
    // 如果路径包含扩展名（如 .json），说明已经是完整文件路径，直接使用
    const lastPart = basePath.split('/').pop() || '';
    if (lastPart.includes('.') && !lastPart.startsWith('.')) {
      return basePath;
    }
    
    // 否则认为是目录路径，追加文件名
    return `${basePath}/${this.filename}`;
  }
  
  /**
   * 加载数据
   */
  async load(): Promise<string | null> {
    try {
      if (this.isDev) {
        // 开发环境直连
        const auth = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
        const response = await fetch(`${this.config.url}${this.getFilePath()}`, {
          method: 'GET',
          headers: { 'Authorization': auth },
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.text();
      } else {
        // 生产环境使用 RPC
        const result = await this.callApi<{ success: boolean; data?: string; error?: string }>('get');
        if (result.success && result.data) {
          return result.data;
        }
        return null;
      }
    } catch (error) {
      console.error('[WebDAV] Load error:', error);
      throw error;
    }
  }
  
  /**
   * 保存数据
   */
  async save(data: string): Promise<void> {
    try {
      if (this.isDev) {
        // 开发环境直连
        const auth = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
        const response = await fetch(`${this.config.url}${this.getFilePath()}`, {
          method: 'PUT',
          headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
          },
          body: data,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } else {
        // 生产环境使用 RPC
        await this.callApi('put', data);
      }
    } catch (error) {
      console.error('[WebDAV] Save error:', error);
      throw error;
    }
  }
  
  /**
   * 确保目录存在
   */
  async ensureDirectory(): Promise<void> {
    // 提取目录路径：如果 path 包含文件名（有扩展名），则取其父目录
    let dirPath = this.config.path || '/';
    if (dirPath !== '/' && !dirPath.endsWith('/')) {
      // 如果路径包含点号（可能是文件扩展名），取父目录
      const lastSlash = dirPath.lastIndexOf('/');
      const lastPart = dirPath.substring(lastSlash + 1);
      if (lastPart.includes('.') && !lastPart.startsWith('.')) {
        // 看起来像文件名，提取目录部分
        dirPath = dirPath.substring(0, lastSlash) || '/';
      }
    }
    
    if (dirPath && dirPath !== '/') {
      if (this.isDev) {
        const auth = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`);
        const response = await fetch(`${this.config.url}${dirPath}`, {
          method: 'MKCOL',
          headers: { 'Authorization': auth },
        });
        
        // 405 means already exists
        if (!response.ok && response.status !== 405) {
          throw new Error(`创建目录失败: ${dirPath}`);
        }
      } else {
        // 传递提取后的目录路径
        const response = await fetch('/api/webdav', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mkdir',
            username: this.config.username,
            password: this.config.password,
            path: dirPath,
          }),
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(`创建目录失败: ${dirPath}`);
        }
      }
    }
  }
}
