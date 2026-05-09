/**
 * FilterCard 筛选结果卡片组件
 */

import { clsx } from 'clsx';
import type { ScheduleNode, Tag } from '../../core/types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../core/types';
import { formatRelativeTime, isOverdue } from '../../utils/date';

export interface FilterCardProps {
  node: ScheduleNode;
  tags: Tag[];
  onClick?: () => void;
  className?: string;
}

export function FilterCard({ node, tags, onClick, className }: FilterCardProps) {
  const overdue = isOverdue(node.dueDate) && !node.completed;
  const nodeTags = tags.filter(t => node.tags.includes(t.id));

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg border p-4 h-36 cursor-pointer',
        'hover:shadow-md transition-shadow duration-150 ease-out',
        node.completed && 'opacity-60',
        overdue ? 'border-red-200' : 'border-gray-200',
        className
      )}
    >
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-2">
        {/* 重要度指示器 */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: IMPORTANCE_COLORS[node.importance] }}
          title={IMPORTANCE_LABELS[node.importance]}
        />

        {/* 完成状态 */}
        {node.completed && (
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}

        {/* 标题 */}
        <h3
          className={clsx(
            'text-sm font-medium flex-1 truncate',
            node.completed && 'line-through text-gray-400',
            overdue && 'text-red-500'
          )}
          title={node.title}
        >
          {node.title}
        </h3>
      </div>

      {/* 描述 */}
      {node.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {node.description}
        </p>
      )}

      {/* 标签 */}
      {nodeTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {nodeTags.map(tag => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 text-xs rounded text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className={overdue ? 'text-red-500' : ''}>
          {formatRelativeTime(node.dueDate)}
        </span>
        <span>{IMPORTANCE_LABELS[node.importance]}</span>
      </div>
    </div>
  );
}
