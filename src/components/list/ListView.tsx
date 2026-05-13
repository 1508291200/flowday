/**
 * ListView 列表视图组件
 * 
 * 使用虚拟列表渲染大量节点数据
 * 支持节点折叠功能，已完成节点集合到折叠区域
 */

import { useCallback, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clsx } from 'clsx';
import { useSchedulerStore } from '../../stores/schedulerStore';
import { useEventBus } from '../../hooks/useEventBus';
import { ListToolbar } from './ListToolbar';
import { ListItem } from './ListItem';
import type { FlattenedNode, ScheduleNode } from '../../core/types';

// 扩展 FlattenedNode 类型以支持已完成区域标题
interface DisplayItem extends FlattenedNode {
  _type?: 'completed-header';
}

export function ListView() {
  const schedulerManager = useSchedulerStore((s) => s.schedulerManager);
  const tagManager = useSchedulerStore((s) => s.tagManager);
  const nodes = useSchedulerStore((s) => s.nodes);
  const canUndo = useSchedulerStore((s) => s.canUndo);
  const canRedo = useSchedulerStore((s) => s.canRedo);
  const createNode = useSchedulerStore((s) => s.createNode);
  const toggleComplete = useSchedulerStore((s) => s.toggleComplete);
  const deleteNode = useSchedulerStore((s) => s.deleteNode);
  const undo = useSchedulerStore((s) => s.undo);
  const redo = useSchedulerStore((s) => s.redo);
  
  // 本地折叠状态（独立于节点数据）
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // 已完成节点折叠状态
  const [showCompleted, setShowCompleted] = useState(false);
  
  // 选中的节点
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取某节点的所有子孙节点ID（用于折叠时排除）
  const getDescendantIds = useCallback((nodeId: string, allNodes: ScheduleNode[]): Set<string> => {
    const descendants = new Set<string>();
    const collect = (parentId: string) => {
      for (const node of allNodes) {
        if (node.parentId === parentId) {
          descendants.add(node.id);
          collect(node.id);
        }
      }
    };
    collect(nodeId);
    return descendants;
  }, []);

  // 将树结构扁平化，分离活跃节点和已完成节点
  const { activeNodes, completedNodes } = useMemo(() => {
    const allNodes = schedulerManager.getAllNodes();
    const activeResult: FlattenedNode[] = [];
    const completedResult: FlattenedNode[] = [];
    
    // 预先计算所有被折叠节点的子孙ID
    const excludedIds = new Set<string>();
    for (const collapsedId of collapsedIds) {
      const descendants = getDescendantIds(collapsedId, allNodes);
      descendants.forEach(id => excludedIds.add(id));
    }
    
    // 收集所有已完成节点的ID（包括其子孙），它们不在原位置显示
    const completedIds = new Set<string>();
    for (const node of allNodes) {
      if (node.completed && node.parentId !== null) {
        completedIds.add(node.id);
        const descendants = getDescendantIds(node.id, allNodes);
        descendants.forEach(id => completedIds.add(id));
      }
    }
    
    const traverse = (parentId: string | null, depth: number) => {
      const children = allNodes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      
      for (const node of children) {
        // 如果节点在排除列表中（是某个折叠节点的子孙），跳过
        if (excludedIds.has(node.id)) {
          continue;
        }
        
        // 已完成节点不在原位置显示
        if (completedIds.has(node.id)) {
          continue;
        }
        
        const isCollapsed = collapsedIds.has(node.id);
        const hasChildren = allNodes.some(n => n.parentId === node.id);
        
        activeResult.push({
          id: node.id,
          node,
          depth,
          isExpanded: !isCollapsed,
          hasChildren,
          isVisible: true,
          parentPath: [],
          indent: depth * 24,
          isLastChild: false,
          hasVisibleChildren: hasChildren && !isCollapsed,
        });
        
        if (!isCollapsed) {
          traverse(node.id, depth + 1);
        }
      }
    };
    
    traverse(null, 0);
    
    // 收集所有已完成节点（扁平化，用于已完成区域）
    for (const node of allNodes) {
      if (node.completed && node.parentId !== null) {
        completedResult.push({
          id: node.id,
          node,
          depth: 0,
          isExpanded: true,
          hasChildren: allNodes.some(n => n.parentId === node.id),
          isVisible: true,
          parentPath: [],
          indent: 0,
          isLastChild: false,
          hasVisibleChildren: false,
        });
      }
    }
    
    return { activeNodes: activeResult, completedNodes: completedResult };
  }, [nodes, collapsedIds, schedulerManager, getDescendantIds]);

  // 合并活跃节点和已完成区域（用于虚拟列表渲染）
  const displayItems = useMemo(() => {
    const items: DisplayItem[] = [...activeNodes];
    if (completedNodes.length > 0) {
      // 添加已完成区域分隔标题
      items.push({
        id: 'completed-header',
        node: null as any,
        depth: 0,
        isExpanded: showCompleted,
        hasChildren: false,
        isVisible: true,
        parentPath: [],
        indent: 0,
        isLastChild: false,
        hasVisibleChildren: false,
        _type: 'completed-header',
      });
      if (showCompleted) {
        items.push(...completedNodes);
      }
    }
    return items;
  }, [activeNodes, completedNodes, showCompleted]);

  // 虚拟列表配置
  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => {
      if (displayItems[index]?._type === 'completed-header') return 36;
      return 40;
    },
    overscan: 10,
  });

  // 监听数据变化，重置折叠状态
  useEventBus('tree:loaded', () => {
    setCollapsedIds(new Set());
  });

  // 添加根节点
  const handleAddRoot = useCallback(() => {
    createNode(null, { title: '新日程' });
  }, [createNode]);

  // 全部展开
  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  // 全部折叠
  const handleCollapseAll = useCallback(() => {
    const allNodes = schedulerManager.getAllNodes();
    const newCollapsed = new Set<string>();
    allNodes.forEach(node => {
      if (node.parentId !== null) {
        newCollapsed.add(node.id);
      }
    });
    setCollapsedIds(newCollapsed);
  }, [schedulerManager]);

  // 切换折叠状态
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 切换完成状态
  const handleToggleComplete = useCallback((id: string) => {
    toggleComplete(id);
  }, [toggleComplete]);

  // 添加子节点
  const handleAddChild = useCallback((parentId: string) => {
    createNode(parentId, { title: '新子日程' });
  }, [createNode]);

  // 编辑节点
  const handleEdit = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // 删除节点
  const handleDelete = useCallback((id: string) => {
    if (window.confirm('确定要删除这个日程及其所有子日程吗？')) {
      deleteNode(id);
    }
  }, [deleteNode]);

  // 获取所有标签
  const allTags = useMemo(() => tagManager.getAllTags(), [tagManager]);

  return (
    <div className="w-full h-full flex flex-col">
      <ListToolbar
        onAddRoot={handleAddRoot}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
      >
        {activeNodes.length === 0 && completedNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            暂无日程，点击上方"添加日程"按钮开始
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map(virtualRow => {
              const item = displayItems[virtualRow.index];
              
              // 已完成区域标题
              if (item._type === 'completed-header') {
                return (
                  <div
                    key="completed-header"
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="flex items-center gap-2 px-3 h-9 bg-gray-100 border-t border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    <svg
                      className={clsx('w-4 h-4 text-gray-500 transition-transform', showCompleted ? 'rotate-90' : '')}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600">
                      已完成 ({completedNodes.length})
                    </span>
                  </div>
                );
              }
              
              return (
                <div
                  key={item.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={clsx('group', item.node?.completed && 'bg-green-50/50')}
                >
                  <ListItem
                    item={item}
                    tags={allTags}
                    onToggleCollapse={handleToggleCollapse}
                    onToggleComplete={handleToggleComplete}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selected={selectedId === item.id}
                    onSelect={setSelectedId}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}