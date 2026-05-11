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
          set({ 
            status: 'error', 
            error: error instanceof Error ? error.message : '同步失败' 
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
