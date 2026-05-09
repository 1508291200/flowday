/**
 * Button 通用按钮组件
 * 
 * 设计规范：https://github.com/flowday/ui-spec/blob/main/Button.md
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 border border-gray-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
};

// 规范: sm=28px | md=32px | lg=40px
const sizeStyles = {
  sm: 'h-7 px-3 text-xs',        // 28px height
  md: 'h-8 px-4 text-sm',        // 32px height
  lg: 'h-10 px-6 text-base',     // 40px height
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5',
          'rounded-md font-medium',
          'transition-colors duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
