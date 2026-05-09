/**
 * Scheduler Store 日程状态管理
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ScheduleNode,
  Tag,
  CreateNodeData,
  UpdateNodeData,
  IEventBus,
} from '../core/types';
import { EventBus } from '../core/EventBus';
import { SchedulerManager } from '../core/SchedulerManager';
import { TagManager } from '../core/TagManager';
import { CommandProcessor } from '../core/CommandProcessor';
import { Storage } from '../storage/Storage';
import { StorageService, type SaveStatus } from '../services/StorageService';

interface SchedulerState {
  // 核心实例
  eventBus: IEventBus;
  schedulerManager: SchedulerManager;
  tagManager: TagManager;
  commandProcessor: CommandProcessor;
  storage: Storage;
  storageService: StorageService | null;
  
  // 派生状态
  nodes: ScheduleNode[];
  tags: Tag[];
  selectedNodeIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  
  // 保存状态
  saveStatus: SaveStatus;
  
  // 初始化状态
  initialized: boolean;
  
  // 初始化
  initialize: () => Promise<void>;
  
  // 保存
  save: () => Promise<void>;
  saveStatusChange: (status: SaveStatus) => void;
  
  // 导入导出
  exportData: (options?: { encrypt?: boolean; password?: string }) => Promise<void>;
  importData: () => Promise<{ success: boolean; errors: string[] }>;
  
  // 日程操作
  createNode: (parentId: string | null, data?: CreateNodeData) => void;
  updateNode: (id: string, data: UpdateNodeData) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, newParentId: string | null, order: number) => void;
  toggleCollapse: (id: string) => void;
  toggleComplete: (id: string) => void;
  
  // 标签操作
  createTag: (name: string, color?: string) => void;
  updateTag: (id: string, data: { name?: string; color?: string }) => void;
  deleteTag: (id: string) => void;
  
  // 选择操作
  selectNode: (id: string) => void;
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  
  // 撤销/重做
  undo: () => void;
  redo: () => void;
  
  // 刷新状态
  refreshNodes: () => void;
  refreshTags: () => void;
}

/**
 * 创建 Scheduler Store
 */
