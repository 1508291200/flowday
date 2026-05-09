/**
 * FilterEngine 筛选引擎
 * 
 * 核心职责：
 * 1. 接收筛选条件，从节点列表中过滤出符合条件的节点
 * 2. 支持多维度筛选（重要度、日期、标签、状态、关键字）
 * 3. 支持多种排序方式
 * 4. 提供筛选预设管理
 * 
 * 设计特点：
 * - 纯函数式实现，无副作用
 * - 可独立测试，不依赖外部状态
 * - 通过 setter 方法配置筛选条件
 */

import type {
  ScheduleNode,
  FilterConfig,
  FilterPreset,
  IFilterEngine,
  ImportanceLevel,
} from './types';
import { DEFAULT_FILTER_CONFIG } from './types';
import { generateUUID } from './uuid';

/**
 * FilterEngine 实现类
 * 
 * 使用示例：
 * ```typescript
 * const filterEngine = new FilterEngine();
 * 
 * // 设置筛选条件
 * filterEngine.setFilterConfig({
 *   importanceRange: [4, 5],
 *   completed: false,
 *   sortBy: 'importance',
 *   sortOrder: 'desc'
 * });
 * 
 * // 执行筛选
 * const result = filterEngine.execute(nodes);
 * ```
 */
export class FilterEngine implements IFilterEngine {
  /** 当前筛选配置 */
  private config: FilterConfig;
  
  /** 筛选预设列表 */
  private presets: FilterPreset[] = [];
  
  /**
   * 创建 FilterEngine 实例
   */
  constructor() {
    this.config = { ...DEFAULT_FILTER_CONFIG };
  }
  
  // ============================================================================
  // 配置管理
  // ============================================================================
  
  /**
   * 获取默认筛选配置
   * 
   * @returns 默认配置的副本
   */
  getDefaultConfig(): FilterConfig {
    return { ...DEFAULT_FILTER_CONFIG };
  }
  
  /**
   * 设置筛选配置
   * 
   * @param config - 新的筛选配置
   */
  setFilterConfig(config: FilterConfig): void {
    // 深拷贝配置，避免引用问题
    this.config = {
      ...config,
      // 处理数组类型的配置
      importanceRange: config.importanceRange 
        ? [...config.importanceRange] as [ImportanceLevel, ImportanceLevel]
        : undefined,
      dueDateRange: config.dueDateRange
        ? {
            start: config.dueDateRange.start,
            end: config.dueDateRange.end,
          }
        : undefined,
      tags: config.tags
        ? {
            ids: [...config.tags.ids],
            mode: config.tags.mode,
          }
        : undefined,
    };
  }
  
  /**
   * 获取当前筛选配置
   * 
   * @returns 当前配置的副本
   */
  getCurrentConfig(): FilterConfig {
    return { ...this.config };
  }
  
  /**
   * 重置筛选配置
   */
  resetFilter(): void {
    this.config = this.getDefaultConfig();
  }
  
  // ============================================================================
  // 筛选执行
  // ============================================================================
  
  /**
   * 执行筛选
   * 
   * 筛选顺序：
   * 1. 关键字搜索（标题和描述）
   * 2. 重要度范围过滤
   * 3. 日期范围过滤
   * 4. 标签过滤（AND/OR 模式）
   * 5. 完成状态过滤
   * 6. 排序
   * 
   * @param nodes - 待筛选的节点数组
   * @returns 筛选后的节点数组
   */
  execute(nodes: ScheduleNode[]): ScheduleNode[] {
    let result = [...nodes];
    
    // 1. 关键字搜索
    result = this.applyKeywordFilter(result);
    
    // 2. 重要度范围过滤
    result = this.applyImportanceFilter(result);
    
    // 3. 日期范围过滤
    result = this.applyDateFilter(result);
    
    // 4. 标签过滤
    result = this.applyTagFilter(result);
    
    // 5. 完成状态过滤
    result = this.applyCompletionFilter(result);
    
    // 6. 排序
    result = this.sortNodes(result);
    
    return result;
  }
  
