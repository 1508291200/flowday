/**
 * EventBus 事件总线
 * 
 * 实现模块间的发布-订阅通信，解耦模块依赖。
 * 所有模块通过事件进行通信，而非直接调用。
 * 
 * 设计原则：
 * 1. 类型安全 - 使用 TypeScript 映射类型确保事件类型正确
 * 2. 错误隔离 - 单个 handler 出错不影响其他 handler
 * 3. 内存安全 - 提供取消订阅机制，防止内存泄漏
 * 4. 可调试 - 记录事件历史，便于问题追踪
 */

import type { 
  EventType, 
  EventDataMap, 
  EventHandler, 
  EventRecord,
  IEventBus 
} from './types';

/**
 * EventBus 实现
 * 
 * 使用示例：
 * ```typescript
 * const eventBus = new EventBus();
 * 
 * // 订阅事件
 * const unsubscribe = eventBus.on('node:created', (node) => {
 *   console.log('New node:', node);
 * });
 * 
 * // 发布事件
 * eventBus.emit('node:created', newNode);
 * 
 * // 取消订阅
 * unsubscribe();
 * ```
 */
export class EventBus implements IEventBus {
  /** 
   * 事件处理器映射表
   * Key: 事件名称
   * Value: 处理器集合
   */
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  
  /** 事件历史记录（用于调试） */
  private history: EventRecord[] = [];
  
  /** 历史记录最大条数 */
  private maxHistorySize: number;
  
  /** 是否启用调试模式 */
  private debug: boolean = false;
  
  /**
   * 创建 EventBus 实例
   * 
   * @param options - 配置选项
   * @param options.maxHistorySize - 历史记录最大条数（默认 100）
   * @param options.debug - 是否启用调试模式（默认 false）
   */
  constructor(options?: { maxHistorySize?: number; debug?: boolean }) {
    this.maxHistorySize = options?.maxHistorySize ?? 100;
    this.debug = options?.debug ?? false;
  }
  
