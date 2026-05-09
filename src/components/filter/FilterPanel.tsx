/**
 * FilterPanel 筛选条件面板组件
 */

import { useCallback } from 'react';
import { clsx } from 'clsx';
import { Button, Input } from '../common';
import type { FilterConfig, ImportanceLevel, Tag } from '../../core/types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../core/types';

export interface FilterPanelProps {
  config: FilterConfig;
  tags: Tag[];
  onChange: (updates: Partial<FilterConfig>) => void;
  onApply: () => void;
  onReset: () => void;
  className?: string;
}

export function FilterPanel({
  config,
  tags,
  onChange,
  onApply,
  onReset,
  className,
}: FilterPanelProps) {
  // 更新搜索关键字
  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ searchKeyword: e.target.value || undefined });
    },
    [onChange]
  );

  // 更新重要度范围
  const handleImportanceChange = useCallback(
    (level: ImportanceLevel, checked: boolean) => {
      const currentRange = config.importanceRange ?? [1, 5];
      let newRange: [ImportanceLevel, ImportanceLevel];

      if (checked) {
        // 添加级别到范围
        newRange = [
          Math.min(currentRange[0], level) as ImportanceLevel,
          Math.max(currentRange[1], level) as ImportanceLevel,
        ];
      } else {
        // 从范围移除级别（简化处理）
        const levels = [1, 2, 3, 4, 5].filter(
          l => l !== level && l >= currentRange[0] && l <= currentRange[1]
        );
        if (levels.length === 0) {
          newRange = [level, level];
        } else {
          newRange = [Math.min(...levels) as ImportanceLevel, Math.max(...levels) as ImportanceLevel];
        }
      }

      onChange({ importanceRange: newRange });
    },
    [config.importanceRange, onChange]
  );

  // 更新完成状态
  const handleCompletedChange = useCallback(
    (value: boolean | undefined) => {
      onChange({ completed: value });
    },
    [onChange]
  );

  // 更新标签筛选
  const handleTagChange = useCallback(
    (tagId: string, checked: boolean) => {
      const currentTags = config.tags ?? { ids: [], mode: 'OR' };
      let newIds: string[];

      if (checked) {
        newIds = [...currentTags.ids, tagId];
      } else {
        newIds = currentTags.ids.filter(id => id !== tagId);
      }

      onChange({ tags: { ...currentTags, ids: newIds } });
    },
    [config.tags, onChange]
  );

  // 更新排序方式
  const handleSortChange = useCallback(
    (sortBy: FilterConfig['sortBy'], sortOrder: FilterConfig['sortOrder']) => {
      onChange({ sortBy, sortOrder });
    },
    [onChange]
  );

  return (
    <div className={clsx('bg-white border-b border-gray-200 p-4', className)}>
      <div className="space-y-4">
        {/* 搜索关键字 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            搜索
          </label>
          <Input
            placeholder="输入关键字搜索..."
            value={config.searchKeyword ?? ''}
            onChange={handleKeywordChange}
          />
        </div>

        {/* 重要度筛选 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            重要度
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(level => {
              const inRange =
                config.importanceRange &&
                level >= config.importanceRange[0] &&
                level <= config.importanceRange[1];
              return (
                <button
                  key={level}
                  onClick={() => handleImportanceChange(level as ImportanceLevel, !inRange)}
                  className={clsx(
                    'w-8 h-8 rounded-full text-xs font-medium transition-colors',
                    inRange
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                  style={{
                    backgroundColor: inRange
                      ? IMPORTANCE_COLORS[level as ImportanceLevel]
                      : undefined,
                  }}
                  title={IMPORTANCE_LABELS[level as ImportanceLevel]}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* 完成状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            完成状态
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleCompletedChange(undefined)}
              className={clsx(
                'px-3 py-1 text-sm rounded-md transition-colors',
                config.completed === undefined
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              全部
            </button>
            <button
              onClick={() => handleCompletedChange(false)}
              className={clsx(
                'px-3 py-1 text-sm rounded-md transition-colors',
                config.completed === false
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              未完成
            </button>
            <button
              onClick={() => handleCompletedChange(true)}
              className={clsx(
                'px-3 py-1 text-sm rounded-md transition-colors',
                config.completed === true
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              已完成
            </button>
          </div>
        </div>

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const selected = config.tags?.ids.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagChange(tag.id, !selected)}
                    className={clsx(
                      'px-2 py-1 text-xs rounded transition-colors',
                      selected
                        ? 'ring-2 ring-blue-400 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    )}
                    style={{ backgroundColor: tag.color, color: 'white' }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 排序设置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            排序方式
          </label>
          <div className="flex gap-2">
            <select
              value={config.sortBy}
              onChange={(e) => handleSortChange(e.target.value as FilterConfig['sortBy'], config.sortOrder)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="importance">重要度</option>
              <option value="dueDate">截止日期</option>
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="title">标题</option>
            </select>
            <select
              value={config.sortOrder}
              onChange={(e) => handleSortChange(config.sortBy, e.target.value as FilterConfig['sortOrder'])}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={onApply}>
            应用筛选
          </Button>
          <Button size="sm" variant="secondary" onClick={onReset}>
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}
