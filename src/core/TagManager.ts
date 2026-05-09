/**
 * TagManager 标签管理器
 * 
 * 核心职责：
 * 1. 管理标签的 CRUD 操作
 * 2. 维护标签与节点的关联关系
 * 3. 提供标签使用统计
 * 4. 通过 EventBus 发布标签变更事件
 * 
 * 设计要点：
 * - 标签本身的数据由 TagManager 管理
 * - 标签与节点的关联通过反向索引维护
 * - 删除标签时通知 SchedulerManager 更新节点
 */

import type {
  Tag,
  CreateTagData,
  UpdateTagData,
  ITagManager,
  IEventBus,
} from './types';
import { generateUUID } from './uuid';
import { TAG_PRESET_COLORS } from './types';

/**
 * TagManager 实现类
 * 
 * 使用示例：
 * ```typescript
 * const tagManager = new TagManager(eventBus);
 * 
 * // 创建标签
 * const tag = tagManager.createTag('紧急', '#FF6B6B');
 * 
 * // 获取标签
 * const tags = tagManager.getAllTags();
 * 
 * // 删除标签（会触发事件通知）
 * tagManager.deleteTag(tag.id);
 * ```
 */
export class TagManager implements ITagManager {
  /** 标签存储：id -> Tag */
  private tags: Map<string, Tag> = new Map();
  
  /** 标签使用索引：tagId -> Set<nodeId> */
  private tagUsage: Map<string, Set<string>> = new Map();
  
  /** 事件总线 */
  private eventBus: IEventBus;
  
  /**
   * 创建 TagManager 实例
   * 
   * @param eventBus - 事件总线实例
   */
  constructor(eventBus: IEventBus) {
    if (!eventBus) {
      throw new Error('EventBus is required for TagManager');
    }
    
    this.eventBus = eventBus;
    
    // 初始化一些默认标签
    this.initializeDefaultTags();
  }
  
  /**
   * 初始化默认标签
   * 
   * 为新用户提供一些常用的预设标签
   */
  private initializeDefaultTags(): void {
    const defaultTags: CreateTagData[] = [
      { name: '工作', color: TAG_PRESET_COLORS[0] },
      { name: '个人', color: TAG_PRESET_COLORS[1] },
      { name: '紧急', color: TAG_PRESET_COLORS[2] },
      { name: '重要', color: TAG_PRESET_COLORS[5] },
    ];
    
    defaultTags.forEach(data => {
      const id = generateUUID();
      const tag: Tag = {
        id,
        name: data.name,
        color: data.color,
        createdAt: new Date().toISOString(),
      };
      this.tags.set(id, tag);
      this.tagUsage.set(id, new Set());
    });
  }
  
  // ============================================================================
  // 创建操作
  // ============================================================================
  
  /**
   * 创建新标签
   * 
   * @param name - 标签名称
   * @param color - 标签颜色（HEX格式，可选）
   * @returns 新创建的标签
   * 
   * @throws Error 如果标签名已存在
   * 
   * @example
   * const tag = tagManager.createTag('项目A', '#FF6B6B');
   * const tag = tagManager.createTag('项目B'); // 使用随机颜色
   */
  createTag(name: string, color?: string): Tag {
    // 检查标签名是否已存在
    if (this.findTagByName(name)) {
      throw new Error(`Tag with name "${name}" already exists`);
    }
    
    // 生成标签 ID
    const id = generateUUID();
    
    // 如果没有指定颜色，从预设颜色中随机选择
    const tagColor = color ?? this.getRandomColor();
    
    // 构建标签数据
    const tag: Tag = {
      id,
      name,
      color: tagColor,
      createdAt: new Date().toISOString(),
    };
    
    // 存储
    this.tags.set(id, tag);
    this.tagUsage.set(id, new Set());
    
    // 发布事件
    this.eventBus.emit('tag:created', tag);
    
    return tag;
  }
  
  // ============================================================================
  // 读取操作
  // ============================================================================
  
  /**
   * 获取所有标签
   * 
   * @returns 标签数组
   */
  getAllTags(): Tag[] {
    return Array.from(this.tags.values());
  }
  
  /**
   * 根据 ID 获取标签
   * 
   * @param id - 标签 ID
   * @returns 标签或 null
   */
  getTagById(id: string): Tag | null {
    return this.tags.get(id) ?? null;
  }
  
  /**
   * 根据 ID 批量获取标签
   * 
   * @param ids - 标签 ID 数组
   * @returns 标签数组（自动过滤不存在的）
   */
  getTagsByIds(ids: string[]): Tag[] {
    return ids
      .map(id => this.tags.get(id))
      .filter((tag): tag is Tag => tag !== undefined);
  }
  
  /**
   * 根据名称查找标签
   * 
   * @param name - 标签名称
   * @returns 标签或 null
   */
  findTagByName(name: string): Tag | null {
    for (const tag of this.tags.values()) {
      if (tag.name === name) {
        return tag;
      }
    }
    return null;
  }
  
  /**
   * 获取使用指定标签的节点 ID 列表
   * 
   * @param tagId - 标签 ID
   * @returns 节点 ID 数组
   */
  getNodesByTag(tagId: string): string[] {
    const nodeIds = this.tagUsage.get(tagId);
    return nodeIds ? Array.from(nodeIds) : [];
  }
  
  /**
   * 获取标签使用次数
   * 
   * @param tagId - 标签 ID
   * @returns 使用次数
   */
  getTagUsageCount(tagId: string): number {
    const nodeIds = this.tagUsage.get(tagId);
    return nodeIds?.size ?? 0;
  }
  
