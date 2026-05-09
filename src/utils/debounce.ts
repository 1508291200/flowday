/**
 * 防抖函数
 * 
 * 在指定时间内只执行最后一次调用
 */

type AnyFunction = (...args: any[]) => any;

export function debounce<T extends AnyFunction>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 * 
 * 在指定时间内只执行一次
 */
export function throttle<T extends AnyFunction>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
