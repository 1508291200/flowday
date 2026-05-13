/**
 * ListItem 列表项组件
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import type { FlattenedNode, Tag } from '../../core/types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../core/types';
import { formatRelativeTime, isOverdue } from '../../utils/date';
import { IconButton } from '../common';
import { useSchedulerStore } from '../../stores/schedulerStore';

export interface ListItemProps {
  item: FlattenedNode;
  tags: Tag[];
  onToggleCollapse: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart?: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

// 展开/折叠图标
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={clsx('w-4 h-4 transition-transform', expanded ? 'rotate-90' : '')}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// 完成状态复选框
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={clsx(
        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
        checked
          ? 'bg-blue-500 border-blue-500'
          : 'border-gray-300 hover:border-blue-400'
      )}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// 添加子节点图标
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// 编辑图标
function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// 删除图标
function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function ListItem({
  item,
  tags,
  onToggleCollapse,
  onToggleComplete,
  onAddChild,
  onEdit,
  onDelete,
  selected,
  onSelect,
}: ListItemProps) {
  const { node, depth, isExpanded, hasChildren } = item;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRoot = node.parentId === null;
  const overdue = isOverdue(node.dueDate) && !node.completed;

  // 处理双击编辑
  const handleDoubleClick = useCallback(() => {
    if (!isRoot) {
      setIsEditing(true);
      setEditTitle(node.title);
    }
  }, [isRoot, node.title]);

  // 保存编辑
  const handleSaveEdit = useCallback(() => {
    if (editTitle.trim()) {
      onEdit(node.id);
      // 通过 onEdit 触发更新，这里需要通过 store 更新标题
      useSchedulerStore.getState().updateNode(node.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  }, [editTitle, node.id, onEdit]);

  // 自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 获取节点关联的标签
  const nodeTags = tags.filter(t => node.tags.includes(t.id));

  if (!item.isVisible) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-2 h-10 px-2',
        'hover:bg-gray-50 transition-colors duration-150 ease-out cursor-pointer',
        selected && 'bg-blue-50'
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      // 手机端缩进减少
      onClick={() => onSelect?.(node.id)}
      onDoubleClick={handleDoubleClick}
    >
      {/* 折叠/展开按钮 */}
      {hasChildren ? (
        <IconButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
        >
          <ChevronIcon expanded={isExpanded} />
        </IconButton>
      ) : (
        <div className="w-6" />
      )}

      {/* 完成状态复选框 */}
      {!isRoot && (
        <Checkbox
          checked={node.completed}
          onChange={() => onToggleComplete(node.id)}
        />
      )}

      {/* 重要度指示器 */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: IMPORTANCE_COLORS[node.importance] }}
        title={IMPORTANCE_LABELS[node.importance]}
      />

      {/* 标题（可编辑） */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={clsx(
            'flex-1 text-sm truncate',
            node.completed && 'line-through text-gray-400',
            overdue && 'text-red-500'
          )}
        >
          {node.title}
        </span>
      )}

      {/* 标签 */}
      {nodeTags.length > 0 && (
        <div className="flex items-center gap-1">
          {nodeTags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 text-xs rounded text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {nodeTags.length > 3 && (
            <span className="text-xs text-gray-400">+{nodeTags.length - 3}</span>
          )}
        </div>
      )}

      {/* 截止日期 */}
      {node.dueDate && (
        <span className={clsx(
          'text-xs',
          overdue ? 'text-red-500' : 'text-gray-400'
        )}>
          {formatRelativeTime(node.dueDate)}
        </span>
      )}

      {/* 操作按钮 */}
      {!isRoot && (
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <IconButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            title="添加子节点"
          >
            <PlusIcon />
          </IconButton>
          <IconButton
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              setEditTitle(node.title);
            }}
            title="编辑"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="删除"
          >
            <TrashIcon />
          </IconButton>
        </div>
      )}
    </div>
  );
}
