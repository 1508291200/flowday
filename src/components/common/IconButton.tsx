/**
 * IconButton 图标按钮组件
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost';
}

const sizeStyles = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconSizeStyles = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const variantStyles = {
  default: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-500 hover:bg-gray-100',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', variant = 'ghost', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center',
          'rounded transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <span className={iconSizeStyles[size]}>{children}</span>
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
