/**
 * useTags Hook
 * 
 * 封装标签操作的 React Hook
 */

import { useCallback, useMemo } from 'react';
import { useSchedulerStore } from '../stores/schedulerStore';
import type { Tag } from '../core/types';

/**
 * 标签操作 Hook
 */
export function useTags() {
  const store = useSchedulerStore();
  
  // 获取所有标签
  const tags = useSchedulerStore((s) => s.tags);
  
  // 创建标签
  const createTag = useCallback(
    (name: string, color?: string) => {
      store.createTag(name, color);
    },
    [store]
  );
  
  // 更新标签
  const updateTag = useCallback(
    (id: string, data: { name?: string; color?: string }) => {
      store.updateTag(id, data);
    },
    [store]
  );
  
  // 删除标签
  const deleteTag = useCallback(
    (id: string) => {
      store.deleteTag(id);
    },
    [store]
  );
  
  // 根据名称查找标签
  const findTagByName = useCallback(
    (name: string): Tag | null => {
      const { tagManager } = useSchedulerStore.getState();
      return tagManager.findTagByName(name);
    },
    []
  );
  
  // 根据 ID 批量获取标签
  const getTagsByIds = useCallback(
    (ids: string[]): Tag[] => {
      const { tagManager } = useSchedulerStore.getState();
      return tagManager.getTagsByIds(ids);
    },
    []
  );
  
  // 获取标签使用统计
  const getTagUsage = useCallback(
    (tagId: string): number => {
      const { tagManager } = useSchedulerStore.getState();
      return tagManager.getTagUsageCount(tagId);
    },
    []
  );
  
  // 获取所有标签使用统计
  const tagStats = useMemo(() => {
    const { tagManager } = useSchedulerStore.getState();
    return tagManager.getTagUsageStats();
  }, [tags]);
  
  // 排序后的标签（按使用次数降序）
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      const usageA = tagStats.get(a.id) ?? 0;
      const usageB = tagStats.get(b.id) ?? 0;
      return usageB - usageA;
    });
  }, [tags, tagStats]);
  
  // 搜索标签
  const searchTags = useCallback(
    (keyword: string): Tag[] => {
      const lowerKeyword = keyword.toLowerCase();
      return tags.filter((tag) =>
        tag.name.toLowerCase().includes(lowerKeyword)
      );
    },
    [tags]
  );
  
  return {
    // 数据
    tags,
    sortedTags,
    tagStats,
    
    // 操作
    createTag,
    updateTag,
    deleteTag,
    
    // 查询
    findTagByName,
    getTagsByIds,
    getTagUsage,
    searchTags,
  };
}
