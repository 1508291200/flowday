/**
 * Modal 通用模态框组件
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-150 ease-out"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={clsx(
            'relative w-full',
            sizeStyles[size],
            'bg-white rounded-lg shadow-xl',
            'transform transition-all duration-150 ease-out'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* 内容 */}
          <div className="px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
