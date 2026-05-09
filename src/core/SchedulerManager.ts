/**
 * SchedulerManager 日程管理器
 * 
 * 核心职责：
 * 1. 管理日程节点的树形数据结构
 * 2. 提供完整的 CRUD 操作
 * 3. 维护父子关系索引
 * 4. 检测循环引用
 * 5. 通过 EventBus 发布事件
 * 
 * 数据结构设计：
 * - nodes: Map<id, ScheduleNode> - 扁平化存储，O(1) 查询
 * - childrenIndex: Map<parentId, Set<childId>> - 父子索引，快速获取子节点
 * 
 * 设计优势：
 * 1. 扁平化存储避免了递归遍历
 * 2. 索引加速了子节点查询
 * 3. 事件驱动解耦了视图层
 */

import type {
  ScheduleNode,
  CreateNodeData,
  UpdateNodeData,
  ISchedulerManager,
  IEventBus,
  ImportanceLevel,
} from './types';
import { generateUUID } from './uuid';

/**
 * SchedulerManager 实现类
 * 
 * 使用示例：
 * ```typescript
 * const eventBus = new EventBus();
 * const scheduler = new SchedulerManager(eventBus);
 * 
 * // 创建子节点
 * const child = scheduler.createNode('parent-id', { title: '新任务' });
 * 
 * // 更新节点
 * scheduler.updateNode(child.id, { importance: 5 });
 * 
 * // 移动节点
 * scheduler.moveNode(child.id, 'new-parent-id', 0);
 * ```
 */
export class SchedulerManager implements ISchedulerManager {
  /** 节点存储：id -> ScheduleNode */
  private nodes: Map<string, ScheduleNode> = new Map();
  
  /** 子节点索引：parentId -> Set<childId> */
  private childrenIndex: Map<string | null, Set<string>> = new Map();
  
  /** 事件总线（依赖注入） */
  private eventBus: IEventBus;
  
  /** 根节点ID（固定为 'root'） */
  private readonly ROOT_ID = 'root';
  
  /**
   * 创建 SchedulerManager 实例
   * 
   * @param eventBus - 事件总线实例（必须）
   */
  constructor(eventBus: IEventBus) {
    if (!eventBus) {
      throw new Error('EventBus is required for SchedulerManager');
    }
    
    this.eventBus = eventBus;
    this.initializeRootNode();
  }
  
