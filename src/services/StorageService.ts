/**
 * StorageService 存储服务
 * 
 * 统一管理应用数据存储，提供：
 * - 自动保存（防抖）
 * - 手动保存
 * - 文件导入导出
 * - 保存状态追踪
 * 
 * 设计原则：
 * - 单一职责：只负责存储管理
 * - 依赖注入：通过构造函数接收依赖
 * - 可测试：所有依赖可 mock
 */

import { Storage } from '../storage/Storage';
import { FileStorage, ExportOptions, ImportResult } from '../storage/FileStorage';
import type { ScheduleNode, Tag, FilterPreset, AppSettings, IEventBus } from '../core/types';
import { debounce } from '../utils/debounce';

/**
 * 保存状态
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * 状态变更回调
 */
export type StatusChangeHandler = (status: SaveStatus) => void;

/**
 * 存储服务配置
 */
export interface StorageServiceConfig {
  /** 自动保存延迟（毫秒） */
  autoSaveDelay?: number;
  /** 是否启用自动保存 */
  enableAutoSave?: boolean;
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  /** 初始化服务 */
  initialize(): Promise<void>;
  /** 手动保存 */
  save(): Promise<void>;
  /** 导出数据 */
  export(options?: ExportOptions): Promise<void>;
  /** 导入数据 */
  import(): Promise<ImportResult>;
  /** 获取保存状态 */
  getStatus(): SaveStatus;
  /** 订阅状态变更 */
  onStatusChange(handler: StatusChangeHandler): () => void;
  /** 标记数据已变更 */
  markDirty(): void;
  /** 销毁服务 */
  destroy(): void;
}

/**
 * 存储服务实现
 */
export class StorageService implements IStorageService {
  private storage: Storage;
  private fileStorage: FileStorage;
  private eventBus: IEventBus;
  private config: Required<StorageServiceConfig>;
  
  // 数据获取器（从 store 获取最新数据）
  private getNodes: () => ScheduleNode[];
  private getTags: () => Tag[];
  private getPresets: () => FilterPreset[];
  private getSettings: () => AppSettings;
  
  // 数据导入器（导入数据后调用）
  private onImport: (data: {
    nodes: ScheduleNode[];
    tags: Tag[];
    presets: FilterPreset[];
    settings: AppSettings | null;
    merge: boolean;
  }) => void;
  
  // 状态管理
  private status: SaveStatus = 'idle';
  private statusHandlers: Set<StatusChangeHandler> = new Set();
  private _dirty = false;
  
  // 自动保存（防抖函数）
  private autoSave: () => void;
  
  // 事件订阅取消函数
  private unsubscribers: (() => void)[] = [];
  
  constructor(options: {
    storage: Storage;
    eventBus: IEventBus;
    config?: StorageServiceConfig;
    getNodes: () => ScheduleNode[];
    getTags: () => Tag[];
    getPresets: () => FilterPreset[];
    getSettings: () => AppSettings;
    onImport: (data: {
      nodes: ScheduleNode[];
      tags: Tag[];
      presets: FilterPreset[];
      settings: AppSettings | null;
      merge: boolean;
    }) => void;
  }) {
    this.storage = options.storage;
    this.eventBus = options.eventBus;
    this.getNodes = options.getNodes;
    this.getTags = options.getTags;
    this.getPresets = options.getPresets;
    this.getSettings = options.getSettings;
    this.onImport = options.onImport;
    
    this.config = {
      autoSaveDelay: options.config?.autoSaveDelay ?? 2000,
      enableAutoSave: options.config?.enableAutoSave ?? true,
    };
    
    this.fileStorage = new FileStorage();
    
    // 创建防抖保存函数
    this.autoSave = debounce(this.save.bind(this), this.config.autoSaveDelay);
  }
  
  // ============================================================================
  // 公共方法
  // ============================================================================
  
  /**
   * 初始化服务
   * - 订阅数据变更事件
   * - 设置自动保存
   */
  async initialize(): Promise<void> {
    if (this.config.enableAutoSave) {
      // 订阅数据变更事件
      const events = [
        'node:created',
        'node:updated',
        'node:deleted',
        'node:moved',
        'tag:created',
        'tag:updated',
        'tag:deleted',
      ] as const;
      
      for (const event of events) {
        const unsub = this.eventBus.on(event, () => {
          this.markDirty();
        });
        this.unsubscribers.push(unsub);
      }
    }
  }
  
  /**
   * 手动保存数据
   */
  async save(): Promise<void> {
    if (this.status === 'saving') {
      return;
    }
    
    this.setStatus('saving');
    
    try {
      await Promise.all([
        this.storage.saveNodes(this.getNodes()),
        this.storage.saveTags(this.getTags()),
        this.storage.savePresets(this.getPresets()),
        this.storage.saveSettings(this.getSettings()),
      ]);
      
      this._dirty = false;
      this.setStatus('saved');
      
      // 3秒后恢复 idle 状态
      setTimeout(() => {
        if (this.status === 'saved') {
          this.setStatus('idle');
        }
      }, 3000);
      
    } catch (error) {
      console.error('保存失败:', error);
      this.setStatus('error');
      throw error;
    }
  }
  
  /**
   * 导出数据为文件
   */
  async export(options: ExportOptions = {}): Promise<void> {
    this.setStatus('saving');
    
    try {
      const { blob, filename } = await this.fileStorage.exportToFile(
        {
          nodes: this.getNodes(),
          tags: this.getTags(),
          presets: this.getPresets(),
          settings: this.getSettings(),
        },
        options
      );
      
      this.fileStorage.downloadFile(blob, filename);
      this.setStatus('saved');
      
      setTimeout(() => {
        if (this.status === 'saved') {
          this.setStatus('idle');
        }
      }, 3000);
      
    } catch (error) {
      console.error('导出失败:', error);
      this.setStatus('error');
      throw error;
    }
  }
  
  /**
   * 从文件导入数据
   */
  async import(): Promise<ImportResult> {
    try {
      const file = await this.fileStorage.selectFile();
      const result = await this.fileStorage.importFromFile(file);
      
      if (result.success) {
        this.onImport({
          nodes: result.nodes,
          tags: result.tags,
          presets: result.presets,
          settings: result.settings,
          merge: false,
        });
        
        // 导入后自动保存
        await this.save();
      }
      
      return result;
      
    } catch (error) {
      console.error('导入失败:', error);
      return {
        success: false,
        nodes: [],
        tags: [],
        presets: [],
        settings: null,
        errors: [error instanceof Error ? error.message : '导入失败'],
        warnings: [],
      };
    }
  }
  
  /**
   * 获取当前保存状态
   */
  getStatus(): SaveStatus {
    return this.status;
  }
  
  /**
   * 订阅状态变更
   */
  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }
  
  /**
   * 检查是否有未保存的更改
   */
  isDirty(): boolean {
    return this._dirty;
  }
  
  /**
   * 标记数据已变更（触发自动保存）
   */
  markDirty(): void {
    this._dirty = true;
    if (this.config.enableAutoSave) {
      this.autoSave();
    }
  }
  
  /**
   * 销毁服务
   */
  destroy(): void {
    // 取消所有事件订阅
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    // 清空状态处理器
    this.statusHandlers.clear();
  }
  
  // ============================================================================
  // 私有方法
  // ============================================================================
  
  /**
   * 设置状态并通知订阅者
   */
  private setStatus(status: SaveStatus): void {
    this.status = status;
    this.statusHandlers.forEach(handler => handler(status));
  }
}
