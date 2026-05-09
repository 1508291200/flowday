# FlowDay V1.0 初版详细设计方案

**文档版本**: V1.0  
**编写日期**: 2026-04-28  
**开发周期**: 13周 (5个里程碑)

---

## 1. V1.0 范围定义

### 1.1 交付目标

V1.0 版本定位为**最小可行产品 (MVP)**，专注于验证核心价值：
- 三种视图展示同一份日程数据
- 基础 CRUD 操作
- 数据持久化
- 筛选排序功能

### 1.2 功能范围

| 模块 | 包含功能 | 排除功能 |
|------|----------|----------|
| **思维导图视图** | 节点展示、折叠展开、拖拽排序、画布缩放平移 | 多人协作、节点样式自定义 |
| **列表视图** | 树形列表、折叠展开、拖拽调整层级、完成状态 | 批量编辑、多列排序 |
| **筛选视图** | 多维度筛选、排序、结果展示 | 筛选预设保存、筛选结果导出 |
| **数据层** | 本地存储、数据同步 | 云端同步、冲突解决 |
| **标签系统** | 基础CRUD、颜色选择 | 标签分组、标签合并 |

### 1.3 验收标准

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 首屏加载 | ≤ 2秒 | 首次打开应用 |
| 视图切换 | ≤ 100ms | 三种视图之间切换 |
| 数据同步 | ≤ 50ms | 任意视图修改后其他视图更新 |
| 支持节点数 | ≥ 500 | 流畅运行的最大节点数 |
| 功能完成度 | 100% | 所有计划功能已实现并测试通过 |

---

## 2. 技术架构

### 2.1 技术栈选型

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| **框架** | React 18 + TypeScript | 组件化、类型安全、生态丰富 |
| **状态管理** | Zustand | 轻量、简洁、支持中间件 |
| **思维导图** | React Flow | 专业的节点图渲染库、定制能力强 |
| **列表渲染** | @tanstack/react-virtual | 高性能虚拟列表 |
| **样式方案** | Tailwind CSS | 快速开发、一致性设计 |
| **本地存储** | IndexedDB (Dexie.js) | 大量数据存储、高性能 |
| **构建工具** | Vite | 快速热更新、优化的生产构建 |
| **包管理** | pnpm | 快速、节省空间 |

### 2.2 项目结构

