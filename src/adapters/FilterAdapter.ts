/**
 * FilterAdapter 筛选视图适配器
 * 
 * 核心职责：
 * 1. 管理筛选配置
 * 2. 执行筛选并格式化结果
 * 3. 提供筛选预设管理
 * 4. 为卡片视图提供数据
 */

import type {
  ScheduleNode,
  Tag,
  FilterConfig,
  FilterResult,
  FilterCard,
  FilterPreset,
  DueDateStatus,
  IFilterEngine,
  ISchedulerManager,
  ITagManager,
  IEventBus,
  IFilterAdapter,
} from '../core/types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../core/types';

/**
 * 计算截止日期状态
 * 
 * @param dueDate - 截止日期字符串
 * @returns 截止日期状态
 */
function calculateDueDateStatus(dueDate: string | null): DueDateStatus {
  if (!dueDate) {
    return 'none';
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'overdue';
  } else if (diffDays === 0) {
    return 'today';
  } else if (diffDays <= 7) {
    return 'soon';
  } else {
    return 'future';
  }
}

/**
 * FilterAdapter 实现
 * 
 * 使用示例：
 * ```typescript
 * const adapter = new FilterAdapter(filterEngine, schedulerManager, tagManager);
 * 
 * // 设置筛选条件
 * adapter.setFilterConfig({
 *   importanceRange: [4, 5],
 *   completed: false
 * });
 * 
 * // 执行筛选
 * const result = adapter.applyFilter();
 * ```
 */
export class FilterAdapter implements IFilterAdapter {
  /** 筛选引擎 */
  private filterEngine: IFilterEngine;
  
  /** 日程管理器 */
  private schedulerManager: ISchedulerManager;
  
  /** 标签管理器 */
  private tagManager: ITagManager;
  
  /** 事件总线 */
  private eventBus: IEventBus;
  
  /** 当前筛选配置 */
  private currentConfig: FilterConfig;
  
  /**
   * 创建适配器实例
   */
  constructor(
    filterEngine: IFilterEngine,
    schedulerManager: ISchedulerManager,
    tagManager: ITagManager,
    eventBus: IEventBus
  ) {
    this.filterEngine = filterEngine;
    this.schedulerManager = schedulerManager;
    this.tagManager = tagManager;
    this.eventBus = eventBus;
    this.currentConfig = filterEngine.getDefaultConfig();
  }
  
  // ============================================================================
  // 筛选配置
  // ============================================================================
  
  /**
   * 设置筛选配置
   */
  setFilterConfig(config: FilterConfig): void {
    this.currentConfig = { ...config };
    this.filterEngine.setFilterConfig(this.currentConfig);
  }
  
  /**
   * 获取当前筛选配置
   */
  getCurrentConfig(): FilterConfig {
    return { ...this.currentConfig };
  }
  
  /**
   * 重置筛选配置
   */
  resetConfig(): void {
    this.currentConfig = this.filterEngine.getDefaultConfig();
    this.filterEngine.resetFilter();
  }
  
  // ============================================================================
  // 筛选执行
  // ============================================================================
  
  /**
   * 执行筛选
   * 
   * @returns 筛选结果对象
   */
  applyFilter(): FilterResult {
    const allNodes = this.schedulerManager.getAllNodes();
    
    // 排除根节点
    const nodesToFilter = allNodes.filter(
      node => node.id !== this.schedulerManager.getRootNode().id
    );
    
    // 执行筛选
    const filteredNodes = this.filterEngine.execute(nodesToFilter);
    
    // 发布筛选应用事件
    this.eventBus.emit('filter:applied', {
      result: filteredNodes,
      config: this.currentConfig,
    });
    
    return {
      nodes: filteredNodes,
      totalCount: nodesToFilter.length,
      filteredCount: filteredNodes.length,
      config: { ...this.currentConfig },
    };
  }
  
  // ============================================================================
  // 卡片数据构建
  // ============================================================================
  
