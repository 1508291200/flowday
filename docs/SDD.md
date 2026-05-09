# FlowDay 系统设计文档 (SDD)

**文档版本**: V1.0  
**编写日期**: 2026-04-28  
**文档状态**: 初稿

---

## 1. 文档概述

### 1.1 目的

本文档作为 FlowDay 日程管理工具的技术设计规范，详细描述系统架构、模块划分、接口契约和数据流设计，确保各模块能独立开发、测试和部署。

### 1.2 设计原则

| 原则 | 说明 | 实践方式 |
|------|------|----------|
| **低耦合** | 模块间依赖最小化 | 事件总线通信、接口契约 |
| **高内聚** | 相关功能集中管理 | 模块职责单一、边界清晰 |
| **可测试** | 支持单元测试和集成测试 | 依赖注入、Mock 机制 |
| **可扩展** | 支持后续功能迭代 | 插件化设计、配置驱动 |
| **性能优先** | 优化大数据量场景 | 虚拟化、懒加载、缓存 |

### 1.3 术语表

| 术语 | 定义 |
|------|------|
| Core Layer | 核心数据层，包含数据模型、业务逻辑、事件系统 |
| View Adapter | 视图适配层，将核心操作转换为视图特定实现 |
| Event Bus | 事件总线，模块间通信的中枢 |
| Dependency Injection | 依赖注入，通过接口注入依赖而非硬编码 |
| Virtual Scrolling | 虚拟滚动，仅渲染可见区域的列表项 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           应用层 (Application Layer)                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Presentation Components                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │   │
│  │  │  MindMap   │  │    List    │  │   Filter   │                 │   │
│  │  │    View    │  │    View    │  │    View    │                 │   │
│  │  └────────────┘  └────────────┘  └────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────┼─────────────────────────────────┐ │
│  │                         View Adapter Layer                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │ │
│  │  │ MindMapAdapter │  │  ListAdapter   │  │ FilterAdapter  │      │ │
│  │  └────────────────┘  └────────────────┘  └────────────────┘      │ │
│  └─────────────────────────────────┼─────────────────────────────────┘ │
│                                    │                                    │
├────────────────────────────────────┼────────────────────────────────────┤
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                          Core Layer                              │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │   │
│  │  │ Scheduler │  │    Tag    │  │   Filter  │  │   Event   │    │   │
│  │  │  Manager  │  │  Manager  │  │   Engine  │  │    Bus    │    │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │              Command Processor & Undo/Redo               │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
├────────────────────────────────────┼────────────────────────────────────┤
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Storage Layer                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │   │
│  │  │   IndexedDB     │  │  LocalStorage   │  │   Migration     │  │   │
│  │  │   (Dexie.js)    │  │  (Settings)     │  │   Manager       │  │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块依赖关系

```
                    ┌─────────────────┐
                    │   Presentation  │
                    │    Components   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  View Adapters  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌───────┴───────┐ ┌─────────┴────────┐
│  SchedulerMgr   │ │   TagMgr      │ │   FilterEngine   │
└────────┬────────┘ └───────┬───────┘ └─────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────┴────────┐
                    │    Event Bus    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────┴────────┐ ┌───────┴───────┐ ┌─────────┴────────┐
│  Command Proc   │ │  Undo/Redo    │ │   Storage Layer  │
└─────────────────┘ └───────────────┘ └──────────────────┘
```

**依赖规则**：
1. Presentation 层依赖 View Adapter 层
2. View Adapter 层依赖 Core Layer
3. Core Layer 内部各模块通过 Event Bus 通信
4. Storage Layer 被 Core Layer 调用，不依赖任何上层
5. **禁止反向依赖**：上层不得依赖下层细节

### 2.3 事件驱动架构

```
┌──────────────┐     emit      ┌──────────────┐     emit      ┌──────────────┐
│  Component   │ ─────────────▶│              │ ─────────────▶│  Component   │
│    (View)    │               │  Event Bus   │               │   (View)     │
└──────────────┘               └──────┬───────┘               └──────────────┘
                                     │
                    subscribe         │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│ SchedulerMgr │            │   TagMgr     │            │ FilterEngine │
└──────────────┘            └──────────────┘            └──────────────┘
```

**事件命名规范**：
```
[entity]:[action]
- node:created, node:updated, node:deleted, node:moved
- node:expanded, node:collapsed, node:completed
- tag:created, tag:updated, tag:deleted
- filter:changed, filter:applied
- tree:reordered
- ui:viewChanged, ui:selectionChanged
```

