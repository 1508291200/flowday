/**
 * useApp Hook
 * 
 * 应用初始化和管理 Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore, selectIsInitialized, selectIsLoading, selectError } from '../stores/appStore';
import { useSchedulerStore } from '../stores/schedulerStore';

/**
 * 应用初始化 Hook
 */
export function useApp() {
  const initialized = useAppStore(selectIsInitialized);
  const loading = useAppStore(selectIsLoading);
  const error = useAppStore(selectError);
  const currentView = useAppStore((s) => s.currentView);
  const settings = useAppStore((s) => s.settings);
  
  // 使用 ref 防止重复初始化
  const initRef = useRef(false);
  
  // 初始化应用 - 只执行一次
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    const doInit = async () => {
      try {
        useAppStore.getState().setLoading(true);
        useAppStore.getState().clearError();
        
        // 初始化 Scheduler（加载数据）
        await useSchedulerStore.getState().initialize();
        
        useAppStore.getState().setInitialized(true);
      } catch (err) {
        useAppStore.getState().setError((err as Error).message);
      }
    };
    
    doInit();
    
    // 清理函数：组件卸载时销毁存储服务
    return () => {
      const storageService = useSchedulerStore.getState().storageService;
      if (storageService) {
        storageService.destroy();
      }
    };
  }, []); // 空依赖，只在组件挂载时执行一次
  
  // 视图切换
  const setCurrentView = useCallback(
    (view: 'mindmap' | 'list' | 'filter') => {
      useAppStore.getState().setCurrentView(view);
    },
    []
  );
  
  // 设置更新
  const updateSettings = useCallback(
    (updates: Partial<typeof settings>) => {
      useAppStore.getState().updateSettings(updates);
    },
    []
  );
  
  // 重置设置
  const resetSettings = useCallback(() => {
    useAppStore.getState().resetSettings();
  }, []);
  
  // 手动保存
  const save = useCallback(async () => {
    await useSchedulerStore.getState().save();
  }, []);
  
  // 错误处理
  const clearError = useCallback(() => {
    useAppStore.getState().clearError();
  }, []);
  
  return {
    // 状态
    initialized,
    loading,
    error,
    currentView,
    settings,
    
    // 操作
    setCurrentView,
    updateSettings,
    resetSettings,
    save,
    clearError,
  };
}