  /**
   * 构建卡片数据
   * 
   * @param nodes - 节点数组
   * @returns 卡片数据数组
   */
  buildCardData(nodes: ScheduleNode[]): FilterCard[] {
    const allTags = this.tagManager.getAllTags();
    
    return nodes.map(node => {
      // 获取节点的标签详情
      const nodeTags = node.tags
        .map(tagId => allTags.find(t => t.id === tagId))
        .filter((tag): tag is Tag => tag !== undefined);
      
      return {
        id: node.id,
        node,
        tags: nodeTags,
        dueDateStatus: calculateDueDateStatus(node.dueDate),
        importanceLabel: IMPORTANCE_LABELS[node.importance],
        importanceColor: IMPORTANCE_COLORS[node.importance],
      };
    });
  }
  
  // ============================================================================
  // 预设管理
  // ============================================================================
  
  /**
   * 保存当前配置为预设
   */
  saveCurrentAsPreset(name: string): void {
    this.filterEngine.savePreset(name, this.currentConfig);
  }
  
  /**
   * 加载预设
   */
  loadPreset(presetId: string): void {
    const preset = this.filterEngine.getAllPresets().find(p => p.id === presetId);
    if (preset) {
      this.setFilterConfig(preset.config);
    }
  }
  
  /**
   * 删除预设
   */
  deletePreset(presetId: string): void {
    // 使用 getAllPresets 找到名称然后删除
    const preset = this.filterEngine.getAllPresets().find(p => p.id === presetId);
    if (preset) {
      this.filterEngine.deletePreset(preset.name);
    }
  }
  
  /**
   * 获取所有预设
   */
  getAllPresets(): FilterPreset[] {
    return this.filterEngine.getAllPresets();
  }
  
  // ============================================================================
  // 快捷筛选
  // ============================================================================
  
  /**
   * 快捷筛选：今日到期
   */
  filterDueToday(): FilterResult {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.setFilterConfig({
      dueDateRange: {
        start: today.toISOString(),
        end: tomorrow.toISOString(),
      },
      completed: false,
      sortBy: 'importance',
      sortOrder: 'desc',
    });
    
    return this.applyFilter();
  }
  
  /**
   * 快捷筛选：本周到期
   */
  filterDueThisWeek(): FilterResult {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    this.setFilterConfig({
      dueDateRange: {
        start: today.toISOString(),
        end: weekEnd.toISOString(),
      },
      completed: false,
      sortBy: 'dueDate',
      sortOrder: 'asc',
    });
    
    return this.applyFilter();
  }
  
  /**
   * 快捷筛选：高优先级
   */
  filterHighPriority(): FilterResult {
    this.setFilterConfig({
      importanceRange: [4, 5],
      completed: false,
      sortBy: 'importance',
      sortOrder: 'desc',
    });
    
    return this.applyFilter();
  }
  
  /**
   * 快捷筛选：已过期
   */
  filterOverdue(): FilterResult {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.setFilterConfig({
      dueDateRange: {
        end: today.toISOString(),
      },
      completed: false,
      sortBy: 'dueDate',
      sortOrder: 'asc',
    });
    
    return this.applyFilter();
  }
  
  /**
   * 快捷筛选：已完成
   */
  filterCompleted(): FilterResult {
    this.setFilterConfig({
      completed: true,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    
    return this.applyFilter();
  }
  
  // ============================================================================
  // 统计信息
  // ============================================================================
  
  /**
   * 获取筛选统计
   * 
   * @returns 统计信息对象
   */
  getStats(): {
    total: number;
    completed: number;
    overdue: number;
    highPriority: number;
    dueToday: number;
    dueThisWeek: number;
  } {
    const allNodes = this.schedulerManager.getAllNodes().filter(
      node => node.id !== this.schedulerManager.getRootNode().id
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    let completed = 0;
    let overdue = 0;
    let highPriority = 0;
    let dueToday = 0;
    let dueThisWeek = 0;
    
    for (const node of allNodes) {
      if (node.completed) {
        completed++;
      }
      
      if (!node.completed && node.dueDate) {
        const dueDate = new Date(node.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          overdue++;
        }
        
        if (dueDate.getTime() === today.getTime()) {
          dueToday++;
        }
        
        if (dueDate <= weekEnd) {
          dueThisWeek++;
        }
      }
      
      if (node.importance >= 4) {
        highPriority++;
      }
    }
    
    return {
      total: allNodes.length,
      completed,
      overdue,
      highPriority,
      dueToday,
      dueThisWeek,
    };
  }
}