  /**
   * 初始化根节点
   * 
   * 根节点是整个日程树的起点，不可删除
   */
  private initializeRootNode(): void {
    const root: ScheduleNode = {
      id: this.ROOT_ID,
      parentId: null,
      title: '我的日程',
      description: '',
      importance: 3 as ImportanceLevel,
      dueDate: null,
      tags: [],
      collapsed: false,
      order: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.nodes.set(root.id, root);
    this.childrenIndex.set(null, new Set([root.id]));
  }
  
  // ============================================================================
  // 创建操作
  // ============================================================================
  
  /**
   * 创建新节点
   * 
   * @param parentId - 父节点ID，null 表示创建根级节点
   * @param data - 节点数据（可选）
   * @returns 新创建的节点
   * 
   * @throws Error 如果父节点不存在
   * 
   * @example
   * scheduler.createNode(null, { title: '顶级任务' });
   * scheduler.createNode('parent-id', { title: '子任务', importance: 5 });
   */
  createNode(parentId: string | null, data?: CreateNodeData): ScheduleNode {
    // 确定实际的父节点：
    // - 如果 parentId 为 null，则父节点为根节点
    // - 如果 parentId 不为 null，则验证父节点存在
    const actualParentId = parentId === null ? this.ROOT_ID : parentId;
    
    // 验证父节点存在
    const parent = this.nodes.get(actualParentId);
    if (!parent) {
      throw new Error(`Parent node "${actualParentId}" not found`);
    }
    
    // 获取同级节点以计算 order
    const siblings = this.getChildren(actualParentId);
    
    // 生成节点 ID
    const id = generateUUID();
    
    // 构建节点数据
    const now = new Date().toISOString();
    const node: ScheduleNode = {
      id,
      parentId: actualParentId,
      title: data?.title ?? '新节点',
      description: data?.description ?? '',
      importance: data?.importance ?? (3 as ImportanceLevel),
      dueDate: data?.dueDate ?? null,
      tags: data?.tags ?? [],
      collapsed: false,
      order: siblings.length, // 新节点添加到末尾
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    
    // 存储节点
    this.nodes.set(id, node);
    
    // 更新父子索引
    if (!this.childrenIndex.has(actualParentId)) {
      this.childrenIndex.set(actualParentId, new Set());
    }
    this.childrenIndex.get(actualParentId)!.add(id);
    
    // 发布事件
    this.eventBus.emit('node:created', node);
    
    return node;
  }
  
  // ============================================================================
  // 读取操作
  // ============================================================================
  
  /**
   * 获取根节点
   * 
   * @returns 根节点
   */
  getRootNode(): ScheduleNode {
    return this.nodes.get(this.ROOT_ID)!;
  }
  
  /**
   * 根据 ID 获取节点
   * 
   * @param id - 节点 ID
   * @returns 节点或 null
   */
  getNodeById(id: string): ScheduleNode | null {
    return this.nodes.get(id) ?? null;
  }
  
  /**
   * 获取所有节点
   * 
   * @returns 节点数组
   */
  getAllNodes(): ScheduleNode[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * 获取指定父节点的直接子节点
   * 
   * @param parentId - 父节点 ID（可以是 'root' 或其他节点 ID）
   * @returns 子节点数组（已按 order 排序）
   */
  getChildren(parentId: string): ScheduleNode[] {
    const childIds = this.childrenIndex.get(parentId);
    
    if (!childIds || childIds.size === 0) {
      return [];
    }
    
    // 转换为节点数组并排序
    return Array.from(childIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is ScheduleNode => node !== undefined)
      .sort((a, b) => a.order - b.order);
  }
  
  /**
   * 获取从指定节点到根节点的路径
   * 
   * @param id - 节点 ID
   * @returns 路径数组（从根节点到指定节点）
   */
  getNodePath(id: string): ScheduleNode[] {
    const path: ScheduleNode[] = [];
    let current = this.nodes.get(id);
    
    // 向上遍历直到根节点
    while (current) {
      path.unshift(current);
      
      // 到达根节点则停止
      if (current.id === this.ROOT_ID) {
        break;
      }
      
      current = current.parentId ? this.nodes.get(current.parentId) : undefined;
    }
    
    return path;
  }
  
  /**
   * 获取指定节点的所有后代节点（递归）
   * 
   * @param id - 起始节点 ID
   * @returns 所有后代节点数组
   */
  getDescendants(id: string): ScheduleNode[] {
    const descendants: ScheduleNode[] = [];
    
    const collectDescendants = (nodeId: string) => {
      const children = this.getChildren(nodeId);
      
      for (const child of children) {
        descendants.push(child);
        collectDescendants(child.id);
      }
    };
    
    collectDescendants(id);
    return descendants;
  }
  
  // ============================================================================
  // 更新操作
  // ============================================================================
  
  /**
   * 更新节点属性
   * 
   * @param id - 节点 ID
   * @param data - 更新数据
   * @returns 更新后的节点
   * 
   * @throws Error 如果节点不存在
   * 
   * @example
   * scheduler.updateNode('node-id', { 
   *   title: '新标题',
   *   importance: 5,
   *   completed: true
   * });
   */
  updateNode(id: string, data: UpdateNodeData): ScheduleNode {
    // 根节点只能修改部分属性
    if (id === this.ROOT_ID) {
      // 禁止修改根节点的 parentId, order
      const { parentId: _, order: __, ...allowedData } = data;
      const node = this.nodes.get(id)!;
      const updated: ScheduleNode = {
        ...node,
        ...allowedData,
        updatedAt: new Date().toISOString(),
      };
      this.nodes.set(id, updated);
      this.eventBus.emit('node:updated', updated);
      return updated;
    }
    
    const node = this.nodes.get(id);
    
    if (!node) {
      throw new Error(`Node "${id}" not found`);
    }
    
    // 构建更新后的节点
    const updated: ScheduleNode = {
      ...node,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    // 存储更新
    this.nodes.set(id, updated);
    
    // 发布事件
    this.eventBus.emit('node:updated', updated);
    
    return updated;
  }
  
  /**
   * 移动节点到新的父节点和位置
   * 
   * @param id - 要移动的节点 ID
   * @param newParentId - 新父节点 ID，null 表示移动到根节点下
   * @param order - 在新父节点下的位置（可选，默认添加到末尾）
   * 
   * @throws Error 如果节点不存在、目标父节点不存在或产生循环引用
   * 
   * @example
   * // 将节点移动到另一个节点下
   * scheduler.moveNode('node-id', 'new-parent-id', 0);
   * 
   * // 将节点移动到根节点下
   * scheduler.moveNode('node-id', null);
   */
  moveNode(id: string, newParentId: string | null, order?: number): void {
    // 不允许移动根节点
    if (id === this.ROOT_ID) {
      throw new Error('Cannot move root node');
    }
    
    const node = this.nodes.get(id);
    
    if (!node) {
      throw new Error(`Node "${id}" not found`);
    }
    
    // 确定实际目标父节点
    const actualNewParentId = newParentId === null ? this.ROOT_ID : newParentId;
    
    // 验证新父节点存在
    const newParent = this.nodes.get(actualNewParentId);
    if (!newParent) {
      throw new Error(`Target parent node "${actualNewParentId}" not found`);
    }
    
    // 循环引用检测：不能将节点移动到自己的后代下
    if (this.isDescendant(actualNewParentId, id)) {
      throw new Error('Cannot move node to its own descendant');
    }
    
    // 记录旧位置（用于事件）
    const oldParentId = node.parentId;
    const oldOrder = node.order;
    
    // 如果目标父节点与当前父节点相同，只是调整顺序
    if (node.parentId === actualNewParentId) {
      // 只需更新 order
      const siblings = this.getChildren(actualNewParentId);
      const actualOrder = order ?? siblings.length;
      
      // 重新计算兄弟节点的 order
      this.reorderSiblings(siblings, id, actualOrder);
      
      return;
    }
    
    // 从旧父节点的索引中移除
    const oldParentChildren = this.childrenIndex.get(node.parentId!);
    if (oldParentChildren) {
      oldParentChildren.delete(id);
    }
    
    // 添加到新父节点的索引
    if (!this.childrenIndex.has(actualNewParentId)) {
      this.childrenIndex.set(actualNewParentId, new Set());
    }
    this.childrenIndex.get(actualNewParentId)!.add(id);
    
    // 计算新位置
    const newSiblings = this.getChildren(actualNewParentId);
    const actualOrder = order ?? newSiblings.length;
    
    // 更新节点
    const updated: ScheduleNode = {
      ...node,
      parentId: actualNewParentId,
      order: actualOrder,
      updatedAt: new Date().toISOString(),
    };
    
    this.nodes.set(id, updated);
    
    // 重新排序新父节点下的兄弟节点
    this.reorderSiblings(newSiblings, id, actualOrder);
    
    // 发布移动事件
    this.eventBus.emit('node:moved', {
      id,
      oldParentId,
      newParentId: actualNewParentId,
      oldOrder,
      newOrder: actualOrder,
    });
  }
  
  /**
   * 切换节点折叠状态
   * 
   * @param id - 节点 ID
   */
  toggleCollapse(id: string): void {
    const node = this.nodes.get(id);
    
    if (!node) {
      return;
    }
    
    const collapsed = !node.collapsed;
    this.updateNode(id, { collapsed } as UpdateNodeData);
    
    // 发布折叠/展开事件
    if (collapsed) {
      this.eventBus.emit('node:collapsed', { id });
    } else {
      this.eventBus.emit('node:expanded', { id });
    }
  }
  
  /**
   * 切换节点完成状态
   * 
   * @param id - 节点 ID
   */
  toggleComplete(id: string): void {
    const node = this.nodes.get(id);
    
    if (!node) {
      return;
    }
    
    const completed = !node.completed;
    this.updateNode(id, { completed } as UpdateNodeData);
    
    // 发布完成/取消完成事件
    if (completed) {
      this.eventBus.emit('node:completed', { id });
    } else {
      this.eventBus.emit('node:uncompleted', { id });
    }
  }
  
  // ============================================================================
  // 删除操作
  // ============================================================================
  
  /**
   * 删除节点及其所有后代
   * 
   * @param id - 节点 ID
   * 
   * @throws Error 如果节点是根节点
   * 
   * @example
   * scheduler.deleteNode('node-id');
   */
  deleteNode(id: string): void {
    // 不允许删除根节点
    if (id === this.ROOT_ID) {
      throw new Error('Cannot delete root node');
    }
    
    const node = this.nodes.get(id);
    
    if (!node) {
      return;
    }
    
    // 递归删除所有后代（后序遍历，先删子后删父）
    const deleteRecursive = (nodeId: string) => {
      const children = this.getChildren(nodeId);
      
      // 先删除所有子节点
      for (const child of children) {
        deleteRecursive(child.id);
      }
      
      // 从存储中移除
      this.nodes.delete(nodeId);
      
      // 从父子索引中移除
      const parent = this.nodes.get(nodeId);
      if (parent?.parentId) {
        const parentChildren = this.childrenIndex.get(parent.parentId);
        if (parentChildren) {
          parentChildren.delete(nodeId);
        }
      }
    };
    
    // 从父节点的索引中移除
    if (node.parentId) {
      const parentChildren = this.childrenIndex.get(node.parentId);
      if (parentChildren) {
        parentChildren.delete(id);
      }
    }
    
    // 执行递归删除
    deleteRecursive(id);
    
    // 发布删除事件
    this.eventBus.emit('node:deleted', { id });
    
    // 发布树结构变更事件
    this.eventBus.emit('tree:reordered', undefined);
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 检查指定节点是否是另一个节点的后代
   * 
   * @param potentialDescendantId - 可能的后代节点 ID
   * @param ancestorId - 祖先节点 ID
   * @returns 是否是后代
   */
  private isDescendant(potentialDescendantId: string, ancestorId: string): boolean {
    let current = this.nodes.get(potentialDescendantId);
    
    while (current) {
      if (current.parentId === ancestorId) {
        return true;
      }
      
      current = current.parentId ? this.nodes.get(current.parentId) : undefined;
    }
    
    return false;
  }
  
  /**
   * 重新排序兄弟节点
   * 
   * @param siblings - 兄弟节点数组
   * @param targetId - 目标节点 ID
   * @param targetOrder - 目标位置
   */
  private reorderSiblings(siblings: ScheduleNode[], targetId: string, targetOrder: number): void {
    // 过滤掉目标节点（它有特殊的 order）
    const otherSiblings = siblings.filter(s => s.id !== targetId);
    
    // 按 order 排序
    otherSiblings.sort((a, b) => a.order - b.order);
    
    // 重新分配 order
    let currentOrder = 0;
    
    for (const sibling of otherSiblings) {
      // 为目标位置留空
      if (currentOrder === targetOrder) {
        currentOrder++;
      }
      
      // 更新节点 order
      if (sibling.order !== currentOrder) {
        const updated: ScheduleNode = {
          ...sibling,
          order: currentOrder,
          updatedAt: new Date().toISOString(),
        };
        this.nodes.set(sibling.id, updated);
      }
      
      currentOrder++;
    }
    
    // 更新目标节点的 order
    const target = this.nodes.get(targetId);
    if (target && target.order !== targetOrder) {
      const updated: ScheduleNode = {
        ...target,
        order: targetOrder,
        updatedAt: new Date().toISOString(),
      };
      this.nodes.set(targetId, updated);
      this.eventBus.emit('node:updated', updated);
    }
  }
  
  // ============================================================================
  // 批量操作
  // ============================================================================
  
  /**
   * 批量导入节点
   * 
   * @param nodes - 节点数组
   */
  importNodes(nodes: ScheduleNode[]): void {
    // 清空现有数据（保留根节点）
    this.nodes.clear();
    this.childrenIndex.clear();
    
    // 重新初始化根节点
    this.initializeRootNode();
    
    // 导入节点
    for (const node of nodes) {
      // 跳过根节点（使用初始化的根节点）
      if (node.id === this.ROOT_ID) {
        continue;
      }
      
      this.nodes.set(node.id, { ...node });
      
      // 建立索引
      const parentId = node.parentId ?? this.ROOT_ID;
      if (!this.childrenIndex.has(parentId)) {
        this.childrenIndex.set(parentId, new Set());
      }
      this.childrenIndex.get(parentId)!.add(node.id);
    }
    
    // 发布加载完成事件
    this.eventBus.emit('tree:loaded', this.getAllNodes());
  }
  
  /**
   * 导出所有节点
   * 
   * @returns 节点数组的深拷贝
   */
  exportNodes(): ScheduleNode[] {
    return this.getAllNodes().map(node => ({ ...node }));
  }
}