```
FlowDay/
├── public/
│   └── index.html
├── src/
│   ├── main.tsx                    # 入口文件
│   ├── App.tsx                     # 根组件
│   │
│   ├── core/                       # 核心层 (无UI依赖)
│   │   ├── index.ts               # 核心模块导出
│   │   ├── types.ts               # 类型定义
│   │   ├── SchedulerManager.ts    # 日程管理器
│   │   ├── TagManager.ts          # 标签管理器
│   │   ├── FilterEngine.ts        # 筛选引擎
│   │   ├── EventBus.ts            # 事件总线
│   │   ├── CommandProcessor.ts     # 命令处理器
│   │   ├── Storage.ts             # 存储层
│   │   └── uuid.ts                # UUID生成工具
│   │
│   ├── adapters/                   # 视图适配层
│   │   ├── index.ts
│   │   ├── MindMapAdapter.ts      # 思维导图适配器
│   │   ├── ListAdapter.ts          # 列表适配器
│   │   └── FilterAdapter.ts       # 筛选适配器
│   │
│   ├── components/                 # UI组件
│   │   ├── common/                 # 通用组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                 # 布局组件
│   │   │   ├── Header.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── mindmap/                # 思维导图视图组件
│   │   │   ├── MindMapView.tsx
│   │   │   ├── MindMapNode.tsx
│   │   │   ├── MindMapToolbar.tsx
│   │   │   └── NodeDetailPanel.tsx
│   │   │
│   │   ├── list/                   # 列表视图组件
│   │   │   ├── ListView.tsx
│   │   │   ├── ListItem.tsx
│   │   │   ├── ListToolbar.tsx
│   │   │   └── FilterBar.tsx
│   │   │
│   │   └── filter/                 # 筛选视图组件
│   │       ├── FilterView.tsx
│   │       ├── FilterPanel.tsx
│   │       ├── FilterCard.tsx
│   │       └── SortControls.tsx
│   │
│   ├── stores/                     # Zustand状态库
│   │   ├── appStore.ts             # 应用状态
│   │   ├── schedulerStore.ts       # 日程状态
│   │   └── filterStore.ts          # 筛选状态
│   │
│   ├── hooks/                      # React Hooks
│   │   ├── useScheduler.ts         # 日程操作Hook
│   │   ├── useTags.ts              # 标签操作Hook
│   │   ├── useFilter.ts            # 筛选操作Hook
│   │   └── useEventBus.ts          # 事件订阅Hook
│   │
│   ├── utils/                      # 工具函数
│   │   ├── date.ts                 # 日期处理
│   │   ├── tree.ts                 # 树操作工具
│   │   └── debounce.ts             # 防抖函数
│   │
│   └── styles/                     # 样式文件
│       ├── globals.css             # 全局样式
│       └── tailwind.css            # Tailwind入口
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 3. 核心模块实现方案

### 3.1 EventBus 实现

```typescript
// src/core/EventBus.ts
export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private history: EventRecord[] = [];
  private maxHistorySize = 100;

  emit<T extends EventType>(event: T, data: EventDataMap[T]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
    
    // 记录历史
    this.history.push({
      event,
      data,
      timestamp: Date.now(),
      source: 'EventBus'
    });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  on<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    
    // 返回取消订阅函数
    return () => this.off(event, handler as EventHandler);
  }

  once<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): void {
    const wrappedHandler = (data: EventDataMap[T]) => {
      handler(data);
      this.off(event, wrappedHandler as EventHandler);
    };
    this.on(event, wrappedHandler as EventHandler<EventDataMap[T]>);
  }

  off<T extends EventType>(event: T, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  getEventHistory(): EventRecord[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
```

### 3.2 SchedulerManager 实现

```typescript
// src/core/SchedulerManager.ts
export class SchedulerManager implements ISchedulerManager {
  private nodes: Map<string, ScheduleNode> = new Map();
  private rootId: string = 'root';
  private eventBus: IEventBus;
  
  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.initializeRootNode();
  }

  private initializeRootNode(): void {
    const root: ScheduleNode = {
      id: this.rootId,
      parentId: null,
      title: '我的日程',
      description: '',
      importance: 3,
      dueDate: null,
      tags: [],
      collapsed: false,
      order: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.nodes.set(root.id, root);
  }

  createNode(parentId: string | null, data: CreateNodeData): ScheduleNode {
    const id = generateUUID();
    const parent = parentId ? this.nodes.get(parentId) : null;
    const siblings = parent ? this.getChildren(parent.id) : [];
    
    const node: ScheduleNode = {
      id,
      parentId: parentId,
      title: data.title ?? '新节点',
      description: data.description ?? '',
      importance: data.importance ?? 3,
      dueDate: data.dueDate ?? null,
      tags: data.tags ?? [],
      collapsed: false,
      order: siblings.length,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.nodes.set(id, node);
    this.eventBus.emit('node:created', node);
    return node;
  }

  updateNode(id: string, data: UpdateNodeData): ScheduleNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    
    const updated: ScheduleNode = {
      ...node,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    this.nodes.set(id, updated);
    this.eventBus.emit('node:updated', updated);
    return updated;
  }

  deleteNode(id: string): void {
    if (id === this.rootId) {
      throw new Error('Cannot delete root node');
    }
    
    // 递归删除所有后代
    const deleteRecursive = (nodeId: string) => {
      const children = this.getChildren(nodeId);
      children.forEach(child => deleteRecursive(child.id));
      this.nodes.delete(nodeId);
    };
    
    deleteRecursive(id);
    this.eventBus.emit('node:deleted', { id });
  }

  moveNode(id: string, newParentId: string | null, order: number): void {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    
    // 检测循环引用
    if (newParentId && this.isDescendant(newParentId, id)) {
      throw new Error('Cannot move node to its own descendant');
    }
    
    const oldParentId = node.parentId;
    const oldOrder = node.order;
    
    const updated: ScheduleNode = {
      ...node,
      parentId: newParentId,
      order,
      updatedAt: new Date().toISOString(),
    };
    
    this.nodes.set(id, updated);
    this.eventBus.emit('node:moved', { 
      id, 
      oldParentId, 
      newParentId, 
      oldOrder, 
      newOrder: order 
    });
  }

  toggleCollapse(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    
    const collapsed = !node.collapsed;
    this.updateNode(id, { collapsed } as any);
    
    if (collapsed) {
      this.eventBus.emit('node:collapsed', { id });
    } else {
      this.eventBus.emit('node:expanded', { id });
    }
  }

  toggleComplete(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    
    const completed = !node.completed;
    this.updateNode(id, { completed } as any);
    
    if (completed) {
      this.eventBus.emit('node:completed', { id });
    } else {
      this.eventBus.emit('node:uncompleted', { id });
    }
  }

  getNodeById(id: string): ScheduleNode | null {
    return this.nodes.get(id) ?? null;
  }

  getRootNode(): ScheduleNode {
    return this.nodes.get(this.rootId)!;
  }

  getAllNodes(): ScheduleNode[] {
    return Array.from(this.nodes.values());
  }

  getChildren(parentId: string): ScheduleNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  getNodePath(id: string): ScheduleNode[] {
    const path: ScheduleNode[] = [];
    let current = this.nodes.get(id);
    
    while (current) {
      path.unshift(current);
      current = current.parentId ? this.nodes.get(current.parentId) : undefined;
    }
    
    return path;
  }

  private isDescendant(potentialDescendantId: string, ancestorId: string): boolean {
    let current = this.nodes.get(potentialDescendantId);
    while (current) {
      if (current.parentId === ancestorId) return true;
      current = current.parentId ? this.nodes.get(current.parentId) : undefined;
    }
    return false;
  }
}
```

### 3.3 FilterEngine 实现

```typescript
// src/core/FilterEngine.ts
export class FilterEngine implements IFilterEngine {
  private config: FilterConfig;
  private presets: FilterPreset[] = [];

  constructor() {
    this.config = { ...DEFAULT_FILTER_CONFIG };
  }

  getDefaultConfig(): FilterConfig {
    return { ...DEFAULT_FILTER_CONFIG };
  }

  setFilterConfig(config: FilterConfig): void {
    this.config = { ...config };
  }

  getCurrentConfig(): FilterConfig {
    return { ...this.config };
  }

  resetFilter(): void {
    this.config = this.getDefaultConfig();
  }

  execute(nodes: ScheduleNode[]): ScheduleNode[] {
    let result = [...nodes];
    
    // 1. 搜索关键字过滤
    if (this.config.searchKeyword) {
      const keyword = this.config.searchKeyword.toLowerCase();
      result = result.filter(node => 
        node.title.toLowerCase().includes(keyword) ||
        node.description.toLowerCase().includes(keyword)
      );
    }
    
    // 2. 重要度范围过滤
    if (this.config.importanceRange) {
      const [min, max] = this.config.importanceRange;
      result = result.filter(node => 
        node.importance >= min && node.importance <= max
      );
    }
    
    // 3. 日期范围过滤
    if (this.config.dueDateRange) {
      const { start, end } = this.config.dueDateRange;
      result = result.filter(node => {
        if (!node.dueDate) return false;
        const date = new Date(node.dueDate);
        if (start && date < new Date(start)) return false;
        if (end && date > new Date(end)) return false;
        return true;
      });
    }
    
    // 4. 标签过滤
    if (this.config.tags && this.config.tags.ids.length > 0) {
      const { ids, mode } = this.config.tags;
      if (mode === 'AND') {
        result = result.filter(node => 
          ids.every(tagId => node.tags.includes(tagId))
        );
      } else {
        result = result.filter(node => 
          ids.some(tagId => node.tags.includes(tagId))
        );
      }
    }
    
    // 5. 完成状态过滤
    if (this.config.completed !== undefined) {
      result = result.filter(node => node.completed === this.config.completed);
    }
    
    // 6. 排序
    result = this.sortNodes(result);
    
    return result;
  }

  private sortNodes(nodes: ScheduleNode[]): ScheduleNode[] {
    const { sortBy, sortOrder } = this.config;
    
    return [...nodes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'importance':
          comparison = a.importance - b.importance;
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  savePreset(name: string, config: FilterConfig): void {
    const preset: FilterPreset = {
      id: generateUUID(),
      name,
      config,
      createdAt: new Date().toISOString(),
    };
    this.presets.push(preset);
  }

  loadPreset(name: string): FilterConfig | null {
    const preset = this.presets.find(p => p.name === name);
    if (preset) {
      this.config = { ...preset.config };
    }
    return preset?.config ?? null;
  }

  deletePreset(name: string): void {
    this.presets = this.presets.filter(p => p.name !== name);
  }

  getAllPresets(): FilterPreset[] {
    return [...this.presets];
  }
}
```

---

## 4. 视图实现方案

### 4.1 思维导图视图 (MindMapView)

**技术选型**：React Flow

**核心组件**：

```typescript
// src/components/mindmap/MindMapView.tsx
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useScheduler } from '@/hooks/useScheduler';
import { useEventBus } from '@/hooks/useEventBus';
import MindMapNode from './MindMapNode';
import MindMapToolbar from './MindMapToolbar';
import { DEFAULT_MINDMAP_SETTINGS } from '@/core/types';

const nodeTypes = {
  scheduleNode: MindMapNode,
};

export function MindMapView() {
  const { getAllNodes, toggleCollapse, moveNode, createNode } = useScheduler();
  const eventBus = useEventBus();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // 初始化数据
  const initializeData = useCallback(() => {
    const allNodes = getAllNodes();
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    // 布局计算
    const layout = calculateLayout(allNodes, DEFAULT_MINDMAP_SETTINGS);
    
    allNodes.forEach(node => {
      const pos = layout[node.id];
      flowNodes.push({
        id: node.id,
        type: 'scheduleNode',
        position: pos,
        data: { 
          ...node,
          onToggleCollapse: () => toggleCollapse(node.id),
        },
      });
      
      if (node.parentId) {
        flowEdges.push({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'smoothstep',
          style: { stroke: '#999', strokeWidth: 2 },
        });
      }
    });
    
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [getAllNodes, setNodes, setEdges, toggleCollapse]);
  
  // 监听数据变化
  useEffect(() => {
    initializeData();
    return eventBus.on('tree:reordered', initializeData);
  }, []);
  
  // 处理节点拖拽结束
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // 计算新位置对应的父节点和顺序
    // 调用 moveNode 更新数据
  }, []);
  
  return (
    <div className="w-full h-full">
      <MindMapToolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
}

// 简单的树形布局算法
function calculateLayout(
  nodes: ScheduleNode[], 
  settings: MindMapSettings
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const childrenMap = new Map<string | null, ScheduleNode[]>();
  
  // 按层级分组
  nodes.forEach(node => {
    const siblings = childrenMap.get(node.parentId) || [];
    siblings.push(node);
    childrenMap.set(node.parentId, siblings);
  });
  
  // 按顺序排序
  childrenMap.forEach(siblings => {
    siblings.sort((a, b) => a.order - b.order);
  });
  
  // 计算位置
  const calculatePosition = (parentId: string | null, depth: number, startY: number) => {
    const children = childrenMap.get(parentId) || [];
    let currentY = startY;
    
    children.forEach((child, index) => {
      positions[child.id] = {
        x: depth * (settings.nodeWidth + settings.horizontalGap),
        y: currentY,
      };
      
      const subtreeHeight = calculateSubtreeHeight(child.id, childrenMap, settings);
      currentY += subtreeHeight;
    });
  };
  
  const calculateSubtreeHeight = (
    nodeId: string, 
    childrenMap: Map<string | null, ScheduleNode[]>,
    settings: MindMapSettings
  ): number => {
    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      return settings.nodeHeight + settings.verticalGap;
    }
    
    let totalHeight = 0;
    children.forEach(child => {
      totalHeight += calculateSubtreeHeight(child.id, childrenMap, settings);
    });
    
    return Math.max(settings.nodeHeight + settings.verticalGap, totalHeight);
  };
  
  calculatePosition(null, 0, 100);
  
  return positions;
}
```

### 4.2 列表视图 (ListView)

**技术选型**：@tanstack/react-virtual

```typescript
// src/components/list/ListView.tsx
import { useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useScheduler } from '@/hooks/useScheduler';
import { useEventBus } from '@/hooks/useEventBus';
import ListItem from './ListItem';
import ListToolbar from './ListToolbar';
import { FlattenedNode } from '@/core/types';

export function ListView() {
  const { getAllNodes, toggleCollapse, toggleComplete, createNode } = useScheduler();
  const eventBus = useEventBus();
  
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // 将树结构扁平化
  const flattenNodes = useCallback((): FlattenedNode[] => {
    const allNodes = getAllNodes();
    const result: FlattenedNode[] = [];
    
    const traverse = (parentId: string | null, depth: number, path: string[]) => {
      const children = allNodes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      
      children.forEach((node, index) => {
        const isCollapsed = collapsedIds.has(node.id);
        const hasChildren = allNodes.some(n => n.parentId === node.id);
        const isLastChild = index === children.length - 1;
        
        result.push({
          id: node.id,
          node,
          depth,
          isExpanded: !isCollapsed,
          hasChildren,
          isVisible: true, // TODO: 根据父节点折叠状态计算
          parentPath: [...path],
          indent: depth * 24,
          isLastChild,
          hasVisibleChildren: hasChildren && !isCollapsed,
        });
        
        if (!isCollapsed) {
          traverse(node.id, depth + 1, [...path, node.id]);
        }
      });
    };
    
    traverse(null, 0, []);
    return result;
  }, [getAllNodes, collapsedIds]);
  
  const flattenedNodes = useMemo(() => flattenNodes(), [flattenNodes]);
  
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => document.querySelector('.list-scroll-container'),
    estimateSize: () => 48,
    overscan: 5,
  });
  
  // 处理折叠/展开
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // 处理添加节点
  const handleAddNode = useCallback((parentId: string | null) => {
    createNode(parentId, { title: '新节点' });
  }, [createNode]);
  
  return (
    <div className="w-full h-full flex flex-col">
      <ListToolbar />
      <div className="flex-1 overflow-auto list-scroll-container">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const item = flattenedNodes[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ListItem
                  item={item}
                  onToggleCollapse={handleToggleCollapse}
                  onToggleComplete={() => toggleComplete(item.id)}
                  onAddChild={() => handleAddNode(item.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### 4.3 筛选视图 (FilterView)

```typescript
// src/components/filter/FilterView.tsx
import { useState, useCallback, useMemo } from 'react';
import { useScheduler } from '@/hooks/useScheduler';
import { useTags } from '@/hooks/useTags';
import FilterPanel from './FilterPanel';
import FilterCard from './FilterCard';
import { useFilterEngine } from '@/hooks/useFilter';
import { DEFAULT_FILTER_CONFIG, ImportanceLevel } from '@/core/types';

export function FilterView() {
  const { getAllNodes } = useScheduler();
  const { getAllTags } = useTags();
  const { executeFilter, setFilterConfig, currentConfig } = useFilterEngine();
  
  // 本地筛选状态
  const [localConfig, setLocalConfig] = useState(currentConfig);
  
  // 执行筛选
  const filteredNodes = useMemo(() => {
    return executeFilter(getAllNodes());
  }, [getAllNodes, currentConfig]);
  
  // 应用筛选
  const handleApplyFilter = useCallback(() => {
    setFilterConfig(localConfig);
  }, [localConfig, setFilterConfig]);
  
  // 更新筛选条件
  const updateConfig = useCallback((updates: Partial<typeof localConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  return (
    <div className="w-full h-full flex flex-col">
      <FilterPanel
        config={localConfig}
        tags={getAllTags()}
        onChange={updateConfig}
        onApply={handleApplyFilter}
        onReset={() => setLocalConfig(DEFAULT_FILTER_CONFIG)}
      />
      
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 text-sm text-gray-500">
          共找到 {filteredNodes.length} 条结果
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNodes.map(node => (
            <FilterCard
              key={node.id}
              node={node}
              tags={getAllTags().filter(t => node.tags.includes(t.id))}
            />
          ))}
        </div>
        
        {filteredNodes.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            没有找到符合条件的日程
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 5. 状态管理方案

### 5.1 Zustand Store 设计

```typescript
// src/stores/schedulerStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { SchedulerManager } from '@/core/SchedulerManager';
import { EventBus } from '@/core/EventBus';
import { Storage } from '@/core/Storage';

interface SchedulerState {
  manager: SchedulerManager;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

export const useSchedulerStore = create<SchedulerState>()(
  subscribeWithSelector((set, get) => {
    const eventBus = new EventBus();
    const storage = new Storage();
    const manager = new SchedulerManager(eventBus);
    
    return {
      manager,
      initialized: false,
      loading: true,
      error: null,
      
      // 初始化
      async initialize() {
        try {
          set({ loading: true, error: null });
          
          // 从存储加载数据
          const nodes = await storage.loadNodes();
          if (nodes.length > 0) {
            // 恢复到 manager
            nodes.forEach(node => {
              if (node.id !== 'root') {
                manager.createNode(node.parentId, node);
              }
            });
          }
          
          set({ initialized: true, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      
      // 保存数据
      async save() {
        try {
          const nodes = manager.getAllNodes();
          await storage.saveNodes(nodes);
        } catch (error) {
          console.error('Failed to save:', error);
        }
      },
    };
  })
);

// src/hooks/useScheduler.ts
export function useScheduler() {
  const store = useSchedulerStore();
  
  return useMemo(() => ({
    getAllNodes: () => store.manager.getAllNodes(),
    getNodeById: (id: string) => store.manager.getNodeById(id),
    createNode: (parentId: string | null, data: any) => store.manager.createNode(parentId, data),
    updateNode: (id: string, data: any) => store.manager.updateNode(id, data),
    deleteNode: (id: string) => store.manager.deleteNode(id),
    moveNode: (id: string, parentId: string | null, order: number) => 
      store.manager.moveNode(id, parentId, order),
    toggleCollapse: (id: string) => store.manager.toggleCollapse(id),
    toggleComplete: (id: string) => store.manager.toggleComplete(id),
  }), [store.manager]);
}
```

---

## 6. 数据持久化方案

### 6.1 IndexedDB Schema

```typescript
// src/core/Storage.ts
import Dexie, { Table } from 'dexie';

interface StoredNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  importance: number;
  dueDate: string | null;
  tags: string[];
  collapsed: boolean;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

interface StoredPreset {
  id: string;
  name: string;
  config: string; // JSON stringified
  createdAt: string;
}

interface StoredSetting {
  key: string;
  value: string;
}

class FlowDayDatabase extends Dexie {
  nodes!: Table<StoredNode>;
  tags!: Table<StoredTag>;
  presets!: Table<StoredPreset>;
  settings!: Table<StoredSetting>;

  constructor() {
    super('FlowDayDB');
    this.version(1).stores({
      nodes: 'id, parentId, *tags, importance, dueDate, completed',
      tags: 'id, name',
      presets: 'id, name',
      settings: 'key',
    });
  }
}

export class Storage implements IStorageLayer {
  private db = new FlowDayDatabase();

  async saveNodes(nodes: ScheduleNode[]): Promise<void> {
    await this.db.nodes.clear();
    await this.db.nodes.bulkAdd(nodes.map(n => ({ ...n })));
  }

  async loadNodes(): Promise<ScheduleNode[]> {
    return this.db.nodes.toArray();
  }

  async saveTags(tags: Tag[]): Promise<void> {
    await this.db.tags.clear();
    await this.db.tags.bulkAdd(tags.map(t => ({ ...t })));
  }

  async loadTags(): Promise<Tag[]> {
    return this.db.tags.toArray();
  }

  async savePresets(presets: FilterPreset[]): Promise<void> {
    await this.db.presets.clear();
    await this.db.presets.bulkAdd(presets.map(p => ({
      ...p,
      config: JSON.stringify(p.config),
    })));
  }

  async loadPresets(): Promise<FilterPreset[]> {
    const raw = await this.db.presets.toArray();
    return raw.map(p => ({
      ...p,
      config: JSON.parse(p.config),
    }));
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.db.settings.put({
      key: 'appSettings',
      value: JSON.stringify(settings),
    });
  }

  async loadSettings(): Promise<AppSettings> {
    const record = await this.db.settings.get('appSettings');
    return record ? JSON.parse(record.value) : DEFAULT_APP_SETTINGS;
  }

  async getVersion(): Promise<string> {
    const record = await this.db.settings.get('version');
    return record?.value || '1.0.0';
  }

  async setVersion(version: string): Promise<void> {
    await this.db.settings.put({ key: 'version', value: version });
  }
}
```

---

## 7. 开发里程碑

### 7.1 M1: 核心数据层 + 列表视图 (4周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 1 | 环境搭建、项目结构、EventBus、基础类型 | 可运行的空项目 |
| Week 2 | SchedulerManager、TagManager 实现 | 数据层基础功能 |
| Week 3 | 列表视图 UI 组件开发 | 基础列表界面 |
| Week 4 | 列表视图交互（折叠、添加、编辑） | 可用的列表功能 |
| **交付** | - | **MVP 基础版本** |

### 7.2 M2: 思维导图视图 (3周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 5 | React Flow 集成、基础节点渲染 | 思维导图框架 |
| Week 6 | 布局算法、拖拽交互 | 可拖拽的思维导图 |
| Week 7 | 视图切换、数据同步 | 双视图可用 |
| **交付** | - | **双视图版本** |

### 7.3 M3: 筛选视图 (2周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 8 | FilterEngine 实现 | 筛选逻辑 |
| Week 9 | 筛选视图 UI、排序功能 | 筛选视图完成 |
| **交付** | - | **三视图版本** |

### 7.4 M4: 本地持久化 (2周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 10 | IndexedDB 集成、Storage 层 | 持久化基础 |
| Week 11 | 数据迁移、自动保存 | 数据完整性 |
| **交付** | - | **可持久化版本** |

### 7.5 M5: 优化与测试 (2周)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| Week 12 | 性能优化、bug 修复 | 优化版本 |
| Week 13 | 测试补全、文档完善 | **V1.0 正式发布** |

---

## 8. 测试策略

### 8.1 单元测试

| 模块 | 覆盖率目标 | 测试重点 |
|------|------------|----------|
| SchedulerManager | ≥ 90% | CRUD操作、树操作、边界条件 |
| TagManager | ≥ 90% | CRUD操作、关联查询 |
| FilterEngine | ≥ 95% | 所有筛选条件组合、排序逻辑 |
| EventBus | ≥ 80% | 订阅/取消/历史记录 |

### 8.2 集成测试

| 场景 | 测试用例 |
|------|----------|
| 视图同步 | 在任一视图修改数据，验证其他视图同步 |
| 数据持久化 | 刷新页面验证数据恢复 |
| 筛选同步 | 筛选条件变更后三个视图同步更新 |

### 8.3 E2E 测试

| 功能 | 测试场景 |
|------|----------|
| 创建日程 | 创建父节点→创建子节点→验证层级 |
| 思维导图拖拽 | 拖拽节点→验证位置更新→验证数据同步 |
| 列表筛选 | 设置筛选→验证结果→清空筛选→验证恢复 |

---

## 9. 风险评估与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| React Flow 定制困难 | 中 | 高 | 提前研究 API，预留两周缓冲 |
| 大数据量性能问题 | 中 | 中 | 实施虚拟滚动，限制渲染数量 |
| 存储容量限制 | 低 | 中 | 实现数据归档功能 |
| 跨浏览器兼容 | 低 | 中 | 使用主流浏览器，使用 CSS polyfill |

---

**文档结束**

*本文档为 FlowDay V1.0 版本的详细设计方案，作为开发团队的编码指南。*