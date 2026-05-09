/**
 * 树操作工具函数
 */

import type { ScheduleNode } from '../core/types';

/**
 * 从节点列表构建父子映射
 */
export function buildChildrenMap(
  nodes: ScheduleNode[]
): Map<string | null, ScheduleNode[]> {
  const childrenMap = new Map<string | null, ScheduleNode[]>();
  
  for (const node of nodes) {
    const siblings = childrenMap.get(node.parentId) ?? [];
    siblings.push(node);
    childrenMap.set(node.parentId, siblings);
  }
  
  // 排序
  for (const siblings of childrenMap.values()) {
    siblings.sort((a, b) => a.order - b.order);
  }
  
  return childrenMap;
}

/**
 * 将树结构扁平化为列表
 */
export function flattenTree(
  nodes: ScheduleNode[],
  collapsedIds: Set<string>
): Array<{ node: ScheduleNode; depth: number; isVisible: boolean }> {
  const result: Array<{ node: ScheduleNode; depth: number; isVisible: boolean }> = [];
  const childrenMap = buildChildrenMap(nodes);
  
  const traverse = (
    parentId: string | null,
    depth: number,
    parentVisible: boolean,
    parentCollapsed: boolean
  ) => {
    const children = childrenMap.get(parentId) ?? [];
    
    for (const node of children) {
      const isCollapsed = collapsedIds.has(node.id);
      const isVisible = parentVisible && !parentCollapsed;
      
      result.push({
        node,
        depth,
        isVisible,
      });
      
      traverse(node.id, depth + 1, isVisible, isCollapsed);
    }
  };
  
  traverse(null, 0, true, false);
  
  return result;
}

/**
 * 获取节点的所有后代
 */
export function getDescendants(
  nodeId: string,
  nodes: ScheduleNode[]
): ScheduleNode[] {
  const descendants: ScheduleNode[] = [];
  const childrenMap = buildChildrenMap(nodes);
  
  const collect = (parentId: string) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      descendants.push(child);
      collect(child.id);
    }
  };
  
  collect(nodeId);
  return descendants;
}

/**
 * 获取节点的路径
 */
export function getNodePath(
  nodeId: string,
  nodes: ScheduleNode[]
): ScheduleNode[] {
  const path: ScheduleNode[] = [];
  const nodeMap = new Map<string, ScheduleNode>();
  
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  let current = nodeMap.get(nodeId);
  
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  
  return path;
}

/**
 * 检查节点是否是另一个节点的后代
 */
export function isDescendant(
  potentialDescendantId: string,
  ancestorId: string,
  nodes: ScheduleNode[]
): boolean {
  const nodeMap = new Map<string, ScheduleNode>();
  
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  
  let current = nodeMap.get(potentialDescendantId);
  
  while (current) {
    if (current.parentId === ancestorId) {
      return true;
    }
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  
  return false;
}

/**
 * 计算子树高度（用于布局）
 */
export function calculateSubtreeHeight(
  nodeId: string,
  nodes: ScheduleNode[],
  nodeHeight: number,
  verticalGap: number
): number {
  const childrenMap = buildChildrenMap(nodes);
  
  const calculate = (parentId: string): number => {
    const children = childrenMap.get(parentId) ?? [];
    
    if (children.length === 0) {
      return nodeHeight + verticalGap;
    }
    
    let totalHeight = 0;
    for (const child of children) {
      totalHeight += calculate(child.id);
    }
    
    return Math.max(nodeHeight + verticalGap, totalHeight);
  };
  
  return calculate(nodeId);
}
