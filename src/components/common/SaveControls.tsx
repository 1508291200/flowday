/**
 * SaveControls 保存控制组件
 * 
 * 提供保存状态指示、手动保存、导出、导入功能
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useSchedulerStore } from '../../stores/schedulerStore';
import type { SaveStatus } from '../../services/StorageService';

/**
 * 保存状态图标
 */
function SaveStatusIcon({ status }: { status: SaveStatus }) {
  const statusConfig = {
    idle: { icon: '○', color: 'text-gray-400', title: '无更改' },
    saving: { icon: '◐', color: 'text-blue-500 animate-spin', title: '保存中...' },
    saved: { icon: '●', color: 'text-green-500', title: '已保存' },
    error: { icon: '✕', color: 'text-red-500', title: '保存失败' },
  };
  
  const config = statusConfig[status];
  
  return (
    <span
      className={clsx('text-sm font-mono', config.color)}
      title={config.title}
      aria-label={config.title}
    >
      {config.icon}
    </span>
  );
}

export function SaveControls() {
  const { saveStatus, save, exportData, importData } = useSchedulerStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showEncryptDialog, setShowEncryptDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // 手动保存
  const handleSave = useCallback(async () => {
    try {
      setError(null);
      await save();
    } catch (e) {
      setError('保存失败');
    }
  }, [save]);
  
  // 导出
  const handleExport = useCallback(async (encrypt: boolean) => {
    try {
      setIsExporting(true);
      setError(null);
      await exportData({
        encrypt,
        password: encrypt ? password : undefined,
      });
      setShowEncryptDialog(false);
      setPassword('');
    } catch (e) {
      setError('导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [exportData, password]);
  
  // 导入
  const handleImport = useCallback(async () => {
    try {
      setIsImporting(true);
      setError(null);
      const result = await importData();
      if (!result.success) {
        setError(result.errors.join('; '));
      }
    } catch (e) {
      setError('导入失败');
    } finally {
      setIsImporting(false);
    }
  }, [importData]);
  
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* 保存状态 */}
      <div className="flex items-center gap-1">
        <SaveStatusIcon status={saveStatus} />
        <span className="text-xs text-gray-500 hidden md:inline">
          {saveStatus === 'saving' && '保存中'}
          {saveStatus === 'saved' && '已保存'}
          {saveStatus === 'error' && '错误'}
        </span>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
      
      {/* 按钮组 */}
      <div className="flex items-center gap-1">
        {/* 手动保存 - 手机端只显示图标 */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={clsx(
            'md:px-2 md:py-1 text-sm rounded',
            'bg-gray-100 hover:bg-gray-200',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'p-1.5 md:hidden'
          )}
          title="手动保存"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={clsx(
            'px-2 py-1 text-sm rounded',
            'bg-gray-100 hover:bg-gray-200',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hidden md:inline-flex'
          )}
          title="手动保存"
        >
          保存
        </button>
        
        {/* 导出 - 手机端只显示图标 */}
        <div className="relative">
          <button
            onClick={() => setShowEncryptDialog(true)}
            disabled={isExporting}
            className={clsx(
              'px-2 py-1 text-sm rounded',
              'bg-blue-50 text-blue-600 hover:bg-blue-100',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hidden md:inline-flex'
            )}
            title="导出数据文件"
          >
            导出
          </button>
          <button
            onClick={() => setShowEncryptDialog(true)}
            disabled={isExporting}
            className={clsx(
              'p-1.5 rounded',
              'bg-blue-50 text-blue-600 hover:bg-blue-100',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'md:hidden'
            )}
            title="导出数据文件"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
        
        {/* 导入 - 手机端只显示图标 */}
        <button
          onClick={handleImport}
          disabled={isImporting}
          className={clsx(
            'px-2 py-1 text-sm rounded',
            'bg-green-50 text-green-600 hover:bg-green-100',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hidden md:inline-flex'
          )}
          title="导入数据文件"
        >
          导入
        </button>
        <button
          onClick={handleImport}
          disabled={isImporting}
          className={clsx(
            'p-1.5 rounded',
            'bg-green-50 text-green-600 hover:bg-green-100',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'md:hidden'
          )}
          title="导入数据文件"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </button>
      </div>
      
      {/* 加密选项对话框 */}
      {showEncryptDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 w-80">
            <h3 className="text-lg font-medium mb-3">导出选项</h3>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={password.length > 0}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setPassword('');
                      }
                    }}
                  />
                  <span className="text-sm">加密导出文件</span>
                </label>
              </div>
              
              {password.length > 0 || true ? (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入加密密码"
                    className={clsx(
                      'w-full px-3 py-2 border rounded',
                      'focus:outline-none focus:ring-2 focus:ring-blue-300'
                    )}
                  />
                </div>
              ) : null}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowEncryptDialog(false);
                  setPassword('');
                }}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded',
                  'bg-gray-100 hover:bg-gray-200',
                  'transition-colors duration-150'
                )}
              >
                取消
              </button>
              <button
                onClick={() => handleExport(password.length > 0)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded',
                  'bg-blue-500 text-white hover:bg-blue-600',
                  'transition-colors duration-150'
                )}
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
