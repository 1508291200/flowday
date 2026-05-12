/**
 * Storage 存储层
 * 
 * 使用 Dexie.js 管理 IndexedDB
 * 
 * 核心职责：
 * 1. 提供数据持久化能力
 * 2. 支持大量数据存储（使用 IndexedDB）
 * 3. 提供版本管理和数据迁移
 * 4. 完全独立，不依赖任何上层模块
 * 
 * 设计要点：
 * - 扁平化存储节点数据
 * - 建立索引加速查询
 * - 支持增量更新
 */

import Dexie, { Table } from 'dexie';
import type {
  ScheduleNode,
  Tag,
  FilterPreset,
  AppSettings,
  IStorageLayer,
  ImportanceLevel,
} from '../core/types';
import { DEFAULT_APP_SETTINGS, APP_VERSION } from '../core/types';

/**
 * 存储的节点数据结构
 * 
 * 与 ScheduleNode 一致，但使用扁平结构
 */
interface StoredNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  importance: number;
  dueDate: string | null;
  tags: string[];
  collapsed: boolean;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 存储的标签数据结构
 */
interface StoredTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

/**
 * 存储的筛选预设结构
 */
interface StoredPreset {
  id: string;
  name: string;
  config: string; // JSON 字符串
  createdAt: string;
}

/**
 * 存储的设置数据结构
 */
interface StoredSetting {
  key: string;
  value: string; // JSON 字符串
}

/**
 * FlowDay 数据库
 * 
 * Schema 定义：
 * - nodes: 节点表
 * - tags: 标签表
 * - presets: 筛选预设表
 * - settings: 应用设置表
 */
class FlowDayDatabase extends Dexie {
  nodes!: Table<StoredNode>;
  tags!: Table<StoredTag>;
  presets!: Table<StoredPreset>;
  settings!: Table<StoredSetting>;

  constructor() {
    super('FlowDayDB');
    
    // 版本 1: 初始 schema
    this.version(1).stores({
      // 节点表：主键 id，索引 parentId, importance, dueDate, completed
      nodes: 'id, parentId, importance, dueDate, completed, *tags',
      // 标签表：主键 id，索引 name
      tags: 'id, name',
      // 预设表：主键 id，索引 name
      presets: 'id, name',
      // 设置表：主键 key
      settings: 'key',
    });
  }
}

/**
 * Storage 实现类
 * 
 * 使用示例：
 * ```typescript
 * const storage = new Storage();
 * 
 * // 保存节点
 * await storage.saveNodes(nodes);
 * 
 * // 加载节点
 * const nodes = await storage.loadNodes();
 * ```
 */
export class Storage implements IStorageLayer {
  /** 数据库实例 */
  private db: FlowDayDatabase;
  /** 是否已确保数据库可用 */
  private dbReady: boolean = false;
  
  /**
   * 创建 Storage 实例
   */
  constructor() {
    this.db = new FlowDayDatabase();
  }
  
  /**
   * 确保数据库可用
   * 如果 IndexedDB 版本冲突（旧版 PWA 可能升级了版本号），重建数据库
   */
  private async ensureDatabase(): Promise<void> {
    if (this.dbReady) return;
    
    try {
      // 尝试打开数据库
      await this.db.open();
      this.dbReady = true;
    } catch (error) {
      if (error instanceof Error && error.name === 'VersionError') {
        console.warn('[Storage] IndexedDB 版本冲突，重建数据库...');
        await Dexie.delete('FlowDayDB');
        this.db = new FlowDayDatabase();
        await this.db.open();
        this.dbReady = true;
      } else {
        throw error;
      }
    }
  }
  
  // ============================================================================
  // 节点持久化
  // ============================================================================
  
  /**
   * 保存所有节点
   * 
   * 先清空现有数据，再批量插入
   * 
   * @param nodes - 节点数组
   */
  async saveNodes(nodes: ScheduleNode[]): Promise<void> {
    await this.ensureDatabase();
    await this.db.transaction('rw', this.db.nodes, async () => {
      // 清空现有数据
      await this.db.nodes.clear();
      
      // 批量插入（Dexie 会自动处理大量数据）
      const storedNodes: StoredNode[] = nodes.map(node => ({
        ...node,
        tags: [...node.tags],
      }));
      
      await this.db.nodes.bulkAdd(storedNodes);
    });
  }
  