  /**
   * 应用关键字搜索过滤
   */
  private applyKeywordFilter(nodes: ScheduleNode[]): ScheduleNode[] {
    if (!this.config.searchKeyword || this.config.searchKeyword.trim() === '') {
      return nodes;
    }
    
    const keyword = this.config.searchKeyword.toLowerCase().trim();
    
    return nodes.filter(node => 
      node.title.toLowerCase().includes(keyword) ||
      node.description.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * 应用重要度范围过滤
   */
  private applyImportanceFilter(nodes: ScheduleNode[]): ScheduleNode[] {
    if (!this.config.importanceRange) {
      return nodes;
    }
    
    const [min, max] = this.config.importanceRange;
    
    return nodes.filter(node => 
      node.importance >= min && node.importance <= max
    );
  }
  
  /**
   * 应用日期范围过滤
   */
  private applyDateFilter(nodes: ScheduleNode[]): ScheduleNode[] {
    if (!this.config.dueDateRange) {
      return nodes;
    }
    
    const { start, end } = this.config.dueDateRange;
    
    return nodes.filter(node => {
      // 没有截止日期的节点不通过日期过滤
      if (!node.dueDate) {
        return false;
      }
      
      const nodeDate = new Date(node.dueDate);
      
      // 检查开始日期
      if (start && nodeDate < new Date(start)) {
        return false;
      }
      
      // 检查结束日期
      if (end && nodeDate > new Date(end)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * 应用标签过滤
   */
  private applyTagFilter(nodes: ScheduleNode[]): ScheduleNode[] {
    if (!this.config.tags || this.config.tags.ids.length === 0) {
      return nodes;
    }
    
    const { ids, mode } = this.config.tags;
    const tagSet = new Set(ids);
    
    if (mode === 'AND') {
      // 必须包含所有指定标签
      return nodes.filter(node => 
        ids.every(tagId => node.tags.includes(tagId))
      );
    } else {
      // 包含任意一个指定标签
      return nodes.filter(node => 
        node.tags.some(tagId => tagSet.has(tagId))
      );
    }
  }
  
  /**
   * 应用完成状态过滤
   */
  private applyCompletionFilter(nodes: ScheduleNode[]): ScheduleNode[] {
    if (this.config.completed === undefined) {
      return nodes;
    }
    
    return nodes.filter(node => node.completed === this.config.completed);
  }
  
  /**
   * 排序节点
   */
  private sortNodes(nodes: ScheduleNode[]): ScheduleNode[] {
    const { sortBy, sortOrder } = this.config;
    
    return [...nodes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'importance':
          comparison = a.importance - b.importance;
          break;
          
        case 'dueDate':
          // 没有截止日期的排在最后
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
          
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
          
        case 'title':
          comparison = a.title.localeCompare(b.title, 'zh-CN');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
  
  // ============================================================================
  // 预设管理
  // ============================================================================
  
  /**
   * 保存筛选预设
   * 
   * @param name - 预设名称
   * @param config - 筛选配置
   */
  savePreset(name: string, config: FilterConfig): void {
    // 检查是否已存在同名预设
    const existingIndex = this.presets.findIndex(p => p.name === name);
    
    const preset: FilterPreset = {
      id: existingIndex >= 0 
        ? this.presets[existingIndex].id 
        : generateUUID(),
      name,
      config,
      createdAt: existingIndex >= 0
        ? this.presets[existingIndex].createdAt
        : new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      this.presets[existingIndex] = preset;
    } else {
      this.presets.push(preset);
    }
  }
  
  /**
   * 加载筛选预设
   * 
   * @param name - 预设名称
   * @returns 筛选配置，如果不存在则返回 null
   */
  loadPreset(name: string): FilterConfig | null {
    const preset = this.presets.find(p => p.name === name);
    return preset ? { ...preset.config } : null;
  }
  
  /**
   * 删除筛选预设
   * 
   * @param name - 预设名称
   */
  deletePreset(name: string): void {
    this.presets = this.presets.filter(p => p.name !== name);
  }
  
  /**
   * 删除筛选预设（按 ID）
   * 
   * @param id - 预设 ID
   */
  deletePresetById(id: string): void {
    this.presets = this.presets.filter(p => p.id !== id);
  }
  
  /**
   * 获取所有筛选预设
   * 
   * @returns 预设数组
   */
  getAllPresets(): FilterPreset[] {
    return [...this.presets];
  }
  
  /**
   * 导入筛选预设
   * 
   * @param presets - 预设数组
   */
  importPresets(presets: FilterPreset[]): void {
    this.presets = presets.map(p => ({ ...p }));
  }
  
  /**
   * 导出筛选预设
   * 
   * @returns 预设数组的深拷贝
   */
  exportPresets(): FilterPreset[] {
    return this.presets.map(p => ({
      ...p,
      config: { ...p.config },
    }));
  }
  
  // ============================================================================
  // 静态工具方法
  // ============================================================================
  
  /**
   * 判断节点是否匹配筛选条件（静态方法）
   * 
   * 用于单节点快速判断，避免创建完整实例
   * 
   * @param node - 节点
   * @param config - 筛选配置
   * @returns 是否匹配
   */
  static matches(node: ScheduleNode, config: FilterConfig): boolean {
    // 关键字匹配
    if (config.searchKeyword && config.searchKeyword.trim() !== '') {
      const keyword = config.searchKeyword.toLowerCase().trim();
      if (!node.title.toLowerCase().includes(keyword) &&
          !node.description.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    
    // 重要度匹配
    if (config.importanceRange) {
      const [min, max] = config.importanceRange;
      if (node.importance < min || node.importance > max) {
        return false;
      }
    }
    
    // 日期匹配
    if (config.dueDateRange) {
      if (!node.dueDate) {
        return false;
      }
      const nodeDate = new Date(node.dueDate);
      if (config.dueDateRange.start && nodeDate < new Date(config.dueDateRange.start)) {
        return false;
      }
      if (config.dueDateRange.end && nodeDate > new Date(config.dueDateRange.end)) {
        return false;
      }
    }
    
    // 标签匹配
    if (config.tags && config.tags.ids.length > 0) {
      if (config.tags.mode === 'AND') {
        if (!config.tags.ids.every(tagId => node.tags.includes(tagId))) {
          return false;
        }
      } else {
        if (!config.tags.ids.some(tagId => node.tags.includes(tagId))) {
          return false;
        }
      }
    }
    
    // 完成状态匹配
    if (config.completed !== undefined && node.completed !== config.completed) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 快速筛选节点列表（静态方法）
   * 
   * @param nodes - 节点数组
   * @param config - 筛选配置
   * @returns 筛选后的节点数组（不排序）
   */
  static filter(nodes: ScheduleNode[], config: FilterConfig): ScheduleNode[] {
    return nodes.filter(node => FilterEngine.matches(node, config));
  }
}
