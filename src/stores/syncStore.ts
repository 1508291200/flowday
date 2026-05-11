/**
 * 同步状态管理
 * 
 * 管理 WebDAV 云同步配置和状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WebDAVConfig } from '../storage/WebDAVClient';
import { WebDAVStorage } from '../storage/WebDAVClient';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

interface SyncState {
  config: WebDAVConfig | null;
  status: SyncStatus;
  lastSyncTime: string | null;
  error: string | null;
}

interface SyncActions {
  setConfig: (config: WebDAVConfig) => void;
  testConnection: (config: WebDAVConfig) => Promise<{ success: boolean; error?: string }>;
  syncNow: () => Promise<void>;
  setStatus: (status: SyncStatus) => void;
}

export const useSyncStore = create<SyncState & SyncActions>()(
  persist(
    (set, get) => ({
      config: null,
      status: 'idle',
      lastSyncTime: null,
      error: null,
      
      setConfig: (config) => {
        set({ config });
      },
      
      testConnection: async (config) => {
        const storage = new WebDAVStorage({ config });
        const result = await storage.testConnection();
        return result;
      },
      
      syncNow: async () => {
        const { config } = get();
        if (!config) return;
        
        // 验证路径格式
        if (config.path && !config.path.startsWith('/')) {
          set({ 
            status: 'error', 
            error: '路径必须以 / 开头' 
          });
          return;
        }
        
        set({ status: 'syncing', error: null });
        
        try {
          const storage = new WebDAVStorage({ config });
          await storage.ensureDirectory();
          
          // 这里需要与主存储交互，暂时只更新状态
          set({ 
            status: 'success', 
            lastSyncTime: new Date().toISOString() 
          });
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : '同步失败';
          
          // 提供更友好的错误提示
          if (errorMessage.includes('410') || errorMessage.includes('Gone')) {
            errorMessage = '目录不存在或已被删除。请检查路径设置，建议使用 /FlowDay';
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = '认证失败，请检查用户名和应用密码';
          } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            errorMessage = '没有权限访问该目录';
          }
          
          set({ 
            status: 'error', 
            error: errorMessage 
          });
        }
      },
      
      setStatus: (status) => {
        set({ status });
      },
    }),
    {
      name: 'flowday-sync-config',
      partialize: (state) => ({
        config: state.config,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
