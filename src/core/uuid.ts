/**
 * UUID 生成工具
 * 
 * 生成符合 RFC 4122 标准的 UUID v4
 * 纯函数实现，无外部依赖
 */

/**
 * 生成 UUID v4
 * 
 * 算法说明：
 * 1. 生成 16 字节（128 位）随机数
 * 2. 设置版本位（第 6 字节高 4 位为 0100，表示 v4）
 * 3. 设置变体位（第 8 字节高 2 位为 10）
 * 4. 格式化为 8-4-4-4-12 的字符串形式
 * 
 * @returns 符合 RFC 4122 标准的 UUID 字符串
 * 
 * @example
 * generateUUID() // '550e8400-e29b-41d4-a716-446655440000'
 */
export function generateUUID(): string {
  // 使用 crypto.getRandomValues 生成加密安全的随机数
  // 兼容性：所有现代浏览器和 Node.js 环境
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // 浏览器环境或 Node.js 19+
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // 设置版本位（v4）: 第 6 字节高 4 位设为 0100
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    
    // 设置变体位（RFC 4122）: 第 8 字节高 2 位设为 10
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    return formatUUID(bytes);
  }
  
  // 降级方案：使用 Math.random（不推荐，但保证兼容性）
  return generateUUIDFallback();
}

/**
 * 将字节数组格式化为 UUID 字符串
 * 
 * @param bytes - 16 字节的 Uint8Array
 * @returns 格式化后的 UUID 字符串
 */
function formatUUID(bytes: Uint8Array): string {
  const hexDigits = '0123456789abcdef';
  let uuid = '';
  
  for (let i = 0; i < 16; i++) {
    // 高 4 位
    uuid += hexDigits[bytes[i] >> 4];
    // 低 4 位
    uuid += hexDigits[bytes[i] & 0x0f];
    
    // 在特定位置添加连字符：8-4-4-4-12
    if (i === 3 || i === 5 || i === 7 || i === 9) {
      uuid += '-';
    }
  }
  
  return uuid;
}

/**
 * 降级方案：使用 Math.random 生成 UUID
 * 
 * 注意：这种方式生成的 UUID 随机性较弱，
 * 仅作为兼容旧环境的降级方案
 * 
 * @returns UUID 字符串
 */
function generateUUIDFallback(): string {
  // 生成 32 位十六进制字符串
  let uuid = '';
  
  for (let i = 0; i < 32; i++) {
    // 在第 12 位设置版本位（v4）
    if (i === 12) {
      uuid += '4';
    }
    // 在第 16 位设置变体位
    else if (i === 16) {
      uuid += (Math.random() * 4 | 8).toString(16);
    }
    // 其他位置使用随机十六进制字符
    else {
      uuid += (Math.random() * 16 | 0).toString(16);
    }
    
    // 在特定位置添加连字符：8-4-4-4-12
    if (i === 7 || i === 11 || i === 15 || i === 19) {
      uuid += '-';
    }
  }
  
  return uuid;
}

/**
 * 验证字符串是否为有效的 UUID
 * 
 * @param str - 待验证的字符串
 * @returns 是否为有效 UUID
 * 
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('invalid') // false
 */
export function isValidUUID(str: string): boolean {
  // UUID v4 正则表达式
  // 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // 其中 x 是任意十六进制字符，y 只能是 8, 9, a, b
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 生成短 ID（用于非关键场景）
 * 
 * 长度为 8-12 个字符，基于时间戳和随机数
 * 适用于临时标识符、UI 元素 ID 等
 * 
 * @param length - ID 长度（默认 8，最小 4，最大 32）
 * @returns 短 ID 字符串
 * 
 * @example
 * generateShortId() // 'a3f7b2c9'
 * generateShortId(12) // 'a3f7b2c9d4e1'
 */
export function generateShortId(length: number = 8): string {
  const minLength = 4;
  const maxLength = 32;
  
  // 约束长度范围
  const actualLength = Math.max(minLength, Math.min(maxLength, length));
  
  // 时间戳部分（确保唯一性）
  const timestamp = Date.now().toString(36);
  
  // 随机部分（增加熵）
  const random = Math.random().toString(36).substring(2);
  
  // 组合并截断到指定长度
  const combined = timestamp + random;
  
  // 如果组合字符串不够长，补充随机字符
  if (combined.length < actualLength) {
    const supplement = Array(actualLength - combined.length)
      .fill(0)
      .map(() => Math.random().toString(36).substring(2, 3))
      .join('');
    return combined + supplement;
  }
  
  return combined.substring(0, actualLength);
}