---

## 3. 模块详细设计

### 3.1 Core Layer

#### 3.1.1 SchedulerManager（日程管理器）

**职责**：管理日程节点的 CRUD 操作，维护树形数据结构。

**公共接口**：

```typescript
interface ISchedulerManager {
  // 数据查询
  getRootNode(): ScheduleNode;
  getNodeById(id: string): ScheduleNode | null;
  getAllNodes(): ScheduleNode[];
  getNodePath(id: string): ScheduleNode[];  // 获取到根节点的路径
  getChildren(parentId: string): ScheduleNode[];
  getDescendants(id: string): ScheduleNode[];  // 获取所有后代节点
  
  // 数据操作（返回命令对象）
  createNode(parentId: string | null, data: CreateNodeData): Command;
  updateNode(id: string, data: UpdateNodeData): Command;
  deleteNode(id: string): Command;
  moveNode(id: string, newParentId: string | null, order: number): Command;
  
  // 状态操作
  toggleCollapse(id: string): Command;
  toggleComplete(id: string): Command;
  
  // 批量操作
  batchMove(operations: MoveOperation[]): Command;
  batchDelete(ids: string[]): Command;
}

interface ScheduleNode {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5;
  dueDate: string | null;
  tags: string[];
  collapsed: boolean;
  order: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**内部实现**：
```typescript
class SchedulerManager implements ISchedulerManager {
  private tree: Map<string, ScheduleNode>;  // id -> node
  private childrenIndex: Map<string, Set<string>>;  // parentId -> childIds
  
  // 使用扁平化存储 + 索引实现高效查询
  // 根节点 parentId 为 null
}
```

#### 3.1.2 TagManager（标签管理器）

**职责**：管理标签的 CRUD 操作，维护标签与节点的关联。

**公共接口**：

```typescript
interface ITagManager {
  // 数据查询
  getAllTags(): Tag[];
  getTagById(id: string): Tag | null;
  getTagsByIds(ids: string[]): Tag[];
  getNodesByTag(tagId: string): string[];  // 返回节点ID列表
  
  // 数据操作
  createTag(name: string, color: string): Command;
  updateTag(id: string, data: UpdateTagData): Command;
  deleteTag(id: string): Command;
  
  // 使用统计
  getTagUsageCount(tagId: string): number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
```

#### 3.1.3 FilterEngine（筛选引擎）

**职责**：根据筛选条件过滤日程数据，支持多维度组合筛选和排序。

**公共接口**：

```typescript
interface IFilterEngine {
  // 筛选配置
  getDefaultConfig(): FilterConfig;
  setFilterConfig(config: FilterConfig): void;
  resetFilter(): void;
  
  // 筛选执行
  execute(nodes: ScheduleNode[]): ScheduleNode[];
  
  // 预设管理
  savePreset(name: string, config: FilterConfig): void;
  loadPreset(name: string): FilterConfig | null;
  deletePreset(name: string): void;
  getAllPresets(): FilterPreset[];
}

interface FilterConfig {
  importanceRange?: [number, number];  // [min, max]
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  tags?: {
    ids: string[];
    mode: 'AND' | 'OR';
  };
  completed?: boolean;
  searchKeyword?: string;
  sortBy: 'importance' | 'dueDate' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
}
```

**筛选算法**：
```
输入: nodes[], config
输出: filteredNodes[]

1. 预过滤：根据搜索关键字过滤（标题和描述模糊匹配）
2. 重要度过滤：保留 importance 在 [min, max] 范围内的节点
3. 日期过滤：保留 dueDate 在 [start, end] 范围内的节点
4. 标签过滤：根据 mode (AND/OR) 匹配标签
5. 状态过滤：根据 completed 布尔值过滤
6. 排序：根据 sortBy 和 sortOrder 排序
7. 返回结果
```

#### 3.1.4 EventBus（事件总线）

**职责**：实现模块间的发布-订阅通信，解耦模块依赖。

**公共接口**：

```typescript
type EventHandler<T = unknown> = (data: T) => void;

interface IEventBus {
  // 发布
  emit<T>(event: string, data: T): void;
  
  // 订阅
  on<T>(event: string, handler: EventHandler<T>): () => void;  // 返回取消订阅函数
  once<T>(event: string, handler: EventHandler<T>): void;
  
  // 批量订阅
  subscribe(events: string[], handler: EventHandler<unknown>): () => void;
  
