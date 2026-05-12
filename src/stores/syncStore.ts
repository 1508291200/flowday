/**
 * 同步状态管理
 * 
 * 管理 WebDAV 云同步配置和状态
 * 支持上传本地数据到云端、从云端下载恢复数据
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WebDAVConfig } from '../storage/WebDAVClient';
import { WebDAVStorage } from '../storage/WebDAVClient';
import type { ScheduleNode, Tag, AppSettings } from '../core/types';
import { APP_VERSION } from '../core/types';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';
export type SyncDirection = 'upload' | 'download';

/** 云端数据格式（与 ExportData 一致） */
interface CloudData {
  meta: {
    version: string;
    exportTime: string;
    checksum: string;
    appVersion: string;
    encrypted: boolean;
  };
  data: {
    nodes: ScheduleNode[];
    tags: Tag[];
    presets: any[];
    settings: AppSettings;
  };
}

interface SyncState {
  config: WebDAVConfig | null;
  status: SyncStatus;
  lastSyncTime: string | null;
  lastSyncDirection: SyncDirection | null;
  error: string | null;
}

interface SyncActions {
  setConfig: (config: WebDAVConfig) => void;
  testConnection: (config: WebDAVConfig) => Promise<{ success: boolean; error?: string }>;
  /** 上传本地数据到云端 */
  uploadToCloud: (getData: () => { nodes: ScheduleNode[]; tags: Tag[] }) => Promise<void>;
  /** 从云端下载恢复数据 */
  downloadFromCloud: (applyData: (data: { nodes: ScheduleNode[]; tags: Tag[] }) => Promise<void>) => Promise<void>;
  setStatus: (status: SyncStatus) => void;
}

export const useSyncStore = create<SyncState & SyncActions>()(
  persist(
    (set, get) => ({
      config: null,
      status: 'idle',
      lastSyncTime: null,
      lastSyncDirection: null,
      error: null,
      
      setConfig: (config) => {
        set({ config });
      },
      
      testConnection: async (config) => {
        const storage = new WebDAVStorage({ config });
        const result = await storage.testConnection();
        return result;
      },
      
      uploadToCloud: async (getData) => {
        const { config } = get();
        if (!config) {
          set({ status: 'error', error: '请先配置 WebDAV' });
          return;
        }
        
        // 验证路径格式
        if (config.path && !config.path.startsWith('/')) {
          set({ status: 'error', error: '路径必须以 / 开头' });
          return;
        }
        
        set({ status: 'syncing', error: null });
        
        try {
          const storage = new WebDAVStorage({ config });
          await storage.ensureDirectory();
          
          // 安全检查：先检查云端是否有数据
          const cloudContent = await storage.load();
          if (cloudContent) {
            try {
              const cloudData = JSON.parse(cloudContent);
              const cloudNodeCount = cloudData.data?.nodes?.length ?? 0;
              const localNodeCount = getData().nodes.length;
              
              // 如果云端数据比本地数据更丰富，拒绝上传以防止数据丢失
              if (cloudNodeCount > localNodeCount) {
                set({ 
                  status: 'error', 
                  error: `云端有 ${cloudNodeCount} 个节点，本地只有 ${localNodeCount} 个节点。上传会覆盖云端数据，建议先"从云端恢复"再修改。`
                });
                return;
              }
            } catch {
              // 云端数据格式不正确，可以安全覆盖
            }
          }
          
          // 获取本地数据并序列化
          const { nodes, tags } = getData();
          const cloudData: CloudData = {
            meta: {
              version: '1.0.0',
              exportTime: new Date().toISOString(),
              checksum: '',
              appVersion: APP_VERSION,
              encrypted: false,
            },
            data: {
              nodes,
              tags,
              presets: [],
              settings: {} as AppSettings,
            },
          };
          
          // 计算校验和
          const dataString = JSON.stringify(cloudData.data);
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          cloudData.meta.checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          // 上传到云端
          await storage.save(JSON.stringify(cloudData));
          
          set({ 
            status: 'success', 
            lastSyncTime: new Date().toISOString(),
            lastSyncDirection: 'upload',
          });
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : '上传失败';
          
          if (errorMessage.includes('410') || errorMessage.includes('Gone')) {
            errorMessage = '目录不存在或已被删除，请检查路径设置';
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = '认证失败，请检查用户名和应用密码';
          }
          
          set({ status: 'error', error: errorMessage });
        }
      },
      
      downloadFromCloud: async (applyData) => {
        const { config } = get();
        if (!config) {
          set({ status: 'error', error: '请先配置 WebDAV' });
          return;
        }
        
        // 验证路径格式
        if (config.path && !config.path.startsWith('/')) {
          set({ status: 'error', error: '路径必须以 / 开头' });
          return;
        }
        
        set({ status: 'syncing', error: null });
        
        try {
          const storage = new WebDAVStorage({ config });
          await storage.ensureDirectory();
          
          // 从云端下载
          const content = await storage.load();
          
          if (!content) {
            set({ status: 'error', error: '云端没有数据文件，请先上传数据' });
            return;
          }
          
          // 解析云端数据
          let cloudData: CloudData;
          try {
            cloudData = JSON.parse(content);
          } catch {
            set({ status: 'error', error: '云端数据格式错误，无法解析' });
            return;
          }
          
          // 验证数据结构
          if (!cloudData.data || !Array.isArray(cloudData.data.nodes)) {
            set({ status: 'error', error: '云端数据格式不正确' });
            return;
          }
          
          // 校验 checksum
          if (cloudData.meta?.checksum) {
            const dataString = JSON.stringify(cloudData.data);
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (checksum !== cloudData.meta.checksum) {
              set({ status: 'error', error: '云端数据校验失败，文件可能已损坏' });
              return;
            }
          }
          
          // 应用云端数据到本地
          await applyData({
            nodes: cloudData.data.nodes,
            tags: cloudData.data.tags || [],
          });
          
          set({ 
            status: 'success', 
            lastSyncTime: new Date().toISOString(),
            lastSyncDirection: 'download',
          });
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : '下载失败';
          
          if (errorMessage.includes('410') || errorMessage.includes('Gone')) {
            errorMessage = '云端数据已过期或被删除';
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            errorMessage = '认证失败，请检查用户名和应用密码';
          }
          
          set({ status: 'error', error: errorMessage });
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
        lastSyncDirection: state.lastSyncDirection,
      }),
    }
  )
);