/**
 * CommandProcessor 命令处理器
 * 
 * 核心职责：
 * 1. 统一处理所有数据操作命令
 * 2. 支持撤销/重做功能
 * 3. 维护操作历史栈
 * 4. 通过 EventBus 发布命令执行事件
 * 
 * 设计模式：命令模式 (Command Pattern)
 * - 将操作封装为对象
 * - 支持操作的撤销和重做
 * - 解耦操作发起者和执行者
 */

import type {
  Command,
  CreateNodeCommand,
  UpdateNodeCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  ToggleCollapseCommand,
  ToggleCompleteCommand,
  CreateTagCommand,
  UpdateTagCommand,
  DeleteTagCommand,
  ICommandProcessor,
  IEventBus,
  ISchedulerManager,
  ITagManager,
  ScheduleNode,
  Tag,
} from './types';
import { generateUUID } from './uuid';

/**
 * 命令处理器实现
 * 
 * 使用示例：
 * ```typescript
 * const processor = new CommandProcessor(eventBus, schedulerManager, tagManager);
 * 
 * // 执行命令
 * const command = processor.createCreateNodeCommand(parentId, data);
 * processor.execute(command);
 * 
 * // 撤销
 * processor.undo();
 * 
 * // 重做
 * processor.redo();
 * ```
 */
export class CommandProcessor implements ICommandProcessor {
  /** 撤销栈（已执行的命令） */
  private undoStack: Command[] = [];
  
  /** 重做栈（已撤销的命令） */
  private redoStack: Command[] = [];
  
  /** 历史栈最大长度 */
  private maxHistory: number;
  
  /** 事件总线 */
  private eventBus: IEventBus;
  
  /** 日程管理器 */
  private schedulerManager: ISchedulerManager;
  
  /** 标签管理器 */
  private tagManager?: ITagManager;
  
  /**
   * 创建命令处理器
   * 
   * @param eventBus - 事件总线
   * @param schedulerManager - 日程管理器
   * @param tagManager - 标签管理器（可选）
   * @param maxHistory - 最大历史记录数
   */
  constructor(
    eventBus: IEventBus,
    schedulerManager: ISchedulerManager,
    tagManager?: ITagManager,
    maxHistory: number = 50
  ) {
    this.eventBus = eventBus;
    this.schedulerManager = schedulerManager;
    this.tagManager = tagManager;
    this.maxHistory = maxHistory;
  }
  
  // ============================================================================
  // 命令执行
  // ============================================================================
  
  /**
   * 执行命令
   * 
   * 将命令加入撤销栈，并清空重做栈
   * 
   * @param command - 要执行的命令
   */
  execute(command: Command): void {
    // 执行命令
    this.executeCommand(command);
    
    // 加入撤销栈
    this.undoStack.push(command);
    
    // 限制栈大小
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
    // 清空重做栈（执行新命令后，之前的重做历史失效）
    this.redoStack = [];
    
    // 发布历史变更事件
    this.emitHistoryChange();
  }
  
  /**
   * 内部执行命令方法
   */
  private executeCommand(command: Command): void {
    switch (command.type) {
      case 'CREATE_NODE':
        this.schedulerManager.createNode(
          command.payload.parentId,
          command.payload.data
        );
        break;
        
      case 'UPDATE_NODE':
        this.schedulerManager.updateNode(
          command.payload.id,
          command.payload.data
        );
        break;
        
      case 'DELETE_NODE':
        this.schedulerManager.deleteNode(command.payload.id);
        break;
        
      case 'MOVE_NODE':
        this.schedulerManager.moveNode(
          command.payload.id,
          command.payload.newParentId,
          command.payload.newOrder
        );
        break;
        
      case 'TOGGLE_COLLAPSE':
        this.schedulerManager.toggleCollapse(command.payload.id);
        break;
        
      case 'TOGGLE_COMPLETE':
        this.schedulerManager.toggleComplete(command.payload.id);
        break;
        
      case 'CREATE_TAG':
        if (this.tagManager) {
          this.tagManager.createTag(
            command.payload.name,
            command.payload.color
          );
        }
        break;
        
      case 'UPDATE_TAG':
        if (this.tagManager) {
          this.tagManager.updateTag(
            command.payload.id,
            command.payload.data
          );
        }
        break;
        
      case 'DELETE_TAG':
        if (this.tagManager) {
          this.tagManager.deleteTag(command.payload.id);
        }
        break;
    }
  }
  