  /**
   * 获取标签使用统计
   * 
   * @returns 标签使用次数映射表
   */
  getTagUsageStats(): Map<string, number> {
    const stats = new Map<string, number>();
    
    this.tagUsage.forEach((nodeIds, tagId) => {
      stats.set(tagId, nodeIds.size);
    });
    
    return stats;
  }
  
  // ============================================================================
  // 更新操作
  // ============================================================================
  
  /**
   * 更新标签
   * 
   * @param id - 标签 ID
   * @param data - 更新数据
   * @returns 更新后的标签
   * 
   * @throws Error 如果标签不存在或名称冲突
   * 
   * @example
   * tagManager.updateTag('tag-id', { name: '新名称' });
   * tagManager.updateTag('tag-id', { color: '#4ECDC4' });
   */
  updateTag(id: string, data: UpdateTagData): Tag {
    const tag = this.tags.get(id);
    
    if (!tag) {
      throw new Error(`Tag "${id}" not found`);
    }
    
    // 如果更新名称，检查是否冲突
    if (data.name && data.name !== tag.name) {
      const existing = this.findTagByName(data.name);
      if (existing) {
        throw new Error(`Tag with name "${data.name}" already exists`);
      }
    }
    
    // 构建更新后的标签
    const updated: Tag = {
      ...tag,
      ...data,
    };
    
    // 存储
    this.tags.set(id, updated);
    
    // 发布事件
    this.eventBus.emit('tag:updated', updated);
    
    return updated;
  }
  
  // ============================================================================
  // 删除操作
  // ============================================================================
  
  /**
   * 删除标签
   * 
   * 删除标签时会：
   * 1. 记录受影响的节点 ID
   * 2. 清理标签使用索引
   * 3. 发布删除事件（SchedulerManager 会监听并更新节点）
   * 
   * @param id - 标签 ID
   * 
   * @example
   * tagManager.deleteTag('tag-id');
   */
  deleteTag(id: string): void {
    const tag = this.tags.get(id);
    
    if (!tag) {
      return;
    }
    
    // 从存储中删除
    this.tags.delete(id);
    this.tagUsage.delete(id);
    
    // 发布删除事件
    this.eventBus.emit('tag:deleted', { 
      id,
    });
  }
  
  // ============================================================================
  // 节点关联管理（供 SchedulerManager 调用）
  // ============================================================================
  
  /**
   * 注册节点使用标签
   * 
   * 当节点添加标签时调用此方法更新索引。
   * 
   * @param nodeId - 节点 ID
   * @param tagId - 标签 ID
   */
  registerNodeTag(nodeId: string, tagId: string): void {
    if (!this.tagUsage.has(tagId)) {
      this.tagUsage.set(tagId, new Set());
    }
    this.tagUsage.get(tagId)!.add(nodeId);
  }
  
  /**
   * 注销节点使用标签
   * 
   * 当节点移除标签时调用此方法更新索引。
   * 
   * @param nodeId - 节点 ID
   * @param tagId - 标签 ID
   */
  unregisterNodeTag(nodeId: string, tagId: string): void {
    const nodeIds = this.tagUsage.get(tagId);
    if (nodeIds) {
      nodeIds.delete(nodeId);
    }
  }
  
  /**
   * 更新节点的标签列表
   * 
   * 比较新旧标签列表，更新使用索引。
   * 
   * @param nodeId - 节点 ID
   * @param oldTags - 旧标签 ID 数组
   * @param newTags - 新标签 ID 数组
   */
  updateNodeTags(nodeId: string, oldTags: string[], newTags: string[]): void {
    const oldSet = new Set(oldTags);
    const newSet = new Set(newTags);
    
    // 找出新增的标签
    for (const tagId of newTags) {
      if (!oldSet.has(tagId)) {
        this.registerNodeTag(nodeId, tagId);
      }
    }
    
    // 找出移除的标签
    for (const tagId of oldTags) {
      if (!newSet.has(tagId)) {
        this.unregisterNodeTag(nodeId, tagId);
      }
    }
  }
  
  /**
   * 删除节点的所有标签关联
   * 
   * 当节点被删除时调用此方法清理索引。
   * 
   * @param nodeId - 节点 ID
   */
  removeNodeFromAllTags(nodeId: string): void {
    this.tagUsage.forEach((nodeIds) => {
      nodeIds.delete(nodeId);
    });
  }
  
  // ============================================================================
  // 导入导出
  // ============================================================================
  
  /**
   * 批量导入标签
   * 
   * @param tags - 标签数组
   */
  importTags(tags: Tag[]): void {
    // 清空现有数据
    this.tags.clear();
    this.tagUsage.clear();
    
    // 导入标签
    for (const tag of tags) {
      this.tags.set(tag.id, { ...tag });
      this.tagUsage.set(tag.id, new Set());
    }
  }
  
  /**
   * 导出所有标签
   * 
   * @returns 标签数组的深拷贝
   */
  exportTags(): Tag[] {
    return this.getAllTags().map(tag => ({ ...tag }));
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 获取随机颜色
   * 
   * 从预设颜色中随机选择一个
   * 
   * @returns HEX 颜色字符串
   */
  private getRandomColor(): string {
    const index = Math.floor(Math.random() * TAG_PRESET_COLORS.length);
    return TAG_PRESET_COLORS[index];
  }
  
  /**
   * 获取预设颜色列表
   * 
   * @returns 颜色数组
   */
  getPresetColors(): string[] {
    return [...TAG_PRESET_COLORS];
  }
}
