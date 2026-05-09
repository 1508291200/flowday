/**
 * App Store 应用状态管理
 * 
 * 管理全局应用状态：
 * - 当前视图类型
 * - 应用设置
 * - 加载状态
 * - 错误处理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewType, AppSettings } from '../core/types';
import { DEFAULT_APP_SETTINGS } from '../core/types';

interface AppState {
  // 状态
  currentView: ViewType;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // 视图操作
  setCurrentView: (view: ViewType) => void;
  
  // 设置操作
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // 加载状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 初始化
  setInitialized: (initialized: boolean) => void;
}

/**
 * 应用状态 Store
 * 
 * 使用 persist 中间件持久化设置到 localStorage
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      currentView: 'list',
      settings: { ...DEFAULT_APP_SETTINGS },
      isLoading: true,
      error: null,
      isInitialized: false,
      
      // 视图操作
      setCurrentView: (view) => {
        set({ currentView: view });
      },
      
      // 设置操作
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
            // 深度合并嵌套对象
            mindMapSettings: {
              ...state.settings.mindMapSettings,
              ...(newSettings.mindMapSettings ?? {}),
            },
            listViewSettings: {
              ...state.settings.listViewSettings,
              ...(newSettings.listViewSettings ?? {}),
            },
          },
        }));
      },
      
      resetSettings: () => {
        set({ settings: { ...DEFAULT_APP_SETTINGS } });
      },
      
      // 加载状态
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setError: (error) => {
        set({ error, isLoading: false });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      // 初始化
      setInitialized: (initialized) => {
        set({ isInitialized: initialized, isLoading: false });
      },
    }),
    {
      name: 'flowday-app-storage',
      // 只持久化设置，不持久化临时状态
      partialize: (state) => ({
        currentView: state.currentView,
        settings: state.settings,
      }),
    }
  )
);

// ============================================================================
// 选择器（Selectors）
// ============================================================================

/** 获取当前视图 */
export const selectCurrentView = (state: AppState) => state.currentView;

/** 获取设置 */
export const selectSettings = (state: AppState) => state.settings;

/** 获取思维导图设置 */
export const selectMindMapSettings = (state: AppState) => state.settings.mindMapSettings;

/** 获取列表视图设置 */
export const selectListViewSettings = (state: AppState) => state.settings.listViewSettings;

/** 获取主题 */
export const selectTheme = (state: AppState) => state.settings.theme;

/** 是否加载中 */
export const selectIsLoading = (state: AppState) => state.isLoading;

/** 获取错误信息 */
export const selectError = (state: AppState) => state.error;

/** 是否已初始化 */
export const selectIsInitialized = (state: AppState) => state.isInitialized;