  // ============================================================================
  // 撤销/重做
  // ============================================================================
  
  /**
   * 撤销上一个操作
   * 
   * @returns 是否成功撤销
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    
    if (!command) {
      return false;
    }
    
    // 执行反向操作
    this.undoCommand(command);
    
    // 加入重做栈
    this.redoStack.push(command);
    
    // 发布历史变更事件
    this.emitHistoryChange();
    
    return true;
  }
  
  /**
   * 执行命令的反向操作
   */
  private undoCommand(command: Command): void {
    switch (command.type) {
      case 'CREATE_NODE':
        // 创建的反向是删除
        this.schedulerManager.deleteNode(command.nodeId);
        break;
        
      case 'UPDATE_NODE': {
        // 更新的反向是恢复原值
        const backup = command.payload.backupData;
        if (backup) {
          this.schedulerManager.updateNode(command.payload.id, backup);
        }
        break;
      }
        
      case 'DELETE_NODE': {
        // 删除的反向是恢复节点及其子节点
        const { backupData, childBackup } = command.payload;
        if (backupData) {
          // 先恢复父节点
          this.restoreNode(backupData);
          // 再恢复子节点
          if (childBackup) {
            childBackup.forEach(child => this.restoreNode(child));
          }
        }
        break;
      }
        
      case 'MOVE_NODE': {
        // 移动的反向是移回原位置
        const { id, oldParentId, oldOrder } = command.payload;
        this.schedulerManager.moveNode(id, oldParentId ?? null, oldOrder ?? 0);
        break;
      }
        
      case 'TOGGLE_COLLAPSE':
        // 切换的反向是再次切换
        this.schedulerManager.toggleCollapse(command.payload.id);
        break;
        
      case 'TOGGLE_COMPLETE':
        this.schedulerManager.toggleComplete(command.payload.id);
        break;
        
      case 'CREATE_TAG':
        // 创建的反向是删除
        if (this.tagManager && command.nodeId) {
          this.tagManager.deleteTag(command.nodeId);
        }
        break;
        
      case 'UPDATE_TAG': {
        // 更新的反向是恢复原值
        if (this.tagManager && command.payload.backupData) {
          this.tagManager.updateTag(command.payload.id, command.payload.backupData);
        }
        break;
      }
        
      case 'DELETE_TAG': {
        // 删除的反向是恢复
        if (this.tagManager && command.payload.backupData) {
          this.restoreTag(command.payload.backupData);
        }
        break;
      }
    }
  }
  
  /**
   * 重做上一个撤销的操作
   * 
   * @returns 是否成功重做
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    
    if (!command) {
      return false;
    }
    
    // 重新执行命令
    this.executeCommand(command);
    
    // 加回撤销栈
    this.undoStack.push(command);
    
    // 发布历史变更事件
    this.emitHistoryChange();
    
    return true;
  }
  
  /**
   * 检查是否可撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * 检查是否可重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  // ============================================================================
  // 历史记录管理
  // ============================================================================
  
  /**
   * 获取撤销栈
   */
  getUndoStack(): Command[] {
    return [...this.undoStack];
  }
  
  /**
   * 获取重做栈
   */
  getRedoStack(): Command[] {
    return [...this.redoStack];
  }
  
