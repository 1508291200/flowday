/**
 * useScheduler Hook
 * 
 * 封装日程操作的 React Hook
 * 提供简洁的 API 给 UI 层使用
 */

import { useCallback, useMemo } from 'react';
import { useSchedulerStore } from '../stores/schedulerStore';
import type {
  ScheduleNode,
  CreateNodeData,
  UpdateNodeData,
} from '../core/types';

/**
 * 日程操作 Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { nodes, createNode, updateNode, deleteNode } = useScheduler();
 *   
 *   const handleAdd = () => {
 *     createNode(null, { title: '新任务' });
 *   };
 *   
 *   return (
 *     <div>
 *       {nodes.map(node => (
 *         <div key={node.id}>{node.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useScheduler() {
  const store = useSchedulerStore();
  
  // 获取所有节点
  const nodes = useSchedulerStore((s) => s.nodes);
  
  // 获取所有标签
  const tags = useSchedulerStore((s) => s.tags);
  
  // 选择状态
  const selectedNodeIds = useSchedulerStore((s) => s.selectedNodeIds);
  
  // 撤销/重做状态
  const canUndo = useSchedulerStore((s) => s.canUndo);
  const canRedo = useSchedulerStore((s) => s.canRedo);
  
  // 获取根节点
  const rootNode = useSchedulerStore(
    useCallback((s) => s.schedulerManager.getRootNode(), [])
  );
  
  // 操作方法
  const createNode = useCallback(
    (parentId: string | null, data?: CreateNodeData) => {
      store.createNode(parentId, data);
    },
    [store]
  );
  
  const updateNode = useCallback(
    (id: string, data: UpdateNodeData) => {
      store.updateNode(id, data);
    },
    [store]
  );
  
  const deleteNode = useCallback(
    (id: string) => {
      store.deleteNode(id);
    },
    [store]
  );
  
  const moveNode = useCallback(
    (id: string, newParentId: string | null, order: number) => {
      store.moveNode(id, newParentId, order);
    },
    [store]
  );
  
  const toggleCollapse = useCallback(
    (id: string) => {
      store.toggleCollapse(id);
    },
    [store]
  );
  
  const toggleComplete = useCallback(
    (id: string) => {
      store.toggleComplete(id);
    },
    [store]
  );
  
  const selectNode = useCallback(
    (id: string) => {
      store.selectNode(id);
    },
    [store]
  );
  
  const clearSelection = useCallback(() => {
    store.clearSelection();
  }, [store]);
  
  const undo = useCallback(() => {
    store.undo();
  }, [store]);
  
  const redo = useCallback(() => {
    store.redo();
  }, [store]);
  
  const save = useCallback(() => {
    return store.save();
  }, [store]);
  
  // 派生数据
  const getChildren = useCallback(
    (parentId: string): ScheduleNode[] => {
      return useSchedulerStore.getState().schedulerManager.getChildren(parentId);
    },
    []
  );
  
  const getNodeById = useCallback(
    (id: string): ScheduleNode | null => {
      return useSchedulerStore.getState().schedulerManager.getNodeById(id);
    },
    []
  );
  
  const getNodePath = useCallback(
    (id: string): ScheduleNode[] => {
      return useSchedulerStore.getState().schedulerManager.getNodePath(id);
    },
    []
  );
  
  const selectedNodes = useMemo(() => {
    return selectedNodeIds
      .map((id) => getNodeById(id))
      .filter((node): node is ScheduleNode => node !== null);
  }, [selectedNodeIds, getNodeById]);
  
  return {
    // 数据
    nodes,
    tags,
    rootNode,
    selectedNodes,
    selectedNodeIds,
    
    // 状态
    canUndo,
    canRedo,
    
    // 日程操作
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    toggleCollapse,
    toggleComplete,
    
    // 选择操作
    selectNode,
    clearSelection,
    
    // 撤销/重做
    undo,
    redo,
    
    // 查询方法
    getChildren,
    getNodeById,
    getNodePath,
    
    // 持久化
    save,
  };
}
