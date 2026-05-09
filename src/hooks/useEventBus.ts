/**
 * useEventBus Hook
 * 
 * 封装事件订阅的 React Hook
 * 自动处理订阅和取消订阅
 */

import { useEffect, useCallback } from 'react';
import { useSchedulerStore } from '../stores/schedulerStore';
import type { EventType, EventHandler, EventDataMap } from '../core/types';

/**
 * 订阅单个事件
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEventBus('node:created', (node) => {
 *     console.log('New node:', node);
 *   });
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useEventBus<T extends EventType>(
  event: T,
  handler: EventHandler<EventDataMap[T]>
): void {
  const eventBus = useSchedulerStore((s) => s.eventBus);
  
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler);
    return unsubscribe;
  }, [event, handler, eventBus]);
}

/**
 * 订阅多个事件
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useEventBusMultiple({
 *     'node:created': (node) => console.log('Created:', node),
 *     'node:updated': (node) => console.log('Updated:', node),
 *   });
 * }
 * ```
 */
export function useEventBusMultiple(
  handlers: Partial<{
    [K in EventType]: EventHandler<EventDataMap[K]>;
  }>
): void {
  const eventBus = useSchedulerStore((s) => s.eventBus);
  
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    
    for (const [event, handler] of Object.entries(handlers)) {
      if (handler) {
        const unsubscribe = eventBus.on(
          event as EventType,
          handler as EventHandler
        );
        unsubscribers.push(unsubscribe);
      }
    }
    
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [handlers, eventBus]);
}

/**
 * 发布事件的 Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const emit = useEventEmitter();
 *   
 *   const handleClick = () => {
 *     emit('ui:nodeSelected', { id: 'node-1' });
 *   };
 * }
 * ```
 */
export function useEventEmitter() {
  const eventBus = useSchedulerStore((s) => s.eventBus);
  
  return useCallback(
    <T extends EventType>(event: T, data: EventDataMap[T]): void => {
      eventBus.emit(event, data);
    },
    [eventBus]
  );
}

/**
 * 获取事件历史记录（用于调试）
 */
export function useEventHistory() {
  const eventBus = useSchedulerStore((s) => s.eventBus);
  
  return useCallback(() => {
    return eventBus.getEventHistory();
  }, [eventBus]);
}