  /**
   * 加载所有节点
   * 
   * @returns 节点数组
   */
  async loadNodes(): Promise<ScheduleNode[]> {
    await this.ensureDatabase();
    const storedNodes = await this.db.nodes.toArray();
    
    return storedNodes.map(node => ({
      ...node,
      importance: node.importance as ImportanceLevel,
      tags: [...node.tags],
    }));
  }
  
  /**
   * 保存单个节点
   * 
   * @param node - 节点数据
   */
  async saveNode(node: ScheduleNode): Promise<void> {
    await this.db.nodes.put({
      ...node,
      tags: [...node.tags],
    });
  }
  
  /**
   * 删除单个节点
   * 
   * @param id - 节点 ID
   */
  async deleteNode(id: string): Promise<void> {
    await this.db.nodes.delete(id);
  }
  
  /**
   * 批量删除节点
   * 
   * @param ids - 节点 ID 数组
   */
  async deleteNodes(ids: string[]): Promise<void> {
    await this.db.nodes.bulkDelete(ids);
  }
  
  // ============================================================================
  // 标签持久化
  // ============================================================================
  
  /**
   * 保存所有标签
   * 
   * @param tags - 标签数组
   */
  async saveTags(tags: Tag[]): Promise<void> {
    await this.ensureDatabase();
    await this.db.transaction('rw', this.db.tags, async () => {
      await this.db.tags.clear();
      
      const storedTags: StoredTag[] = tags.map(tag => ({ ...tag }));
      await this.db.tags.bulkAdd(storedTags);
    });
  }
  
  /**
   * 加载所有标签
   * 
   * @returns 标签数组
   */
  async loadTags(): Promise<Tag[]> {
    await this.ensureDatabase();
    return this.db.tags.toArray();
  }
  
  /**
   * 保存单个标签
   * 
   * @param tag - 标签数据
   */
  async saveTag(tag: Tag): Promise<void> {
    await this.db.tags.put({ ...tag });
  }
  
  /**
   * 删除单个标签
   * 
   * @param id - 标签 ID
   */
  async deleteTag(id: string): Promise<void> {
    await this.db.tags.delete(id);
  }
  
  // ============================================================================
  // 筛选预设持久化
  // ============================================================================
  
  /**
   * 保存所有筛选预设
   * 
   * @param presets - 预设数组
   */
  async savePresets(presets: FilterPreset[]): Promise<void> {
    await this.db.transaction('rw', this.db.presets, async () => {
      await this.db.presets.clear();
      
      const storedPresets: StoredPreset[] = presets.map(preset => ({
        ...preset,
        config: JSON.stringify(preset.config),
      }));
      
      await this.db.presets.bulkAdd(storedPresets);
    });
  }
  
  /**
   * 加载所有筛选预设
   * 
   * @returns 预设数组
   */
  async loadPresets(): Promise<FilterPreset[]> {
    const storedPresets = await this.db.presets.toArray();
    
    return storedPresets.map(preset => ({
      ...preset,
      config: JSON.parse(preset.config),
    }));
  }
  
  // ============================================================================
  // 应用设置持久化
  // ============================================================================
  
  /**
   * 保存应用设置
   * 
   * @param settings - 应用设置
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    await this.db.transaction('rw', this.db.settings, async () => {
      // 清空现有设置
      await this.db.settings.clear();
      
      // 逐个保存设置项
      const entries: [string, any][] = [
        ['defaultView', settings.defaultView],
        ['theme', settings.theme],
        ['showCompletedNodes', settings.showCompletedNodes],
        ['undoHistoryLimit', settings.undoHistoryLimit],
        ['mindMapSettings', settings.mindMapSettings],
        ['listViewSettings', settings.listViewSettings],
      ];
      
      for (const [key, value] of entries) {
        await this.db.settings.put({
          key,
          value: JSON.stringify(value),
        });
      }
    });
  }
  
  /**
   * 加载应用设置
   * 
   * @returns 应用设置
   */
  async loadSettings(): Promise<AppSettings> {
    const storedSettings = await this.db.settings.toArray();
    
    if (storedSettings.length === 0) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    
    // 构建设置对象
    const settingsMap = new Map<string, any>();
    
    for (const setting of storedSettings) {
      try {
        settingsMap.set(setting.key, JSON.parse(setting.value));
      } catch {
        settingsMap.set(setting.key, setting.value);
      }
    }
    
    // 合并默认设置（处理缺失的设置项）
    return {
      ...DEFAULT_APP_SETTINGS,
      defaultView: settingsMap.get('defaultView') ?? DEFAULT_APP_SETTINGS.defaultView,
      theme: settingsMap.get('theme') ?? DEFAULT_APP_SETTINGS.theme,
      showCompletedNodes: settingsMap.get('showCompletedNodes') ?? DEFAULT_APP_SETTINGS.showCompletedNodes,
      undoHistoryLimit: settingsMap.get('undoHistoryLimit') ?? DEFAULT_APP_SETTINGS.undoHistoryLimit,
      mindMapSettings: {
        ...DEFAULT_APP_SETTINGS.mindMapSettings,
        ...(settingsMap.get('mindMapSettings') ?? {}),
      },
      listViewSettings: {
        ...DEFAULT_APP_SETTINGS.listViewSettings,
        ...(settingsMap.get('listViewSettings') ?? {}),
      },
    };
  }
  
