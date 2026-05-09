/**
 * 日期处理工具函数
 */

/**
 * 格式化日期为本地字符串
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 计算相对时间（如"3天后"、"已过期"等）
 */
export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return '无截止日期';
  
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // 重置时间为当天0点
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  
  const nowDay = new Date(now);
  nowDay.setHours(0, 0, 0, 0);
  
  const diffMs = targetDay.getTime() - nowDay.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return `已过期 ${Math.abs(diffDays)} 天`;
  } else if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '明天';
  } else if (diffDays <= 7) {
    return `${diffDays} 天后`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} 周后`;
  } else {
    return formatDate(date);
  }
}

/**
 * 检查日期是否过期
 */
export function isOverdue(date: string | Date | null): boolean {
  if (!date) return false;
  
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  return target.getTime() < now.getTime();
}

/**
 * 检查日期是否是今天
 */
export function isToday(date: string | Date | null): boolean {
  if (!date) return false;
  
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return target.getFullYear() === now.getFullYear() &&
         target.getMonth() === now.getMonth() &&
         target.getDate() === now.getDate();
}