  /**
   * 发布事件
   * 
   * 触发所有订阅该事件的处理器。处理器按订阅顺序执行。
   * 单个处理器的错误不会影响其他处理器的执行。
   * 
   * @param event - 事件类型
   * @param data - 事件数据
   */
  emit<T extends EventType>(event: T, data: EventDataMap[T]): void {
    // 记录事件历史
    this.recordEvent(event, data);
    
    // 获取该事件的所有处理器
    const handlers = this.handlers.get(event);
    
    if (!handlers || handlers.size === 0) {
      if (this.debug) {
        console.log(`[EventBus] No handlers for event: ${event}`);
      }
      return;
    }
    
    // 执行所有处理器（按订阅顺序）
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        // 错误隔离：单个 handler 出错不影响其他 handler
        console.error(`[EventBus] Error in handler for event "${event}":`, error);
        
        // 在调试模式下提供更详细的错误信息
        if (this.debug) {
          console.error('Handler function:', handler.toString());
          console.error('Event data:', data);
        }
      }
    });
  }
  
  /**
   * 订阅事件
   * 
   * 返回一个取消订阅函数，调用它即可取消订阅。
   * 建议在组件卸载时调用以防止内存泄漏。
   * 
   * @param event - 事件类型
   * @param handler - 事件处理器
   * @returns 取消订阅函数
   */
  on<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): () => void {
    // 如果该事件还没有处理器集合，创建一个
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    // 获取该事件的处理器集合并添加新的处理器
    const handlers = this.handlers.get(event)!;
    handlers.add(handler as EventHandler);
    
    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${event}", total handlers: ${handlers.size}`);
    }
    
    // 返回取消订阅函数
    return () => {
      this.off(event, handler as EventHandler);
    };
  }
  
  /**
   * 订阅一次性事件
   * 
   * 事件触发一次后自动取消订阅。
   * 适用于只需要处理一次的事件场景。
   * 
   * @param event - 事件类型
   * @param handler - 事件处理器
   */
  once<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): void {
    // 创建一个包装处理器，执行后自动取消订阅
    const wrappedHandler: EventHandler<EventDataMap[T]> = (data) => {
      // 先取消订阅
      this.off(event, wrappedHandler as EventHandler);
      
      // 再执行原处理器
      handler(data);
    };
    
    // 订阅包装后的处理器
    this.on(event, wrappedHandler);
  }
  
  /**
   * 取消订阅事件
   * 
   * 从指定事件的处理器集合中移除特定处理器。
   * 
   * @param event - 事件类型
   * @param handler - 要移除的处理器
   */
  off<T extends EventType>(event: T, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    
    if (!handlers) {
      return;
    }
    
    handlers.delete(handler);
    
    if (this.debug) {
      console.log(`[EventBus] Unsubscribed from "${event}", remaining handlers: ${handlers.size}`);
    }
    
    // 如果该事件没有处理器了，清理映射表
    if (handlers.size === 0) {
      this.handlers.delete(event);
    }
  }
  
  /**
   * 取消所有订阅
   * 
   * 清除所有事件的所有处理器。
   * 警告：这会影响所有模块的订阅，谨慎使用。
   */
  offAll(): void {
    this.handlers.clear();
    
    if (this.debug) {
      console.log('[EventBus] All subscriptions cleared');
    }
  }
  
  /**
   * 获取事件历史记录
   * 
   * 返回事件的完整历史记录，用于调试和问题追踪。
   * 
   * @returns 事件历史记录数组
   */
  getEventHistory(): EventRecord[] {
    return [...this.history];
  }
  
  /**
   * 清除事件历史记录
   */
  clearHistory(): void {
    this.history = [];
  }
  
  /**
   * 记录事件到历史
   * 
   * @param event - 事件类型
   * @param data - 事件数据
   */
  private recordEvent(event: EventType, data: unknown): void {
    const record: EventRecord = {
      event,
      data,
      timestamp: Date.now(),
      source: this.getCallerInfo(),
    };
    
    this.history.push(record);
    
    // 限制历史记录大小（FIFO）
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    if (this.debug) {
      console.log(`[EventBus] Event emitted: ${event}`, data);
    }
  }
  
  /**
   * 获取调用者信息（用于调试）
   * 
   * 通过分析调用栈获取事件发布的源头。
   * 
   * @returns 调用者信息字符串
   */
  private getCallerInfo(): string {
    if (!this.debug) {
      return 'unknown';
    }
    
    try {
      // 创建错误对象获取调用栈
      const error = new Error();
      const stack = error.stack || '';
      
      // 解析调用栈（简化版，仅获取第三行的文件信息）
      const lines = stack.split('\n');
      // 通常：0=Error, 1=getCallerInfo, 2=recordEvent, 3=emit, 4=实际调用者
      const callerLine = lines[4] || lines[3] || '';
      
      // 提取文件名和行号（格式因浏览器而异）
      const match = callerLine.match(/at\s+(.*)/) || 
                    callerLine.match(/\((.*):\d+:\d+\)/);
      
      return match ? match[1].trim() : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * 检查是否有指定事件的订阅者
   * 
   * @param event - 事件类型
   * @returns 是否有订阅者
   */
  hasSubscribers(event: EventType): boolean {
    const handlers = this.handlers.get(event);
    return handlers !== undefined && handlers.size > 0;
  }
  
  /**
   * 获取指定事件的订阅者数量
   * 
   * @param event - 事件类型
   * @returns 订阅者数量
   */
  getSubscriberCount(event: EventType): number {
    const handlers = this.handlers.get(event);
    return handlers?.size ?? 0;
  }
  
  /**
   * 获取所有事件及其订阅者数量
   * 
   * @returns 事件统计映射表
   */
  getEventStats(): Map<EventType, number> {
    const stats = new Map<EventType, number>();
    
    this.handlers.forEach((handlers, event) => {
      stats.set(event, handlers.size);
    });
    
    return stats;
  }
}
