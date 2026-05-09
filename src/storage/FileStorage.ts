/**
 * FileStorage 文件存储工具
 * 
 * 负责文件的导入导出、校验和加密
 * 完全独立，不依赖其他业务模块
 */

import type { ScheduleNode, Tag, FilterPreset, AppSettings } from '../core/types';
import { APP_VERSION } from '../core/types';

/**
 * 导出数据格式
 */
export interface ExportData {
  meta: {
    version: string;
    exportTime: string;
    checksum: string;
    appVersion: string;
    encrypted: boolean;
  };
  data: {
    nodes: ScheduleNode[];
    tags: Tag[];
    presets: FilterPreset[];
    settings: AppSettings;
  };
}

/**
 * 导出选项
 */
export interface ExportOptions {
  encrypt?: boolean;
  password?: string;
  includeSettings?: boolean;
  filename?: string;
}

/**
 * 导入选项
 */
export interface ImportOptions {
  password?: string;
  merge?: boolean;  // 合并模式 vs 覆盖模式
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  nodes: ScheduleNode[];
  tags: Tag[];
  presets: FilterPreset[];
  settings: AppSettings | null;
  errors: string[];
  warnings: string[];
}

/**
 * 文件存储类
 * 
 * 提供文件导入导出能力，支持：
 * - 数据完整性校验（SHA-256）
 * - 可选加密（AES-GCM）
 * - 数据版本兼容
 */
export class FileStorage {
  /** 默认文件扩展名 */
  static readonly FILE_EXTENSION = '.flowday.json';
  /** 加密文件扩展名 */
  static readonly ENCRYPTED_EXTENSION = '.flowday.enc';
  
  // ============================================================================
  // 公共方法
  // ============================================================================
  
  /**
   * 导出数据为可下载文件
   */
  async exportToFile(
    data: {
      nodes: ScheduleNode[];
      tags: Tag[];
      presets: FilterPreset[];
      settings: AppSettings;
    },
    options: ExportOptions = {}
  ): Promise<{ blob: Blob; filename: string }> {
    const {
      encrypt = false,
      password,
      includeSettings = true,
      filename,
    } = options;
    
    // 构建导出数据
    const exportData: ExportData = {
      meta: {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        checksum: '',
        appVersion: APP_VERSION,
        encrypted: encrypt,
      },
      data: {
        nodes: data.nodes,
        tags: data.tags,
        presets: data.presets,
        settings: includeSettings ? data.settings : undefined as any,
      },
    };
    
    // 计算校验和
    const dataString = JSON.stringify(exportData.data);
    exportData.meta.checksum = await this.calculateChecksum(dataString);
    
    // 加密（如果需要）
    let finalData: string;
    if (encrypt && password) {
      finalData = await this.encryptData(JSON.stringify(exportData), password);
    } else {
      finalData = JSON.stringify(exportData, null, 2);
    }
    
    // 创建 Blob
    const blob = new Blob([finalData], {
      type: encrypt ? 'application/octet-stream' : 'application/json',
    });
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const ext = encrypt ? FileStorage.ENCRYPTED_EXTENSION : FileStorage.FILE_EXTENSION;
    const defaultFilename = `FlowDay_${timestamp}${ext}`;
    
    return {
      blob,
      filename: filename || defaultFilename,
    };
  }
  
  /**
   * 从文件导入数据
   */
  async importFromFile(
    file: File,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const { password } = options;
    const result: ImportResult = {
      success: false,
      nodes: [],
      tags: [],
      presets: [],
      settings: null,
      errors: [],
      warnings: [],
    };
    
    try {
      // 读取文件内容
      const content = await this.readFileContent(file);
      
      // 解析数据
      let exportData: ExportData;
      let jsonString: string;
      
      // 检测是否加密
      if (file.name.endsWith('.flowday.enc')) {
        if (!password) {
          result.errors.push('文件已加密，请提供密码');
          return result;
        }
        jsonString = await this.decryptData(content, password);
      } else {
        jsonString = content;
      }
      
      exportData = JSON.parse(jsonString);
      
      // 校验数据完整性
      const dataString = JSON.stringify(exportData.data);
      const checksum = await this.calculateChecksum(dataString);
      
      if (checksum !== exportData.meta.checksum) {
        result.errors.push('数据校验失败，文件可能已损坏');
        return result;
      }
      
      // 验证数据结构
      const validation = this.validateData(exportData.data);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
      
      // 填充结果
      result.nodes = exportData.data.nodes;
      result.tags = exportData.data.tags;
      result.presets = exportData.data.presets;
      result.settings = exportData.data.settings;
      result.success = true;
      
    } catch (error) {
      result.errors.push(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
    
    return result;
  }
  
  /**
   * 触发文件下载
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  /**
   * 触发文件选择
   */
  selectFile(accept = '.flowday.json,.flowday.enc'): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('未选择文件'));
        }
      };
      input.click();
    });
  }
  
  // ============================================================================
  // 私有方法
  // ============================================================================
  
  /**
   * 读取文件内容
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }
  
  /**
   * 计算数据校验和（SHA-256）
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 加密数据（AES-GCM）
   */
  private async encryptData(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // 生成密钥
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // 加密
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    // 组合结果: salt(16) + iv(12) + encrypted
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  /**
   * 解密数据
   */
  private async decryptData(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // 提取 salt, iv, encrypted
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    // 生成密钥
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // 解密
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  /**
   * 验证数据结构
   */
  private validateData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data) {
      errors.push('数据为空');
      return { valid: false, errors };
    }
    
    // 验证 nodes
    if (!Array.isArray(data.nodes)) {
      errors.push('nodes 必须是数组');
    } else {
      for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];
        if (!node.id || typeof node.id !== 'string') {
          errors.push(`nodes[${i}].id 无效`);
        }
        if (node.parentId !== null && typeof node.parentId !== 'string') {
          errors.push(`nodes[${i}].parentId 无效`);
        }
        if (!node.title || typeof node.title !== 'string') {
          errors.push(`nodes[${i}].title 无效`);
        }
      }
    }
    
    // 验证 tags
    if (!Array.isArray(data.tags)) {
      errors.push('tags 必须是数组');
    }
    
    // 验证 presets
    if (!Array.isArray(data.presets)) {
      errors.push('presets 必须是数组');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