  // ============================================================================
  // 版本管理
  // ============================================================================
  
  /**
   * 获取数据版本
   * 
   * @returns 版本字符串
   */
  async getVersion(): Promise<string> {
    const versionSetting = await this.db.settings.get('version');
    return versionSetting?.value ?? '1.0.0';
  }
  
  /**
   * 设置数据版本
   * 
   * @param version - 版本字符串
   */
  async setVersion(version: string): Promise<void> {
    await this.db.settings.put({
      key: 'version',
      value: version,
    });
  }
  
  // ============================================================================
  // 数据库管理
  // ============================================================================
  
  /**
   * 清空所有数据
   * 
   * 警告：此操作不可恢复
   */
  async clearAll(): Promise<void> {
    await this.db.transaction('rw', 
      [this.db.nodes, this.db.tags, this.db.presets, this.db.settings], 
      async () => {
        await Promise.all([
          this.db.nodes.clear(),
          this.db.tags.clear(),
          this.db.presets.clear(),
          this.db.settings.clear(),
        ]);
      }
    );
  }
  
  /**
   * 导出所有数据
   * 
   * @returns 所有数据的 JSON 对象
   */
  async exportAll(): Promise<{
    nodes: ScheduleNode[];
    tags: Tag[];
    presets: FilterPreset[];
    settings: AppSettings;
    version: string;
  }> {
    const [nodes, tags, presets, settings, version] = await Promise.all([
      this.loadNodes(),
      this.loadTags(),
      this.loadPresets(),
      this.loadSettings(),
      this.getVersion(),
    ]);
    
    return {
      nodes,
      tags,
      presets,
      settings,
      version,
    };
  }
  
  /**
   * 导入所有数据
   * 
   * @param data - 数据对象
   */
  async importAll(data: {
    nodes?: ScheduleNode[];
    tags?: Tag[];
    presets?: FilterPreset[];
    settings?: AppSettings;
    version?: string;
  }): Promise<void> {
    await this.db.transaction('rw', 
      [this.db.nodes, this.db.tags, this.db.presets, this.db.settings],
      async () => {
        if (data.nodes) {
          await this.saveNodes(data.nodes);
        }
        if (data.tags) {
          await this.saveTags(data.tags);
        }
        if (data.presets) {
          await this.savePresets(data.presets);
        }
        if (data.settings) {
          await this.saveSettings(data.settings);
        }
        if (data.version) {
          await this.setVersion(data.version);
        } else {
          await this.setVersion(APP_VERSION);
        }
      }
    );
  }
  
  // ============================================================================
  // 统计信息
  // ============================================================================
  
  /**
   * 获取数据库统计信息
   * 
   * @returns 统计信息对象
   */
  async getStats(): Promise<{
    nodeCount: number;
    tagCount: number;
    presetCount: number;
    storageSize: number;
  }> {
    const [nodeCount, tagCount, presetCount] = await Promise.all([
      this.db.nodes.count(),
      this.db.tags.count(),
      this.db.presets.count(),
    ]);
    
    // 估算存储大小（粗略估计）
    const allNodes = await this.db.nodes.toArray();
    const allTags = await this.db.tags.toArray();
    const allPresets = await this.db.presets.toArray();
    
    const storageSize = JSON.stringify({
      nodes: allNodes,
      tags: allTags,
      presets: allPresets,
    }).length;
    
    return {
      nodeCount,
      tagCount,
      presetCount,
      storageSize,
    };
  }
}