  // 调试
  getEventHistory(): EventRecord[];
  clearHistory(): void;
}
```

**实现要点**：
- 使用 WeakMap 存储事件处理器，避免内存泄漏
- 支持同步和异步事件处理
- 提供事件历史记录用于调试

#### 3.1.5 CommandProcessor（命令处理器）

**职责**：统一处理所有数据操作命令，支持撤销/重做。

**公共接口**：

```typescript
interface ICommandProcessor {
  // 命令执行
  execute(command: Command): void;
  
  // 撤销/重做
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  
  // 历史记录
  getUndoStack(): Command[];
  getRedoStack(): Command[];
  clearHistory(): void;
}

interface Command {
  id: string;
  type: string;
  payload: unknown;
  execute(): void;
  undo(): void;
  timestamp: number;
}
```

**命令模式实现**：
```typescript
// 示例：删除节点命令
class DeleteNodeCommand implements Command {
  constructor(
    private nodeId: string,
    private node: ScheduleNode,  // 备份数据用于撤销
    private childNodes: ScheduleNode[]  // 子节点备份
  ) {}
  
  execute() {
    // 删除节点
    schedulerManager.deleteNodeDirectly(this.nodeId);
  }
  
  undo() {
    // 恢复节点
    schedulerManager.restoreNode(this.node, this.childNodes);
  }
}
```

### 3.2 View Adapter Layer

#### 3.2.1 设计原则

View Adapter 层是 Core 层与视图组件之间的桥梁，负责：
1. 将 Core 层的通用数据结构转换为视图特定的展示格式
2. 将视图的用户操作转换为 Core 层可执行的操作命令
3. 管理视图特有的状态（如选中状态、滚动位置）

**核心目标**：视图组件不直接依赖 Core 层，而是通过 Adapter 进行通信。

#### 3.2.2 MindMapAdapter

```typescript
interface IMindMapAdapter {
  // 数据转换
  buildLayoutData(tree: ScheduleNode): MindMapLayoutData;
  
  // 视图操作
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  centerOnNode(nodeId: string): void;
  
  // 状态同步
  syncSelection(selectedIds: string[]): void;
  
  // 事件处理
  onNodeDragEnd(handler: (operation: MoveOperation) => void): void;
  onNodeClick(handler: (nodeId: string) => void): void;
}

interface MindMapLayoutData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  viewport: ViewportState;
}

interface MindMapNode {
  id: string;
  x: number;
  y: number;
  data: ScheduleNode;
  collapsed: boolean;
  childrenCount: number;
}
```

#### 3.2.3 ListAdapter

```typescript
interface IListAdapter {
  // 数据转换
  buildListData(tree: ScheduleNode): ListItem[];
  
  // 视图操作
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  scrollToNode(nodeId: string): void;
  
  // 扁平化辅助
  flattenVisible(tree: ScheduleNode): FlattenedNode[];
  rebuildTree(flatNodes: FlattenedNode[]): ScheduleNode;
}

interface ListItem {
  id: string;
  node: ScheduleNode;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isVisible: boolean;
  path: string[];  // 父节点ID路径
}
```

#### 3.2.4 FilterAdapter

```typescript
interface IFilterAdapter {
  // 数据转换
  applyFilter(nodes: ScheduleNode[]): FilterResult;
  
  // 视图操作
  applyFilterConfig(config: FilterConfig): void;
  saveCurrentPreset(name: string): void;
  
  // 结果展示
  buildCardData(nodes: ScheduleNode[]): FilterCard[];
}

interface FilterResult {
  nodes: ScheduleNode[];
  totalCount: number;
  filteredCount: number;
  groupByTag?: Map<string, ScheduleNode[]>;
  groupByDate?: Map<string, ScheduleNode[]>;
}
```

### 3.3 Storage Layer

#### 3.3.1 存储设计

```typescript
interface IStorageLayer {
  // 数据持久化
  saveNodes(nodes: ScheduleNode[]): Promise<void>;
  loadNodes(): Promise<ScheduleNode[]>;
  
  saveTags(tags: Tag[]): Promise<void>;
  loadTags(): Promise<Tag[]>;
  
  saveFilterPresets(presets: FilterPreset[]): Promise<void>;
  loadFilterPresets(): Promise<FilterPreset[]>;
  