  /**
   * 清除所有历史记录
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitHistoryChange();
  }
  
  /**
   * 发布历史变更事件
   */
  private emitHistoryChange(): void {
    this.eventBus.emit('history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
  
  // ============================================================================
  // 命令工厂方法
  // ============================================================================
  
  /**
   * 创建节点命令
   */
  createCreateNodeCommand(
    parentId: string | null,
    data: any
  ): CreateNodeCommand {
    return {
      id: generateUUID(),
      type: 'CREATE_NODE',
      timestamp: Date.now(),
      nodeId: generateUUID(), // 预生成节点 ID
      payload: {
        parentId,
        data,
      },
    };
  }
  
  /**
   * 更新节点命令
   */
  createUpdateNodeCommand(
    id: string,
    data: any
  ): UpdateNodeCommand {
    // 备份原始数据用于撤销
    const node = this.schedulerManager.getNodeById(id);
    const backupData = node ? { ...node } : undefined;
    
    return {
      id: generateUUID(),
      type: 'UPDATE_NODE',
      timestamp: Date.now(),
      payload: {
        id,
        data,
        backupData,
      },
    };
  }
  
  /**
   * 删除节点命令
   */
  createDeleteNodeCommand(id: string): DeleteNodeCommand {
    // 备份节点及其子节点用于撤销
    const node = this.schedulerManager.getNodeById(id);
    const backupData = node ? { ...node } : undefined;
    const childBackup = node 
      ? this.schedulerManager.getDescendants(id).map(c => ({ ...c }))
      : [];
    
    return {
      id: generateUUID(),
      type: 'DELETE_NODE',
      timestamp: Date.now(),
      payload: {
        id,
        backupData,
        childBackup,
      },
    };
  }
  
  /**
   * 移动节点命令
   */
  createMoveNodeCommand(
    id: string,
    newParentId: string | null,
    newOrder: number
  ): MoveNodeCommand {
    // 记录原位置用于撤销
    const node = this.schedulerManager.getNodeById(id);
    const oldParentId = node?.parentId ?? null;
    const oldOrder = node?.order ?? 0;
    
    return {
      id: generateUUID(),
      type: 'MOVE_NODE',
      timestamp: Date.now(),
      payload: {
        id,
        newParentId,
        newOrder,
        oldParentId,
        oldOrder,
      },
    };
  }
  
  /**
   * 切换折叠状态命令
   */
  createToggleCollapseCommand(id: string): ToggleCollapseCommand {
    return {
      id: generateUUID(),
      type: 'TOGGLE_COLLAPSE',
      timestamp: Date.now(),
      payload: { id },
    };
  }
  
  /**
   * 切换完成状态命令
   */
  createToggleCompleteCommand(id: string): ToggleCompleteCommand {
    return {
      id: generateUUID(),
      type: 'TOGGLE_COMPLETE',
      timestamp: Date.now(),
      payload: { id },
    };
  }
  
  /**
   * 创建标签命令
   */
  createCreateTagCommand(name: string, color: string): CreateTagCommand {
    return {
      id: generateUUID(),
      type: 'CREATE_TAG',
      timestamp: Date.now(),
      nodeId: generateUUID(),
      payload: { name, color },
    };
  }
  
  /**
   * 更新标签命令
   */
  createUpdateTagCommand(id: string, data: any): UpdateTagCommand {
    // 备份原始数据
    const tag = this.tagManager?.getTagById(id);
    const backupData = tag ? { ...tag } : undefined;
    
    return {
      id: generateUUID(),
      type: 'UPDATE_TAG',
      timestamp: Date.now(),
      payload: { id, data, backupData },
    };
  }
  
  /**
   * 删除标签命令
   */
  createDeleteTagCommand(id: string): DeleteTagCommand {
    // 备份标签数据
    const backupData = this.tagManager?.getTagById(id) ?? undefined;
    const affectedNodeIds = this.tagManager?.getNodesByTag(id) ?? [];
    
    return {
      id: generateUUID(),
      type: 'DELETE_TAG',
      timestamp: Date.now(),
      payload: { id, backupData, affectedNodeIds },
    };
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  /**
   * 恢复节点（用于撤销删除）
   */
  private restoreNode(node: ScheduleNode): void {
    // 使用 import 方法直接写入存储
    // 这里简化实现，实际应该通过 SchedulerManager 的内部方法
    this.schedulerManager.importNodes([node]);
  }
  
  /**
   * 恢复标签（用于撤销删除）
   */
  private restoreTag(tag: Tag): void {
    if (this.tagManager) {
      this.tagManager.importTags([tag]);
    }
  }
}
