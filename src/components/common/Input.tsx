/**
 * Input 通用输入框组件
 * 
 * 设计规范：https://github.com/flowday/ui-spec/blob/main/Input.md
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full h-9 px-3',               // 规范: 高度36px
              'border border-gray-300 rounded-md',
              'text-sm text-gray-900 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-400 focus:border-red-400',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
