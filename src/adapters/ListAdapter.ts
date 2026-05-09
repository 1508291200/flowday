/**
 * ListAdapter 列表视图适配器
 * 
 * 核心职责：
 * 1. 将树形数据扁平化为列表结构
 * 2. 处理层级缩进
 * 3. 管理折叠/展开状态
 * 4. 提供虚拟列表所需的数据格式
 */

import type {
  ScheduleNode,
  FlattenedNode,
  ListViewSettings,
  ISchedulerManager,
  IEventBus,
  IListAdapter,
} from '../core/types';

/** 默认列表视图配置 */
const DEFAULT_SETTINGS: ListViewSettings = {
  showImportance: true,
  showDueDate: true,
  showTags: true,
  showCheckbox: true,
  defaultIndentSize: 24,
};

/**
 * ListAdapter 实现
 * 
 * 使用示例：
 * ```typescript
 * const adapter = new ListAdapter(schedulerManager, eventBus);
 * const listData = adapter.buildListData();
 * // listData - 扁平化的节点数组，用于虚拟列表渲染
 * ```
 */
export class ListAdapter implements IListAdapter {
  /** 日程管理器 */
  private schedulerManager: ISchedulerManager;
  
  /** 事件总线（预留用于订阅视图更新） */
  // @ts-expect-error - Reserved for future use
  private _eventBus: IEventBus;
  
  /** 视图配置 */
  private settings: ListViewSettings;
  
  /** 折叠节点 ID 集合 */
  private collapsedIds: Set<string> = new Set();
  
  /**
   * 创建适配器实例
   */
  constructor(
    schedulerManager: ISchedulerManager,
    eventBus: IEventBus,
    settings?: Partial<ListViewSettings>
  ) {
    this.schedulerManager = schedulerManager;
    this._eventBus = eventBus;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }
  
  // ============================================================================
  // 数据转换
  // ============================================================================
  
  /**
   * 构建列表数据
   * 
   * 执行流程：
   * 1. 获取所有节点
   * 2. 递归遍历，构建扁平列表
   * 3. 计算缩进和可见性
   * 
   * @param collapsedIds - 可选的折叠节点集合
   * @returns 扁平化的节点数组
   */
  buildListData(collapsedIds?: Set<string>): FlattenedNode[] {
    // 使用传入的折叠状态，或使用实例状态
    const collapsed = collapsedIds ?? this.collapsedIds;
    
    const allNodes = this.schedulerManager.getAllNodes();
    const result: FlattenedNode[] = [];
    
    // 递归遍历构建列表
    const traverse = (
      parentId: string | null,
      depth: number,
      path: string[],
      parentVisible: boolean,
      parentCollapsed: boolean
    ) => {
      const children = allNodes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      
      children.forEach((node, index) => {
        const isCollapsed = collapsed.has(node.id);
        const hasChildren = allNodes.some(n => n.parentId === node.id);
        const isLastChild = index === children.length - 1;
        
        // 当前节点是否可见：
        // 1. 父节点必须是可见的
        // 2. 父节点不能是折叠状态
        const isVisible = parentVisible && !parentCollapsed;
        
        result.push({
          id: node.id,
          node,
          depth,
          isExpanded: !isCollapsed,
          hasChildren,
          isVisible,
          parentPath: [...path],
          indent: depth * this.settings.defaultIndentSize,
          isLastChild,
          hasVisibleChildren: hasChildren && !isCollapsed,
        });
        
        // 递归处理子节点
        if (hasChildren) {
          traverse(
            node.id,
            depth + 1,
            [...path, node.id],
            isVisible,
            isCollapsed
          );
        }
      });
    };
    
    // 从根节点开始遍历
    const root = this.schedulerManager.getRootNode();
    traverse(root.id, 0, [], true, false);
    
    return result;
  }
  
  // ============================================================================
  // 折叠/展开
  // ============================================================================
  
  /**
   * 折叠节点
   */
  collapseNode(nodeId: string): void {
    this.collapsedIds.add(nodeId);
  }
  
  /**
   * 展开节点
   */
  expandNode(nodeId: string): void {
    this.collapsedIds.delete(nodeId);
  }
  
  /**
   * 切换折叠状态
   */
  toggleNode(nodeId: string): void {
    if (this.collapsedIds.has(nodeId)) {
      this.expandNode(nodeId);
    } else {
      this.collapseNode(nodeId);
    }
  }
  
  /**
   * 折叠所有节点
   */
  collapseAll(): void {
    const allNodes = this.schedulerManager.getAllNodes();
    for (const node of allNodes) {
      // 跳过根节点
      if (node.id === this.schedulerManager.getRootNode().id) {
        continue;
      }
      // 只折叠有子节点的节点
      if (this.schedulerManager.getChildren(node.id).length > 0) {
        this.collapsedIds.add(node.id);
      }
    }
  }
  
  /**
   * 展开所有节点
   */
  expandAll(): void {
    this.collapsedIds.clear();
  }
  
  // ============================================================================
  // 滚动辅助
  // ============================================================================
  
  /**
   * 滚动到指定节点
   * 
   * 返回节点在列表中的索引，供虚拟列表使用
   * 
   * @param nodeId - 目标节点 ID
   * @returns 节点索引，如果不可见则返回 -1
   */
  scrollToNode(nodeId: string): number {
    // 确保节点展开（使其可见）
    const node = this.schedulerManager.getNodeById(nodeId);
    if (node && node.parentId) {
      // 展开所有祖先节点
      const path = this.schedulerManager.getNodePath(nodeId);
      for (const ancestor of path) {
        if (this.collapsedIds.has(ancestor.id)) {
          this.expandNode(ancestor.id);
        }
      }
    }
    
    // 重新构建列表
    const newListData = this.buildListData();
    return newListData.findIndex(item => item.id === nodeId);
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 获取可见节点数量
   */
  getVisibleCount(): number {
    const listData = this.buildListData();
    return listData.filter(item => item.isVisible).length;
  }
  
  /**
   * 获取节点的完整路径（用于面包屑）
   */
  getNodeBreadcrumb(nodeId: string): ScheduleNode[] {
    return this.schedulerManager.getNodePath(nodeId);
  }
  
  /**
   * 判断节点是否为叶子节点
   */
  isLeafNode(nodeId: string): boolean {
    const children = this.schedulerManager.getChildren(nodeId);
    return children.length === 0;
  }
  
  /**
   * 获取节点的子树深度
   */
  getSubtreeDepth(nodeId: string): number {
    const children = this.schedulerManager.getChildren(nodeId);
    if (children.length === 0) {
      return 0;
    }
    
    let maxDepth = 0;
    for (const child of children) {
      const depth = this.getSubtreeDepth(child.id);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth + 1;
  }
  
  // ============================================================================
  // 配置管理
  // ============================================================================
  
  /**
   * 更新设置
   */
  updateSettings(settings: Partial<ListViewSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * 获取当前设置
   */
  getSettings(): ListViewSettings {
    return { ...this.settings };
  }
}
