/**
 * MindMapAdapter 思维导图视图适配器
 * 
 * 核心职责：
 * 1. 将树形数据转换为 React Flow 可用的节点和边
 * 2. 计算节点布局位置
 * 3. 处理视图状态（折叠、缩放、平移）
 * 4. 管理节点选择和交互状态
 */

import type {
  ScheduleNode,
  MindMapLayoutData,
  MindMapNode,
  MindMapEdge,
  ViewportState,
  MindMapSettings,
  ISchedulerManager,
  IEventBus,
  IMindMapAdapter,
} from '../core/types';

/** 默认思维导图配置 */
const DEFAULT_SETTINGS: MindMapSettings = {
  nodeWidth: 180,
  nodeHeight: 40,
  horizontalGap: 60,
  verticalGap: 20,
  defaultZoom: 1,
  showConnectionLines: true,
  connectionLineStyle: 'bezier',
};

/**
 * MindMapAdapter 实现
 * 
 * 使用示例：
 * ```typescript
 * const adapter = new MindMapAdapter(schedulerManager, eventBus);
 * const layoutData = adapter.buildLayoutData();
 * // layoutData.nodes - React Flow 节点数组
 * // layoutData.edges - React Flow 边数组
 * ```
 */
export class MindMapAdapter implements IMindMapAdapter {
  /** 日程管理器 */
  private schedulerManager: ISchedulerManager;
  
  /** 事件总线（预留用于订阅视图更新） */
  // @ts-expect-error - Reserved for future use
  private _eventBus: IEventBus;
  
  /** 视图配置 */
  private settings: MindMapSettings;
  
  /** 当前视口状态 */
  private viewport: ViewportState = { x: 0, y: 0, zoom: 1 };
  
  /** 折叠节点 ID 集合 */
  private collapsedIds: Set<string> = new Set();
  
  /** 选中节点 ID 集合 */
  private selectedIds: Set<string> = new Set();
  
  /**
   * 创建适配器实例
   */
  constructor(
    schedulerManager: ISchedulerManager,
    eventBus: IEventBus,
    settings?: Partial<MindMapSettings>
  ) {
    this.schedulerManager = schedulerManager;
    this._eventBus = eventBus;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.viewport.zoom = this.settings.defaultZoom;
  }
  
  // ============================================================================
  // 数据转换
  // ============================================================================
  
  /**
   * 构建布局数据
   * 
   * 执行流程：
   * 1. 获取所有节点
   * 2. 计算布局位置
   * 3. 生成节点和边数据
   * 
   * @returns 布局数据对象
   */
  buildLayoutData(): MindMapLayoutData {
    const allNodes = this.schedulerManager.getAllNodes();
    const { positions, visibleNodeIds } = this.calculateLayout(allNodes);
    
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];
    
