/**
 * FileStorage 单元测试
 */
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest';
import { FileStorage } from '../FileStorage';
import type { ScheduleNode, Tag, FilterPreset, AppSettings } from '../../core/types';
import { DEFAULT_APP_SETTINGS } from '../../core/types';

describe('FileStorage', () => {
  let fileStorage: FileStorage;
  
  // 测试数据
  const mockNodes: ScheduleNode[] = [
    {
      id: 'node-1',
      parentId: null,
      title: '测试节点',
      description: '',
      importance: 3,
      dueDate: null,
      tags: [],
      collapsed: false,
      order: 0,
      completed: false,
      createdAt: '2026-05-07T00:00:00Z',
      updatedAt: '2026-05-07T00:00:00Z',
    },
  ];
  
  const mockTags: Tag[] = [
    { id: 'tag-1', name: '工作', color: '#FF6B6B', createdAt: '2026-05-07T00:00:00Z' },
  ];
  
  const mockPresets: FilterPreset[] = [];
  
  const mockSettings: AppSettings = DEFAULT_APP_SETTINGS;
  
  beforeEach(() => {
    fileStorage = new FileStorage();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  test('应正确导出数据并生成校验和', async () => {
    const result = await fileStorage.exportToFile({
      nodes: mockNodes,
      tags: mockTags,
      presets: mockPresets,
      settings: mockSettings,
    });
    
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.filename).toContain('FlowDay_');
    expect(result.filename).toContain('.flowday.json');
    
    // 验证导出数据结构
    const text = await result.blob.text();
    const data = JSON.parse(text);
    
    expect(data.meta.version).toBe('1.0.0');
    expect(data.meta.encrypted).toBe(false);
    expect(data.meta.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(data.data.nodes).toHaveLength(1);
    expect(data.data.nodes[0].id).toBe('node-1');
  });
  
  test('应支持不导出设置', async () => {
    const result = await fileStorage.exportToFile(
      {
        nodes: mockNodes,
        tags: mockTags,
        presets: mockPresets,
        settings: mockSettings,
      },
      { includeSettings: false }
    );
    
    const text = await result.blob.text();
    const data = JSON.parse(text);
    
    expect(data.data.settings).toBeUndefined();
  });
  
  test('应支持自定义文件名', async () => {
    const result = await fileStorage.exportToFile(
      {
        nodes: mockNodes,
        tags: mockTags,
        presets: mockPresets,
        settings: mockSettings,
      },
      { filename: 'custom_export.flowday.json' }
    );
    
    expect(result.filename).toBe('custom_export.flowday.json');
  });
  
  test('应正确导入有效数据', async () => {
    // 先导出
    const { blob } = await fileStorage.exportToFile({
      nodes: mockNodes,
      tags: mockTags,
      presets: mockPresets,
      settings: mockSettings,
    });
    
    // 创建文件对象
    const file = new File([blob], 'test.flowday.json', { type: 'application/json' });
    
    // 导入
    const result = await fileStorage.importFromFile(file);
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('node-1');
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0].id).toBe('tag-1');
  });
  
  test('应拒绝校验和不匹配的数据', async () => {
    // 构造损坏数据
    const corruptedData = {
      meta: {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        checksum: 'invalid_checksum',
        appVersion: '1.0.0',
        encrypted: false,
      },
      data: {
        nodes: mockNodes,
        tags: mockTags,
        presets: mockPresets,
        settings: mockSettings,
      },
    };
    
    const blob = new Blob([JSON.stringify(corruptedData)], { type: 'application/json' });
    const file = new File([blob], 'test.flowday.json', { type: 'application/json' });
    
    const result = await fileStorage.importFromFile(file);
    
    expect(result.success).toBe(false);
    expect(result.errors).toContain('数据校验失败，文件可能已损坏');
  });
  
  test('应定义正确的扩展名常量', () => {
    expect(FileStorage.FILE_EXTENSION).toBe('.flowday.json');
    expect(FileStorage.ENCRYPTED_EXTENSION).toBe('.flowday.enc');
  });
});
