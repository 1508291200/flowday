/**
 * SettingsView 设置视图
 * 
 * 提供 WebDAV 云同步配置
 */

import { useState, useCallback } from 'react';
import { useSyncStore } from '../../stores/syncStore';
import { Button, Input } from '../common';

export function SettingsView() {
  const config = useSyncStore((s) => s.config);
  const status = useSyncStore((s) => s.status);
  const setConfig = useSyncStore((s) => s.setConfig);
  const testConnection = useSyncStore((s) => s.testConnection);
  const syncNow = useSyncStore((s) => s.syncNow);
  
  const [formData, setFormData] = useState({
    url: config?.url || 'https://dav.jianguoyun.com',
    username: config?.username || '',
    password: config?.password || '',
    path: config?.path || '/FlowDay',
  });
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(formData);
      setTestResult({ 
        success: result.success, 
        message: result.error || '连接成功' 
      });
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : '测试失败' 
      });
    } finally {
      setTesting(false);
    }
  }, [formData, testConnection]);
  
  const handleSave = useCallback(() => {
    setConfig(formData);
  }, [formData, setConfig]);
  
  const handleSync = useCallback(async () => {
    await syncNow();
  }, [syncNow]);
  
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">设置</h1>
      
      {/* WebDAV 云同步 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          WebDAV 云同步
        </h2>
        
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <Input
            label="服务器地址"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://dav.jianguoyun.com"
          />
          
          <Input
            label="用户名"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="输入用户名或邮箱"
          />
          
          <Input
            label="密码/应用密码"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="输入密码"
          />
          
          <Input
            label="同步目录"
            value={formData.path}
            onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
            placeholder="/FlowDay"
          />
          <p className="text-xs text-gray-500">
            路径以 / 开头，如 /FlowDay。注意：不要输入"/我的坚果云"，WebDAV根目录 / 就是您的同步根目录。
          </p>
          
          {/* 测试结果 */}
          {testResult && (
            <div className={`p-3 rounded ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.success ? '✓ 连接成功' : `✗ ${testResult.message}`}
            </div>
          )}
          
          {/* 状态指示 */}
          {status && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`w-2 h-2 rounded-full ${status === 'syncing' ? 'bg-blue-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></span>
              {status === 'syncing' ? '同步中...' : status === 'error' ? '同步失败' : '已同步'}
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={handleTest}
              disabled={testing || !formData.url || !formData.username || !formData.password}
            >
              {testing ? '测试中...' : '测试连接'}
            </Button>
            <Button onClick={handleSave}>
              保存配置
            </Button>
            {config && (
              <Button onClick={handleSync}>
                立即同步
              </Button>
            )}
          </div>
        </div>
      </section>
      
      {/* 说明 */}
      <section className="text-sm text-gray-500 space-y-2">
        <h3 className="font-medium text-gray-700">使用说明</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>推荐使用坚果云 WebDAV 服务（免费）</li>
          <li>坚果云需要在"账户信息 → 安全选项"中创建应用密码</li>
          <li>应用密码不同于登录密码，更安全</li>
          <li>数据会保存到 WebDAV 服务的指定目录</li>
        </ul>
      </section>
    </div>
  );
}
