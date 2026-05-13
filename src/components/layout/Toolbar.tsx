/**
 * Toolbar 工具栏组件
 */

import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={clsx(
        'h-10 bg-gray-50 border-b border-gray-200',
        'flex items-center gap-2 px-2 md:px-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ToolbarGroupProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarGroup({ children, className }: ToolbarGroupProps) {
  return (
    <div className={clsx('flex items-center gap-1', className)}>
      {children}
    </div>
  );
}

export interface ToolbarDividerProps {
  className?: string;
}

export function ToolbarDivider({ className }: ToolbarDividerProps) {
  return (
    <div className={clsx('w-px h-5 bg-gray-300 mx-1', className)} />
  );
}