export const useSchedulerStore = create<SchedulerState>()(
  subscribeWithSelector((set, get) => {
    // 创建核心实例
    const eventBus = new EventBus({ debug: false });
    const schedulerManager = new SchedulerManager(eventBus);
    const tagManager = new TagManager(eventBus);
    const storage = new Storage();
    const commandProcessor = new CommandProcessor(
      eventBus,
      schedulerManager,
      tagManager,
      50
    );
    
    // 订阅事件，更新派生状态
    eventBus.on('node:created', () => {
      set({ nodes: schedulerManager.getAllNodes() });
    });
    
    eventBus.on('node:updated', () => {
      set({ nodes: schedulerManager.getAllNodes() });
    });
    
    eventBus.on('node:deleted', () => {
      set({ nodes: schedulerManager.getAllNodes() });
    });
    
    eventBus.on('node:moved', () => {
      set({ nodes: schedulerManager.getAllNodes() });
    });
    
    eventBus.on('tag:created', () => {
      set({ tags: tagManager.getAllTags() });
    });
    
    eventBus.on('tag:updated', () => {
      set({ tags: tagManager.getAllTags() });
    });
    
    eventBus.on('tag:deleted', () => {
      set({ tags: tagManager.getAllTags() });
    });
    
    eventBus.on('history:changed', (data: { canUndo: boolean; canRedo: boolean }) => {
      set({
        canUndo: data.canUndo,
        canRedo: data.canRedo,
      });
    });
    
    // 创建存储服务实例的工厂函数
    const createStorageService = () => {
      return new StorageService({
        storage,
        eventBus,
        getNodes: () => get().schedulerManager.getAllNodes(),
        getTags: () => get().tagManager.getAllTags(),
        getPresets: () => [], // 预设暂不实现
        getSettings: () => ({
          defaultView: 'list',
          theme: 'light',
          showCompletedNodes: true,
          undoHistoryLimit: 50,
          mindMapSettings: {
            nodeWidth: 180,
            nodeHeight: 40,
            horizontalGap: 60,
            verticalGap: 20,
            defaultZoom: 1,
            showConnectionLines: true,
            connectionLineStyle: 'bezier'
          },
          listViewSettings: {
            showImportance: true,
            showDueDate: true,
            showTags: true,
            showCheckbox: true,
            defaultIndentSize: 24
          }
        }),
        onImport: (data) => {
          if (data.nodes.length > 0) {
            schedulerManager.importNodes(data.nodes);
          }
          if (data.tags.length > 0) {
            tagManager.importTags(data.tags);
          }
          set({
            nodes: schedulerManager.getAllNodes(),
            tags: tagManager.getAllTags(),
          });
        },
      });
    };
    
    return {
      // 核心实例
      eventBus,
      schedulerManager,
      tagManager,
      commandProcessor,
      storage,
      storageService: null as StorageService | null,
      
      // 初始状态
      nodes: [],
      tags: [],
      selectedNodeIds: [],
      canUndo: false,
      canRedo: false,
      saveStatus: 'idle' as SaveStatus,
      initialized: false,
      
      // 初始化
      initialize: async () => {
        try {
          // 从存储加载数据
          const [nodes, tags] = await Promise.all([
            storage.loadNodes(),
            storage.loadTags(),
          ]);
          
          // 导入数据
          if (nodes.length > 0) {
            schedulerManager.importNodes(nodes);
          }
          if (tags.length > 0) {
            tagManager.importTags(tags);
          }
          
          // 创建并初始化存储服务
          const storageService = createStorageService();
          await storageService.initialize();
          
          // 订阅保存状态变更
          storageService.onStatusChange((status) => {
            set({ saveStatus: status });
          });
          
          // 设置初始状态
          set({
            nodes: schedulerManager.getAllNodes(),
            tags: tagManager.getAllTags(),
            storageService,
            initialized: true,
          });
        } catch (error) {
          console.error('Failed to initialize:', error);
          set({ initialized: true });
        }
      },
      
      // 保存
      save: async () => {
        const state = get();
        if (state.storageService) {
          await state.storageService.save();
        } else {
          await Promise.all([
            state.storage.saveNodes(state.schedulerManager.getAllNodes()),
            state.storage.saveTags(state.tagManager.getAllTags()),
          ]);
        }
      },
      
      // 保存状态变更回调
      saveStatusChange: (status: SaveStatus) => {
        set({ saveStatus: status });
      },
      
      // 导出数据
      exportData: async (options?: { encrypt?: boolean; password?: string }) => {
        const state = get();
        if (state.storageService) {
          await state.storageService.export(options);
        }
      },
      
      // 导入数据
      importData: async () => {
        const state = get();
        if (state.storageService) {
          const result = await state.storageService.import();
          return {
            success: result.success,
            errors: result.errors,
          };
        }
        return {
          success: false,
          errors: ['存储服务未初始化'],
        };
      },
      
      // 日程操作
      createNode: (parentId, data) => {
        const state = get();
        const command = state.commandProcessor.createCreateNodeCommand(parentId, data ?? {});
        state.commandProcessor.execute(command);
      },
      
      updateNode: (id, data) => {
        const state = get();
        const command = state.commandProcessor.createUpdateNodeCommand(id, data);
        state.commandProcessor.execute(command);
      },
      
      deleteNode: (id) => {
        const state = get();
        const command = state.commandProcessor.createDeleteNodeCommand(id);
        state.commandProcessor.execute(command);
      },
      
      moveNode: (id, newParentId, order) => {
        const state = get();
        const command = state.commandProcessor.createMoveNodeCommand(id, newParentId, order);
        state.commandProcessor.execute(command);
      },
      
      toggleCollapse: (id) => {
        const state = get();
        const command = state.commandProcessor.createToggleCollapseCommand(id);
        state.commandProcessor.execute(command);
      },
      
      toggleComplete: (id) => {
        const state = get();
        const command = state.commandProcessor.createToggleCompleteCommand(id);
        state.commandProcessor.execute(command);
      },
      
      // 标签操作
      createTag: (name, color) => {
        const state = get();
        const command = state.commandProcessor.createCreateTagCommand(name, color ?? '#FF6B6B');
        state.commandProcessor.execute(command);
      },
      
      updateTag: (id, data) => {
        const state = get();
        const command = state.commandProcessor.createUpdateTagCommand(id, data);
        state.commandProcessor.execute(command);
      },
      
      deleteTag: (id) => {
        const state = get();
        const command = state.commandProcessor.createDeleteTagCommand(id);
        state.commandProcessor.execute(command);
      },
      
      // 选择操作
      selectNode: (id) => {
        set({ selectedNodeIds: [id] });
      },
      
      selectNodes: (ids) => {
        set({ selectedNodeIds: ids });
      },
      
      clearSelection: () => {
        set({ selectedNodeIds: [] });
      },
      
      // 撤销/重做
      undo: () => {
        get().commandProcessor.undo();
      },
      
      redo: () => {
        get().commandProcessor.redo();
      },
      
      // 刷新状态
      refreshNodes: () => {
        set({ nodes: get().schedulerManager.getAllNodes() });
      },
      
      refreshTags: () => {
        set({ tags: get().tagManager.getAllTags() });
      },
    };
  })
);

// ============================================================================
// 选择器（Selectors）
// ============================================================================

/** 获取根节点 */
export const selectRootNode = (state: SchedulerState) => 
  state.schedulerManager.getRootNode();

/** 获取节点的子节点 */
export const selectChildren = (id: string) => (state: SchedulerState) =>
  state.schedulerManager.getChildren(id);

/** 获取节点路径 */
export const selectNodePath = (id: string) => (state: SchedulerState) =>
  state.schedulerManager.getNodePath(id);

/** 获取选中的节点 */
export const selectSelectedNodes = (state: SchedulerState) =>
  state.selectedNodeIds.map(id => state.schedulerManager.getNodeById(id)).filter(Boolean);

/** 获取标签使用统计 */
export const selectTagStats = (state: SchedulerState) =>
  state.tagManager.getTagUsageStats();
