/**
 * EditModal 编辑节点弹窗组件
 */

import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '../common';
import type { ScheduleNode } from '../../core/types';
import { IMPORTANCE_LABELS, IMPORTANCE_COLORS } from '../../core/types';

export interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; importance: number; dueDate: string | null }) => void;
  node: ScheduleNode | null;
}

export function EditModal({ isOpen, onClose, onSave, node }: EditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [dueDate, setDueDate] = useState<string>('');

  // 初始化表单数据
  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description);
      setImportance(node.importance);
      setDueDate(node.dueDate ? node.dueDate.split('T')[0] : '');
    }
  }, [node]);

  // 保存
  const handleSave = () => {
    onSave({
      title: title.trim() || '未命名',
      description: description.trim(),
      importance,
      dueDate: dueDate || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑日程"
      size="md"
    >
      <div className="space-y-4">
        {/* 标题 */}
        <Input
          label="标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入日程标题"
        />

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入详细描述（可选）"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>

        {/* 重要度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            重要度
          </label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <button
                key={level}
                onClick={() => setImportance(level)}
                className={`w-8 h-8 rounded-full text-xs font-medium text-white transition-all ${
                  importance === level
                    ? 'ring-2 ring-offset-2'
                    : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: IMPORTANCE_COLORS[level],
                }}
                title={IMPORTANCE_LABELS[level]}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* 截止日期 */}
        <Input
          label="截止日期"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
}
