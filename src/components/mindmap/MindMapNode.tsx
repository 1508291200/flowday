/**
 * MindMapNode 思维导图节点组件
 * 
 * React Flow 的自定义节点组件
 */

import { memo, useCallback, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { clsx } from 'clsx';
import type { ScheduleNode, Tag } from '../../core/types';
import { IMPORTANCE_COLORS } from '../../core/types';
import { formatRelativeTime, isOverdue } from '../../utils/date';

// 节点数据类型
interface NodeData {
  node: ScheduleNode;
  tags: Tag[];
  onToggleCollapse?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
}

// 展开/折叠图标
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={clsx('w-3 h-3 transition-transform', expanded ? 'rotate-90' : '')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export const MindMapNode = memo(({ data }: NodeProps<NodeData>) => {
  const { node, tags, onToggleCollapse, onToggleComplete, onAddChild, onEdit, onDelete } = data;
  const [isHovered, setIsHovered] = useState(false);

  const isRoot = node.parentId === null;
  const overdue = isOverdue(node.dueDate) && !node.completed;
  const nodeTags = tags.filter(t => node.tags.includes(t.id));

  // 切换折叠
  const handleToggleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse?.(node.id);
    },
    [node.id, onToggleCollapse]
  );

  // 切换完成
  const handleToggleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleComplete?.(node.id);
    },
    [node.id, onToggleComplete]
  );

  // 添加子节点
  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddChild?.(node.id);
    },
    [node.id, onAddChild]
  );

  // 编辑
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(node.id);
    },
    [node.id, onEdit]
  );

  // 删除
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(node.id);
    },
    [node.id, onDelete]
  );

  return (
    <div
      className={clsx(
        'relative group',
        'px-3 py-2 rounded-lg border-2 min-w-[120px] max-w-[200px]',
        'bg-white shadow-sm',
        'transition-all duration-150 ease-out',
        'border-gray-200',
        node.completed && 'opacity-60',
        isHovered && 'shadow-md'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 连接点 - 左侧（用于父节点） */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-gray-400 !border-0"
        />
      )}

      {/* 连接点 - 右侧（用于子节点） */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-gray-400 !border-0"
      />

      {/* 折叠按钮 */}
      {onToggleCollapse && (
        <button
          onClick={handleToggleCollapse}
          className={clsx(
            'absolute -left-4 top-1/2 -translate-y-1/2',
            'w-5 h-5 rounded-full bg-white border border-gray-300',
            'flex items-center justify-center',
            'hover:bg-gray-100 transition-colors',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          <ChevronIcon expanded={!node.collapsed} />
        </button>
      )}

      {/* 重要度指示器 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: IMPORTANCE_COLORS[node.importance] }}
      />

      {/* 内容区 */}
      <div className="flex items-center gap-2">
        {/* 完成状态复选框 */}
        {!isRoot && onToggleComplete && (
          <button
            onClick={handleToggleComplete}
            className={clsx(
              'w-4 h-4 rounded border flex-shrink-0',
              node.completed
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 hover:border-blue-400'
            )}
          >
            {node.completed && (
              <svg className="w-2.5 h-2.5 text-white m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}

        {/* 标题 */}
        <div className="flex-1 min-w-0">
          <div
            className={clsx(
              'text-sm font-medium truncate',
              node.completed && 'line-through text-gray-400',
              overdue && 'text-red-500'
            )}
            title={node.title}
          >
            {node.title}
          </div>
        </div>
      </div>

      {/* 标签 */}
      {nodeTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {nodeTags.slice(0, 2).map(tag => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 text-xs rounded text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {nodeTags.length > 2 && (
            <span className="text-xs text-gray-400">+{nodeTags.length - 2}</span>
          )}
        </div>
      )}

      {/* 截止日期 */}
      {node.dueDate && (
        <div className={clsx(
          'text-xs mt-1',
          overdue ? 'text-red-500' : 'text-gray-400'
        )}>
          {formatRelativeTime(node.dueDate)}
        </div>
      )}

      {/* 悬浮操作按钮 */}
      {isHovered && !isRoot && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white shadow-md rounded px-1 py-0.5 z-10">
          <button
            onClick={handleAddChild}
            className="text-xs text-gray-500 hover:text-blue-500 px-1"
            title="添加子节点"
          >
            +
          </button>
          <button
            onClick={handleEdit}
            className="text-xs text-gray-500 hover:text-blue-500 px-1"
            title="编辑"
          >
            编辑
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-gray-500 hover:text-red-500 px-1"
            title="删除"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
