/**
 * WebDAV 客户端
 * 
 * 统一使用 POST /api/webdav RPC 方式
 * 开发环境通过 Vite 代理转发到生产环境
 * 生产环境由 Vercel Edge Function 处理
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
 * 通过 API 代理处理 WebDAV 请求
 */
export class WebDAVStorage {
  private config: WebDAVConfig;
  
  constructor(options: WebDAVClientOptions) {
    this.config = options.config;
  }
  
  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.callApi<{ success: boolean; error?: string }>('test');
      return result;
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
   * 加载云端数据
   */
  async load(): Promise<string | null> {
    try {
      const result = await this.callApi<{ success: boolean; data?: string; error?: string }>('get');
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('[WebDAV] Load error:', error);
      throw error;
    }
  }
  
  /**
   * 保存数据到云端
   */
  async save(data: string): Promise<void> {
    try {
      const result = await this.callApi<{ success: boolean; error?: string }>('put', data);
      if (!result.success) {
        throw new Error(result.error || '保存失败');
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
      const lastSlash = dirPath.lastIndexOf('/');
      const lastPart = dirPath.substring(lastSlash + 1);
      if (lastPart.includes('.') && !lastPart.startsWith('.')) {
        dirPath = dirPath.substring(0, lastSlash) || '/';
      }
    }
    
    if (dirPath && dirPath !== '/') {
      const result = await this.callApi<{ success: boolean }>('mkdir');
      if (!result.success) {
        throw new Error(`创建目录失败: ${dirPath}`);
      }
    }
  }
}