/**
 * useFilter Hook
 * 
 * 封装筛选操作的 React Hook
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFilterStore } from '../stores/filterStore';
import { useSchedulerStore } from '../stores/schedulerStore';
import type { FilterConfig, FilterPreset } from '../core/types';

/**
 * 筛选操作 Hook
 */
export function useFilter() {
  // 使用 ref 跟踪是否已初始化
  const initRef = useRef(false);
  
  // 筛选状态 - 使用稳定的选择器
  const config = useFilterStore((s) => s.config);
  const filteredNodes = useFilterStore((s) => s.filteredNodes);
  const presets = useFilterStore((s) => s.presets);
  const totalCount = useFilterStore((s) => s.totalCount);
  const filteredCount = useFilterStore((s) => s.filteredCount);
  const activePresetId = useFilterStore((s) => s.activePresetId);
  
  // 初始执行一次筛选
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
    useFilterStore.getState().executeFilter(nodes);
  }, []);
  // 设置配置
  const setConfig = useCallback(
    (newConfig: FilterConfig) => {
      useFilterStore.getState().setConfig(newConfig);
      // 配置变化后立即执行筛选
      const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
      useFilterStore.getState().executeFilter(nodes);
    },
    []
  );
  
  // 更新配置（部分更新）
  const updateConfig = useCallback(
    (updates: Partial<FilterConfig>) => {
      useFilterStore.getState().updateConfig(updates);
      // 配置变化后立即执行筛选
      const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
      useFilterStore.getState().executeFilter(nodes);
    },
    []
  );
  
  // 重置配置
  const resetConfig = useCallback(() => {
    useFilterStore.getState().resetConfig();
    const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
    useFilterStore.getState().executeFilter(nodes);
  }, []);
  
  // 手动执行筛选
  const executeFilter = useCallback(() => {
    const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
    useFilterStore.getState().executeFilter(nodes);
  }, []);
  
  // 预设管理
  const savePreset = useCallback(
    (name: string) => {
      useFilterStore.getState().savePreset(name);
    },
    []
  );
  
  const loadPreset = useCallback(
    (id: string) => {
      useFilterStore.getState().loadPreset(id);
      const nodes = useSchedulerStore.getState().schedulerManager.getAllNodes();
      useFilterStore.getState().executeFilter(nodes);
    },
    []
  );
  
  const deletePreset = useCallback(
    (id: string) => {
      useFilterStore.getState().deletePreset(id);
    },
    []
  );
  
  // 导入导出预设
  const importPresets = useCallback(
    (newPresets: FilterPreset[]) => {
      useFilterStore.getState().importPresets(newPresets);
    },
    []
  );
  
  const exportPresets = useCallback(() => {
    return useFilterStore.getState().exportPresets();
  }, []);
  
  // 快捷筛选
  const filterByImportance = useCallback(
    (min: number, max: number) => {
      updateConfig({
        importanceRange: [min as any, max as any],
        completed: false,
        sortBy: 'importance',
        sortOrder: 'desc',
      });
    },
    [updateConfig]
  );
  
  const filterByDateRange = useCallback(
    (start: string, end: string) => {
      updateConfig({
        dueDateRange: { start, end },
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });
    },
    [updateConfig]
  );
  
  const filterByTags = useCallback(
    (tagIds: string[], mode: 'AND' | 'OR' = 'OR') => {
      updateConfig({
        tags: { ids: tagIds, mode },
      });
    },
    [updateConfig]
  );
  
  const filterByKeyword = useCallback(
    (keyword: string) => {
      updateConfig({
        searchKeyword: keyword,
      });
    },
    [updateConfig]
  );
  
  // 统计信息
  const stats = useMemo(
    () => ({
      totalCount,
      filteredCount,
      percentage: totalCount > 0 
        ? Math.round((filteredCount / totalCount) * 100) 
        : 0,
    }),
    [totalCount, filteredCount]
  );
  
  return {
    // 数据
    config,
    filteredNodes,
    presets,
    activePresetId,
    stats,
    
    // 配置操作
    setConfig,
    updateConfig,
    resetConfig,
    executeFilter,
    
    // 预设操作
    savePreset,
    loadPreset,
    deletePreset,
    importPresets,
    exportPresets,
    
    // 快捷筛选
    filterByImportance,
    filterByDateRange,
    filterByTags,
    filterByKeyword,
  };
}