  // 设置管理
  saveSettings(settings: AppSettings): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  
  // 迁移支持
  getVersion(): Promise<string>;
  migrate(targetVersion: string): Promise<void>;
}
```

#### 3.3.2 数据版本管理

```typescript
interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate(data: unknown): unknown;
}

// 版本迁移链
const migrations: Migration[] = [
  { fromVersion: '1.0.0', toVersion: '1.1.0', migrate: migrateV1ToV2 },
  { fromVersion: '1.1.0', toVersion: '2.0.0', migrate: migrateV2ToV3 },
];
```

---

## 4. 接口契约定义

### 4.1 模块间接口矩阵

| 调用方 | 被调用方 | 接口 | 调用方式 |
|--------|----------|------|----------|
| View | MindMapAdapter | IMindMapAdapter | 依赖注入 |
| View | ListAdapter | IListAdapter | 依赖注入 |
| View | FilterAdapter | IFilterAdapter | 依赖注入 |
| MindMapAdapter | SchedulerManager | ISchedulerManager | 依赖注入 |
| MindMapAdapter | EventBus | IEventBus | 订阅事件 |
| ListAdapter | SchedulerManager | ISchedulerManager | 依赖注入 |
| FilterAdapter | FilterEngine | IFilterEngine | 依赖注入 |
| SchedulerManager | EventBus | IEventBus | 发布事件 |
| SchedulerManager | StorageLayer | IStorageLayer | 依赖注入 |
| CommandProcessor | SchedulerManager | ISchedulerManager | 调用方法 |
| App | 所有模块 | 各接口 | 依赖注入 |

### 4.2 事件订阅规范

**事件订阅示例**：
```typescript
// 正确做法：通过 EventBus 订阅，不直接依赖发布者
class MyView {
  private unsubscribe: (() => void) | null = null;
  
  init(eventBus: IEventBus) {
    this.unsubscribe = eventBus.on('node:updated', (node) => {
      this.refreshNode(node.id);
    });
  }
  
  destroy() {
    this.unsubscribe?.();
  }
}
```

### 4.3 依赖注入配置

```typescript
// 使用工厂函数创建完整的依赖注入容器
function createAppContainer(): AppContainer {
  // 底层服务
  const storage = new IndexedDBStorage();
  const eventBus = new EventBus();
  
  // 核心管理器
  const schedulerManager = new SchedulerManager(storage, eventBus);
  const tagManager = new TagManager(storage, eventBus);
  const filterEngine = new FilterEngine();
  const commandProcessor = new CommandProcessor(schedulerManager);
  
  // 适配器
  const mindMapAdapter = new MindMapAdapter(schedulerManager, eventBus);
  const listAdapter = new ListAdapter(schedulerManager, eventBus);
  const filterAdapter = new FilterAdapter(filterEngine, schedulerManager);
  
  return {
    storage,
    eventBus,
    schedulerManager,
    tagManager,
    filterEngine,
    commandProcessor,
    adapters: { mindMapAdapter, listAdapter, filterAdapter }
  };
}
```

---

## 5. 低耦合实现策略

### 5.1 核心原则

1. **单向依赖**：上层依赖下层，下层不感知上层
2. **接口隔离**：模块间通过接口而非实现类通信
3. **事件解耦**：模块间通过事件而非直接调用通信
4. **依赖注入**：通过构造函数注入依赖而非硬编码

### 5.2 具体策略

#### 策略一：事件驱动通信

```typescript
// 不推荐：直接耦合
class MindMapView {
  private scheduler: SchedulerManager;
  
  onNodeClick(id: string) {
    const node = this.scheduler.getNodeById(id);  // 直接依赖
    this.showDetailPanel(node);
  }
}

// 推荐：通过事件解耦
class MindMapView {
  private eventBus: IEventBus;
  
  onNodeClick(id: string) {
    this.eventBus.emit('ui:nodeSelected', { id });  // 发布事件
  }
}

// 详情面板订阅事件
class DetailPanel {
  private eventBus: IEventBus;
  
  init() {
    this.eventBus.on('ui:nodeSelected', ({ id }) => {
      const node = this.scheduler.getNodeById(id);
      this.show(node);
    });
  }
}
```

#### 策略二：命令模式解耦视图操作

```typescript
// 所有视图操作转换为命令对象
class ListViewController {
  onAddNode(parentId: string) {
    const command = this.schedulerManager.createNode(parentId, {
      title: '新节点'
    });
    this.commandProcessor.execute(command);  // 统一通过命令处理器
  }
  
