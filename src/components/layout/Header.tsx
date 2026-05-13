/**
 * Header 头部组件
 */

import { clsx } from 'clsx';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({
  title = 'FlowDay',
  subtitle = '智能日程管理',
  actions,
  className,
}: HeaderProps) {
  return (
    <header
      className={clsx(
        'bg-white border-b border-gray-200',
        'flex items-center justify-between px-4',
        // 手机端：允许换行，高度自适应；PC端：固定高度
        'flex-wrap md:flex-nowrap',
        'py-2 md:py-0 md:h-14',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && (
          <span className="text-sm text-gray-400 hidden md:inline">{subtitle}</span>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-2 mt-1 md:mt-0">
          {actions}
        </div>
      )}
    </header>
  );
}
