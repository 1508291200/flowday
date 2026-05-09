/**
 * Filter Store 筛选状态管理
 * 
 * 管理筛选视图状态：
 * - 筛选配置
 * - 筛选结果
 * - 筛选预设
 */

import { create } from 'zustand';
import type {
  FilterConfig,
  FilterPreset,
  ScheduleNode,
} from '../core/types';
import { DEFAULT_FILTER_CONFIG } from '../core/types';
import { FilterEngine } from '../core/FilterEngine';

interface FilterState {
  // 筛选引擎
  filterEngine: FilterEngine;
  
  // 状态
  config: FilterConfig;
  filteredNodes: ScheduleNode[];
  totalCount: number;
  filteredCount: number;
  
  // 预设
  presets: FilterPreset[];
  activePresetId: string | null;
  
  // 操作
  setConfig: (config: FilterConfig) => void;
  updateConfig: (updates: Partial<FilterConfig>) => void;
  resetConfig: () => void;
  
  // 执行筛选
  executeFilter: (nodes: ScheduleNode[]) => void;
  
  // 预设管理
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  
  // 导入导出
  importPresets: (presets: FilterPreset[]) => void;
  exportPresets: () => FilterPreset[];
}

/**
 * Filter Store
 */
export const useFilterStore = create<FilterState>((set, get) => ({
  // 筛选引擎
  filterEngine: new FilterEngine(),
  
  // 初始状态
  config: { ...DEFAULT_FILTER_CONFIG },
  filteredNodes: [],
  totalCount: 0,
  filteredCount: 0,
  presets: [],
  activePresetId: null,
  
  // 配置操作
  setConfig: (config) => {
    const { filterEngine } = get();
    filterEngine.setFilterConfig(config);
    set({ config, activePresetId: null });
  },
  
  updateConfig: (updates) => {
    const { config, filterEngine } = get();
    const newConfig = { ...config, ...updates };
    filterEngine.setFilterConfig(newConfig);
    set({ config: newConfig, activePresetId: null });
  },
  
  resetConfig: () => {
    const { filterEngine } = get();
    const defaultConfig = filterEngine.getDefaultConfig();
    filterEngine.resetFilter();
    set({ config: defaultConfig, activePresetId: null });
  },
  
  // 执行筛选
  executeFilter: (nodes) => {
    const { filterEngine, config } = get();
    filterEngine.setFilterConfig(config);
    const filteredNodes = filterEngine.execute(nodes);
    
    set({
      filteredNodes,
      totalCount: nodes.length,
      filteredCount: filteredNodes.length,
    });
  },
  
  // 预设管理
  savePreset: (name) => {
    const { config, filterEngine } = get();
    filterEngine.savePreset(name, config);
    
    const presets = filterEngine.getAllPresets();
    set({ presets });
  },
  
  loadPreset: (id) => {
    const { presets, filterEngine } = get();
    const preset = presets.find(p => p.id === id);
    
    if (preset) {
      filterEngine.setFilterConfig(preset.config);
      set({
        config: { ...preset.config },
        activePresetId: id,
      });
    }
  },
  
  deletePreset: (id) => {
    const { filterEngine, activePresetId } = get();
    filterEngine.deletePresetById(id);
    
    const presets = filterEngine.getAllPresets();
    set({
      presets,
      activePresetId: activePresetId === id ? null : activePresetId,
    });
  },
  
  // 导入导出
  importPresets: (presets) => {
    const { filterEngine } = get();
    filterEngine.importPresets(presets);
    set({ presets: filterEngine.getAllPresets() });
  },
  
  exportPresets: () => {
    const { filterEngine } = get();
    return filterEngine.exportPresets();
  },
}));

// ============================================================================
// 选择器（Selectors）
// ============================================================================

/** 获取筛选结果 */
export const selectFilteredNodes = (state: FilterState) => state.filteredNodes;

/** 获取筛选配置 */
export const selectConfig = (state: FilterState) => state.config;

/** 获取预设列表 */
export const selectPresets = (state: FilterState) => state.presets;

/** 获取当前激活的预设 */
export const selectActivePreset = (state: FilterState) =>
  state.presets.find(p => p.id === state.activePresetId);

/** 获取筛选统计 */
export const selectFilterStats = (state: FilterState) => ({
  totalCount: state.totalCount,
  filteredCount: state.filteredCount,
  percentage: state.totalCount > 0 
    ? Math.round((state.filteredCount / state.totalCount) * 100) 
    : 0,
});
