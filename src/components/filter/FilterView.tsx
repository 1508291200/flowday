/**
 * FilterView 筛选视图组件
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSchedulerStore } from '../../stores/schedulerStore';
import { useEventBus } from '../../hooks/useEventBus';
import { FilterPanel } from './FilterPanel';
import { FilterCard } from './FilterCard';
import { Button } from '../common';
import type { FilterConfig } from '../../core/types';
import { DEFAULT_FILTER_CONFIG } from '../../core/types';

export function FilterView() {
  const schedulerManager = useSchedulerStore((s) => s.schedulerManager);
  const tagManager = useSchedulerStore((s) => s.tagManager);
  const canUndo = useSchedulerStore((s) => s.canUndo);
  const canRedo = useSchedulerStore((s) => s.canRedo);
  const undo = useSchedulerStore((s) => s.undo);
  const redo = useSchedulerStore((s) => s.redo);
  
  // 本地筛选配置（独立于全局 filterStore）
  const [localConfig, setLocalConfig] = useState<FilterConfig>(DEFAULT_FILTER_CONFIG);
  
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取所有节点并执行筛选
  const filteredNodes = useMemo(() => {
    const allNodes = schedulerManager.getAllNodes();
    // 排除根节点
    const nodesToFilter = allNodes.filter(n => n.parentId !== null);
    
    // 使用 FilterEngine 逻辑
    let result = [...nodesToFilter];
    
    // 1. 搜索关键字
    if (localConfig.searchKeyword) {
      const keyword = localConfig.searchKeyword.toLowerCase();
      result = result.filter(
        n => n.title.toLowerCase().includes(keyword) ||
             n.description.toLowerCase().includes(keyword)
      );
    }
    
    // 2. 重要度范围
    if (localConfig.importanceRange) {
      const [min, max] = localConfig.importanceRange;
      result = result.filter(n => n.importance >= min && n.importance <= max);
    }
    
    // 3. 完成状态
    if (localConfig.completed !== undefined) {
      result = result.filter(n => n.completed === localConfig.completed);
    }
    
    // 4. 标签筛选
    if (localConfig.tags && localConfig.tags.ids.length > 0) {
      const { ids, mode } = localConfig.tags;
      if (mode === 'AND') {
        result = result.filter(n => ids.every(id => n.tags.includes(id)));
      } else {
        result = result.filter(n => ids.some(id => n.tags.includes(id)));
      }
    }
    
    // 5. 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (localConfig.sortBy) {
        case 'importance':
          comparison = a.importance - b.importance;
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'zh-CN');
          break;
      }
      
      return localConfig.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [schedulerManager, localConfig]);

  // 获取所有标签
  const allTags = useMemo(() => tagManager.getAllTags(), [tagManager]);

  // 虚拟列表配置（单列布局）
  const rowVirtualizer = useVirtualizer({
    count: filteredNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 160,
    overscan: 10,
  });

  // 更新配置
  const handleConfigChange = useCallback((updates: Partial<FilterConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // 应用筛选（当前自动应用，此方法可扩展为手动触发）
  const handleApply = useCallback(() => {
    // 筛选已自动应用
  }, []);

  // 重置配置
  const handleReset = useCallback(() => {
    setLocalConfig(DEFAULT_FILTER_CONFIG);
  }, []);

  // 监听数据变化
  useEventBus('tree:loaded', () => {
    // 数据加载完成，重新计算
  });

  return (
    <div className="w-full h-full flex flex-col">
      {/* 筛选条件面板 */}
      <FilterPanel
        config={localConfig}
        tags={allTags}
        onChange={handleConfigChange}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* 结果统计 */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            共找到 <span className="font-medium text-blue-600">{filteredNodes.length}</span> 条结果
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={undo} disabled={!canUndo}>
              撤销
            </Button>
            <Button size="sm" variant="ghost" onClick={redo} disabled={!canRedo}>
              重做
            </Button>
          </div>
        </div>
      </div>

      {/* 结果列表 */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        {filteredNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            没有找到符合条件的日程
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const node = filteredNodes[virtualRow.index];
              
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-1"
                >
                  <FilterCard
                    key={node.id}
                    node={node}
                    tags={allTags}
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