    for (const node of allNodes) {
      // 跳过不可见节点
      if (!visibleNodeIds.has(node.id)) {
        continue;
      }
      
      const pos = positions.get(node.id);
      if (!pos) continue;
      
      const isCollapsed = this.collapsedIds.has(node.id);
      const children = this.schedulerManager.getChildren(node.id);
      
      nodes.push({
        id: node.id,
        x: pos.x,
        y: pos.y,
        width: this.settings.nodeWidth,
        height: this.settings.nodeHeight,
        data: node,
        isCollapsed,
        childrenCount: children.length,
        visible: true,
      });
      
      // 生成边（连接到父节点）
      if (node.parentId && visibleNodeIds.has(node.parentId)) {
        edges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          sourceX: 0,
          sourceY: 0,
          targetX: 0,
          targetY: 0,
          type: 'bezier',
        });
      }
    }
    
    return {
      nodes,
      edges,
      viewport: { ...this.viewport },
      rootNodeId: this.schedulerManager.getRootNode().id,
    };
  }
  
  /**
   * 计算布局位置
   * 
   * 使用改良的树形布局算法：
   * - 从左到右横向展开
   * - 子树高度自动调整
   * - 考虑折叠状态
   * 
   * @param nodes - 所有节点数组
   * @returns 位置映射和可见节点集合
   */
  private calculateLayout(nodes: ScheduleNode[]): {
    positions: Map<string, { x: number; y: number }>;
    visibleNodeIds: Set<string>;
  } {
    const positions = new Map<string, { x: number; y: number }>();
    const visibleNodeIds = new Set<string>();
    
    // 建立父子关系映射
    const childrenMap = new Map<string | null, ScheduleNode[]>();
    for (const node of nodes) {
      const children = childrenMap.get(node.parentId) ?? [];
      children.push(node);
      childrenMap.set(node.parentId, children);
    }
    
    // 按顺序排序
    for (const children of childrenMap.values()) {
      children.sort((a, b) => a.order - b.order);
    }
    
    // 计算子树高度（考虑折叠）
    const calculateSubtreeHeight = (nodeId: string): number => {
      const children = childrenMap.get(nodeId) ?? [];
      
      // 折叠的节点高度为单行
      if (this.collapsedIds.has(nodeId)) {
        return this.settings.nodeHeight + this.settings.verticalGap;
      }
      
      if (children.length === 0) {
        return this.settings.nodeHeight + this.settings.verticalGap;
      }
      
      let totalHeight = 0;
      for (const child of children) {
        totalHeight += calculateSubtreeHeight(child.id);
      }
      
      return Math.max(
        this.settings.nodeHeight + this.settings.verticalGap,
        totalHeight
      );
    };
    
    // 递归计算位置
    const calculatePosition = (
      nodeId: string,
      depth: number,
      startY: number
    ): number => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return startY;
      
      visibleNodeIds.add(nodeId);
      
      const subtreeHeight = calculateSubtreeHeight(nodeId);
      const x = depth * (this.settings.nodeWidth + this.settings.horizontalGap);
      const y = startY + subtreeHeight / 2 - this.settings.nodeHeight / 2;
      
      positions.set(nodeId, { x, y });
      
      // 如果折叠，不渲染子节点
      if (this.collapsedIds.has(nodeId)) {
        return startY + subtreeHeight;
      }
      
      // 递归计算子节点位置
      const children = childrenMap.get(nodeId) ?? [];
      let currentY = startY;
      
      for (const child of children) {
        currentY = calculatePosition(child.id, depth + 1, currentY);
      }
      
      return Math.max(startY + subtreeHeight, currentY);
    };
    
    // 从根节点开始计算
    const root = this.schedulerManager.getRootNode();
    calculatePosition(root.id, 0, 100);
    
    return { positions, visibleNodeIds };
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
   * 折叠所有节点（只显示根节点的直接子节点）
   */
  collapseAll(): void {
    const allNodes = this.schedulerManager.getAllNodes();
    for (const node of allNodes) {
      if (node.id !== this.schedulerManager.getRootNode().id) {
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
  // 视口控制
  // ============================================================================
  
  /**
   * 居中到指定节点
   */
  centerOnNode(nodeId: string): void {
    const layoutData = this.buildLayoutData();
    const node = layoutData.nodes.find(n => n.id === nodeId);
    
    if (node) {
      this.viewport.x = -node.x + window.innerWidth / 2 - this.settings.nodeWidth / 2;
      this.viewport.y = -node.y + window.innerHeight / 2 - this.settings.nodeHeight / 2;
    }
  }
  
  /**
   * 设置视口状态
   */
  setViewport(viewport: ViewportState): void {
    this.viewport = { ...viewport };
  }
  
  /**
   * 获取视口状态
   */
  getViewport(): ViewportState {
    return { ...this.viewport };
  }
  
  // ============================================================================
  // 选择管理
  // ============================================================================
  
  /**
   * 同步选择状态
   */
  syncSelection(selectedIds: string[]): void {
    this.selectedIds = new Set(selectedIds);
  }
  
  /**
   * 获取选中的节点 ID
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }
  
  // ============================================================================
  // 配置管理
  // ============================================================================
  
  /**
   * 更新设置
   */
  updateSettings(settings: Partial<MindMapSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * 获取当前设置
   */
  getSettings(): MindMapSettings {
    return { ...this.settings };
  }
}