  onDeleteNode(id: string) {
    const command = this.schedulerManager.deleteNode(id);
    this.commandProcessor.execute(command);
  }
}
```

#### 策略三：配置驱动视图

```typescript
// 视图样式和行为通过配置而非硬编码
const MindMapConfig = {
  nodeWidth: 180,
  nodeHeight: 40,
  horizontalGap: 60,
  verticalGap: 20,
  connectionStyle: {
    type: 'bezier',
    strokeWidth: 2,
    strokeColor: '#999'
  },
  animationDuration: 200
};
```

### 5.3 模块隔离测试

每个模块应能独立测试，不依赖其他模块：

```typescript
// 测试 SchedulerManager - Mock Storage 和 EventBus
describe('SchedulerManager', () => {
  let scheduler: SchedulerManager;
  let mockStorage: jest.Mocked<IStorageLayer>;
  let mockEventBus: jest.Mocked<IEventBus>;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    mockEventBus = createMockEventBus();
    scheduler = new SchedulerManager(mockStorage, mockEventBus);
  });
  
  it('should emit node:created after creating node', () => {
    scheduler.createNode(null, { title: 'Test' });
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'node:created',
      expect.objectContaining({ title: 'Test' })
    );
  });
});
```

---

## 6. 性能优化设计

### 6.1 虚拟滚动

```typescript
// 列表视图虚拟滚动配置
const VirtualScrollConfig = {
  itemHeight: 48,  // 固定行高
  overscan: 5,     // 预渲染额外行数
  bufferSize: 10   // 缓冲区大小
};
```

### 6.2 懒加载策略

```typescript
// 思维导图节点懒加载
class MindMapNode {
  private childrenLoaded = false;
  
  expand() {
    if (!this.childrenLoaded) {
      this.loadChildrenAsync().then(children => {
        this.renderChildren(children);
        this.childrenLoaded = true;
      });
    }
  }
}
```

### 6.3 增量渲染

```typescript
// 只更新受影响的部分
class OptimizedRenderer {
  updateNode(nodeId: string, newData: Partial<ScheduleNode>) {
    const existingNode = this.getNodeFromCache(nodeId);
    
    // 计算差异
    const diff = computeDiff(existingNode, newData);
    
    // 只更新有变化的属性
    if (diff.position) {
      this.updatePosition(nodeId, diff.position);
    }
    if (diff.style) {
      this.updateStyle(nodeId, diff.style);
    }
    if (diff.text) {
      this.updateText(nodeId, diff.text);
    }
  }
}
```

---

## 7. 错误处理设计

### 7.1 错误分类

| 错误类型 | 说明 | 处理策略 |
|----------|------|----------|
| ValidationError | 输入验证失败 | 提示用户修正 |
| NotFoundError | 资源不存在 | 提示用户，刷新数据 |
| StorageError | 存储操作失败 | 重试或提示用户 |
| SyncError | 同步失败 | 自动重试，显示状态 |

### 7.2 错误边界

```typescript
// React 错误边界
class ViewErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('View render error', { error, errorInfo });
    this.setState({ hasError: true });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

---

## 8. 安全设计

### 8.1 数据安全

| 措施 | 说明 |
|------|------|
| XSS 防护 | 所有用户输入进行 HTML 转义 |
| 数据验证 | 前端验证 + 后端验证双重保障 |
| 权限控制 | 基于用户的数据访问控制（V2.0） |

### 8.2 隐私保护

- 本地存储数据不包含敏感个人信息
- 不追踪用户具体日程内容
- 数据导出功能让用户完全掌控自己的数据

---

## 9. 监控与日志

### 9.1 关键指标

| 指标 | 说明 | 采集频率 |
|------|------|----------|
| 视图切换时间 | 记录各视图切换耗时 | 实时 |
| 操作响应时间 | CRUD 操作耗时 | 实时 |
| 渲染帧率 | 动画流畅度监控 | 实时 |
| 错误率 | 各类错误发生频率 | 实时 |

### 9.2 日志规范

```typescript
// 日志格式
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  action: string;
  data?: unknown;
  userId?: string;
  sessionId: string;
}

// 日志级别使用场景
// debug: 开发调试，详细执行流程
// info: 用户操作，正常业务事件
// warn: 潜在问题，如存储空间警告
// error: 错误异常，如保存失败
```

---

**文档结束**

*本文档为 FlowDay V1.0 版本的系统设计规范，与 SRS.md 配合使用。*