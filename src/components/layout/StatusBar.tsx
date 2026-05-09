/**
 * StatusBar 状态栏组件
 */

import { clsx } from 'clsx';

export interface StatusBarProps {
  nodeCount?: number;
  completedCount?: number;
  version?: string;
  className?: string;
}

export function StatusBar({
  nodeCount = 0,
  completedCount = 0,
  version = '1.0.0',
  className,
}: StatusBarProps) {
  return (
    <footer
      className={clsx(
        'h-8 bg-white border-t border-gray-200',
        'flex items-center px-4 text-xs text-gray-400',
        className
      )}
    >
      <span>FlowDay v{version}</span>
      <span className="mx-2">|</span>
      <span>节点数: {nodeCount}</span>
      <span className="mx-2">|</span>
      <span>已完成: {completedCount}</span>
    </footer>
  );
}
