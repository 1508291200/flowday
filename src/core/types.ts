/**
 * FlowDay TypeScript 类型定义文件
 * 
 * 本文件定义 FlowDay 日程管理工具的所有数据模型和接口契约
 * 遵循低耦合原则，各模块通过接口进行通信
 */

// ============================================================================
// 核心数据类型 (Core Types)
// ============================================================================

/** 日程节点 - 组成日程树的基本单元 */
export interface ScheduleNode {
  /** 唯一标识符 (UUID v4) */
  id: string;
  /** 父节点ID，顶级节点为 null */
  parentId: string | null;
  /** 日程标题 (1-200 字符) */
  title: string;
  /** 详细描述 (0-2000 字符) */
  description: string;
  /** 重要程度 (1-5, 1=最低, 5=最高) */
  importance: ImportanceLevel;
  /** 截止日期 (ISO 8601 格式) */
  dueDate: string | null;
  /** 关联标签ID数组 */
  tags: string[];
  /** 是否折叠（隐藏子节点） */
  collapsed: boolean;
  /** 同级排序权重 (越小越靠前) */
  order: number;
  /** 是否完成 */
  completed: boolean;
  /** 创建时间 (ISO 8601) */
  createdAt: string;
  /** 最后更新时间 (ISO 8601) */
  updatedAt: string;
}

/** 重要度等级 */
export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;

/** 创建节点时可选的数据 */
export type CreateNodeData = Partial<Omit<ScheduleNode, 'id' | 'createdAt' | 'updatedAt'>>;

/** 更新节点时可用的数据 */
export type UpdateNodeData = Partial<Omit<ScheduleNode, 'id' | 'createdAt'>>;

/** 标签 */
export interface Tag {
  /** 唯一标识符 */
  id: string;
  /** 标签名称 */
  name: string;
  /** 标签颜色 (HEX格式) */
  color: string;
  /** 创建时间 */
  createdAt: string;
}

/** 创建标签数据 */
export interface CreateTagData {
  name: string;
  color: string;
}

/** 更新标签数据 */
export type UpdateTagData = Partial<Omit<Tag, 'id' | 'createdAt'>>;

/** 筛选配置 */
export interface FilterConfig {
  /** 重要度范围 [min, max] */
  importanceRange?: [ImportanceLevel, ImportanceLevel];
  /** 日期范围 */
  dueDateRange?: DateRange;
  /** 标签筛选条件 */
  tags?: TagFilter;
  /** 完成状态筛选 (undefined = 不限制) */
  completed?: boolean;
  /** 搜索关键字 */
  searchKeyword?: string;
  /** 排序字段 */
  sortBy: SortField;
  /** 排序方向 */
  sortOrder: SortOrder;
}

/** 日期范围 */
export interface DateRange {
  start?: string;
  end?: string;
}

/** 标签筛选 */
export interface TagFilter {
  /** 标签ID数组 */
  ids: string[];
  /** 匹配模式: AND = 全部包含, OR = 任意包含 */
  mode: 'AND' | 'OR';
}

/** 排序字段 */
export type SortField = 'importance' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title';

/** 排序方向 */
export type SortOrder = 'asc' | 'desc';

/** 筛选预设 */
export interface FilterPreset {
  /** 预设ID */
  id: string;
  /** 预设名称 */
  name: string;
  /** 筛选配置 */
  config: FilterConfig;
  /** 创建时间 */
  createdAt: string;
}

// ============================================================================
// 命令模式 (Command Pattern)
// ============================================================================

/** 操作类型枚举 */
export type OperationType =
  | 'CREATE_NODE'
  | 'UPDATE_NODE'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'TOGGLE_COLLAPSE'
  | 'TOGGLE_COMPLETE'
  | 'CREATE_TAG'
  | 'UPDATE_TAG'
  | 'DELETE_TAG'
  | 'BATCH_DELETE'
  | 'UNDO'
  | 'REDO';

/** 基础命令接口 */
export interface BaseCommand {
  /** 命令ID (用于追踪) */
  id: string;
  /** 命令类型 */
  type: OperationType;
  /** 命令时间戳 */
  timestamp: number;
}

/** 创建节点命令 */
export interface CreateNodeCommand extends BaseCommand {
  type: 'CREATE_NODE';
  nodeId: string;  // 预生成的节点 ID
  payload: {
    parentId: string | null;
    data: CreateNodeData;
  };
}

/** 更新节点命令 */
export interface UpdateNodeCommand extends BaseCommand {
  type: 'UPDATE_NODE';
  payload: {
    id: string;
    data: UpdateNodeData;
    backupData?: ScheduleNode;  // 用于撤销
  };
}

/** 删除节点命令 */
export interface DeleteNodeCommand extends BaseCommand {
  type: 'DELETE_NODE';
  payload: {
    id: string;
    backupData?: ScheduleNode;  // 用于撤销
    childBackup?: ScheduleNode[];  // 子节点备份
  };
}

/** 移动节点命令 */
export interface MoveNodeCommand extends BaseCommand {
  type: 'MOVE_NODE';
  payload: {
    id: string;
    newParentId: string | null;
    newOrder: number;
    oldParentId?: string | null;
    oldOrder?: number;
  };
}

/** 切换折叠状态命令 */
export interface ToggleCollapseCommand extends BaseCommand {
  type: 'TOGGLE_COLLAPSE';
  payload: {
    id: string;
  };
}

/** 切换完成状态命令 */
export interface ToggleCompleteCommand extends BaseCommand {
  type: 'TOGGLE_COMPLETE';
  payload: {
    id: string;
  };
}

/** 创建标签命令 */
export interface CreateTagCommand extends BaseCommand {
  type: 'CREATE_TAG';
  nodeId: string;  // 预生成的标签 ID
  payload: {
    name: string;
    color: string;
  };
}

/** 更新标签命令 */
export interface UpdateTagCommand extends BaseCommand {
  type: 'UPDATE_TAG';
  payload: {
    id: string;
    data: UpdateTagData;
    backupData?: Tag;  // 用于撤销
  };
}

/** 删除标签命令 */
export interface DeleteTagCommand extends BaseCommand {
  type: 'DELETE_TAG';
  payload: {
    id: string;
    backupData?: Tag;
    affectedNodeIds?: string[];  // 受影响的节点ID
  };
}

/** 联合命令类型 */
export type Command =
  | CreateNodeCommand
  | UpdateNodeCommand
  | DeleteNodeCommand
  | MoveNodeCommand
  | ToggleCollapseCommand
  | ToggleCompleteCommand
  | CreateTagCommand
  | UpdateTagCommand
  | DeleteTagCommand;

/** 移动操作 */
export interface MoveOperation {
  nodeId: string;
  targetParentId: string | null;
  targetOrder: number;
}

// ============================================================================
// 事件系统 (Event System)
// ============================================================================

/** 事件类型 */
export type EventType =
  | 'node:created'
  | 'node:updated'
  | 'node:deleted'
  | 'node:moved'
  | 'node:expanded'
  | 'node:collapsed'
  | 'node:completed'
  | 'node:uncompleted'
  | 'tag:created'
  | 'tag:updated'
  | 'tag:deleted'
  | 'filter:changed'
  | 'filter:applied'
  | 'tree:reordered'
  | 'tree:loaded'
  | 'ui:viewChanged'
  | 'ui:selectionChanged'
  | 'ui:nodeEditStart'
  | 'ui:nodeEditEnd'
  | 'history:changed';

/** 事件数据联合类型 */
export type EventDataMap = {
  'node:created': ScheduleNode;
  'node:updated': ScheduleNode;
  'node:deleted': { id: string };
  'node:moved': { id: string; oldParentId: string | null; newParentId: string | null; oldOrder: number; newOrder: number };
  'node:expanded': { id: string };
  'node:collapsed': { id: string };
  'node:completed': { id: string };
  'node:uncompleted': { id: string };
  'tag:created': Tag;
  'tag:updated': Tag;
  'tag:deleted': { id: string };
  'filter:changed': FilterConfig;
  'filter:applied': { result: ScheduleNode[]; config: FilterConfig };
  'tree:reordered': void;
  'tree:loaded': ScheduleNode[];
  'ui:viewChanged': { viewType: ViewType };
  'ui:selectionChanged': { selectedIds: string[] };
  'ui:nodeEditStart': { id: string };
  'ui:nodeEditEnd': { id: string };
  'history:changed': { canUndo: boolean; canRedo: boolean };
};

/** 事件处理器类型 */
export type EventHandler<T = unknown> = (data: T) => void;

/** 事件记录 (用于调试) */
export interface EventRecord {
  event: EventType;
  data: unknown;
  timestamp: number;
  source: string;
}

// ============================================================================
// 视图类型 (View Types)
// ============================================================================

/** 视图类型枚举 */
export type ViewType = 'mindmap' | 'list' | 'filter';

/** 思维导图节点 */
export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: ScheduleNode;
  isCollapsed: boolean;
  childrenCount: number;
  visible: boolean;
}

/** 思维导图边 (连接线) */
export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: 'bezier';
}

/** 思维导图布局数据 */
export interface MindMapLayoutData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  viewport: ViewportState;
  rootNodeId: string | null;
}

/** 视口状态 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/** 列表项 */
export interface ListItem {
  id: string;
  node: ScheduleNode;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isVisible: boolean;
  parentPath: string[];
  indent: number;
}

/** 扁平化的节点 (用于列表渲染) */
export interface FlattenedNode extends ListItem {
  isLastChild: boolean;
  hasVisibleChildren: boolean;
}

/** 筛选结果卡片 */
export interface FilterCard {
  id: string;
  node: ScheduleNode;
  tags: Tag[];
  dueDateStatus: DueDateStatus;
  importanceLabel: string;
}

/** 截止日期状态 */
export type DueDateStatus = 'overdue' | 'today' | 'soon' | 'future' | 'none';

/** 筛选结果 */
export interface FilterResult {
  nodes: ScheduleNode[];
  totalCount: number;
  filteredCount: number;
  config: FilterConfig;
}

// ============================================================================
// 接口定义 (Interface Definitions)
// ============================================================================

/** 核心数据层接口 */
export interface ICoreAPI {
  // 日程操作
  createNode(parentId: string | null, data: CreateNodeData): ScheduleNode;
  updateNode(id: string, data: UpdateNodeData): ScheduleNode;
  deleteNode(id: string): void;
  moveNode(id: string, newParentId: string | null, order: number): void;
  
  // 日程查询
  getNodeById(id: string): ScheduleNode | null;
  getRootNode(): ScheduleNode;
  getAllNodes(): ScheduleNode[];
  getChildren(parentId: string): ScheduleNode[];
  getNodePath(id: string): ScheduleNode[];
  
  // 状态操作
  toggleCollapse(id: string): void;
  toggleComplete(id: string): void;
  
  // 标签操作
  createTag(name: string, color: string): Tag;
  updateTag(id: string, data: UpdateTagData): Tag;
  deleteTag(id: string): void;
  getAllTags(): Tag[];
  getTagsByIds(ids: string[]): Tag[];
  
  // 筛选
  getFilteredNodes(config: FilterConfig): ScheduleNode[];
  
  // 持久化
  save(): Promise<void>;
  load(): Promise<void>;
}

/** 日程管理器接口 */
export interface ISchedulerManager {
  // 创建操作
  createNode(parentId: string | null, data?: CreateNodeData): ScheduleNode;
  
  // 读取操作
  getRootNode(): ScheduleNode;
  getNodeById(id: string): ScheduleNode | null;
  getAllNodes(): ScheduleNode[];
  getChildren(parentId: string): ScheduleNode[];
  getNodePath(id: string): ScheduleNode[];
  getDescendants(id: string): ScheduleNode[];
  
  // 更新操作
  updateNode(id: string, data: UpdateNodeData): ScheduleNode;
  moveNode(id: string, newParentId: string | null, order: number): void;
  toggleCollapse(id: string): void;
  toggleComplete(id: string): void;
  
  // 删除操作
  deleteNode(id: string): void;
  
  // 导入导出
  importNodes(nodes: ScheduleNode[]): void;
  exportNodes(): ScheduleNode[];
}

/** 标签管理器接口 */
export interface ITagManager {
  createTag(name: string, color: string): Tag;
  updateTag(id: string, data: UpdateTagData): Tag;
  deleteTag(id: string): void;
  getAllTags(): Tag[];
  getTagById(id: string): Tag | null;
  getTagsByIds(ids: string[]): Tag[];
  getNodesByTag(tagId: string): string[];
  getTagUsageCount(tagId: string): number;
  getTagUsageStats(): Map<string, number>;
  importTags(tags: Tag[]): void;
  exportTags(): Tag[];
}

/** 筛选引擎接口 */
export interface IFilterEngine {
  getDefaultConfig(): FilterConfig;
  setFilterConfig(config: FilterConfig): void;
  getCurrentConfig(): FilterConfig;
  resetFilter(): void;
  execute(nodes: ScheduleNode[]): ScheduleNode[];
  
  // 预设管理
  savePreset(name: string, config: FilterConfig): void;
  loadPreset(name: string): FilterConfig | null;
  deletePreset(name: string): void;
  deletePresetById(id: string): void;
  getAllPresets(): FilterPreset[];
  
  // 导入导出
  importPresets(presets: FilterPreset[]): void;
  exportPresets(): FilterPreset[];
}

/** 事件总线接口 */
export interface IEventBus {
  emit<T extends EventType>(event: T, data: EventDataMap[T]): void;
  on<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): () => void;
  once<T extends EventType>(event: T, handler: EventHandler<EventDataMap[T]>): void;
  off<T extends EventType>(event: T, handler: EventHandler): void;
  offAll(): void;
  getEventHistory(): EventRecord[];
  clearHistory(): void;
}

/** 命令处理器接口 */
export interface ICommandProcessor {
  execute(command: Command): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): Command[];
  getRedoStack(): Command[];
  clearHistory(): void;
}

/** 存储层接口 */
export interface IStorageLayer {
  // 节点持久化
  saveNodes(nodes: ScheduleNode[]): Promise<void>;
  loadNodes(): Promise<ScheduleNode[]>;
  
  // 标签持久化
  saveTags(tags: Tag[]): Promise<void>;
  loadTags(): Promise<Tag[]>;
  
  // 预设持久化
  savePresets(presets: FilterPreset[]): Promise<void>;
  loadPresets(): Promise<FilterPreset[]>;
  
  // 设置持久化
  saveSettings(settings: AppSettings): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  
  // 版本管理
  getVersion(): Promise<string>;
  setVersion(version: string): Promise<void>;
}

/** 应用设置 */
export interface AppSettings {
  /** 默认视图 */
  defaultView: ViewType;
  /** 主题 */
  theme: 'light' | 'dark' | 'auto';
  /** 思维导图配置 */
  mindMapSettings: MindMapSettings;
  /** 列表视图配置 */
  listViewSettings: ListViewSettings;
  /** 是否显示已完成任务 */
  showCompletedNodes: boolean;
  /** 撤销历史数量限制 */
  undoHistoryLimit: number;
}

/** 思维导图设置 */
export interface MindMapSettings {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  defaultZoom: number;
  showConnectionLines: boolean;
  connectionLineStyle: 'bezier' | 'straight' | 'step';
}

/** 列表视图设置 */
export interface ListViewSettings {
  showImportance: boolean;
  showDueDate: boolean;
  showTags: boolean;
  showCheckbox: boolean;
  defaultIndentSize: number;
}

/** 思维导图视图适配器接口 */
export interface IMindMapAdapter {
  buildLayoutData(): MindMapLayoutData;
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  expandAll(): void;
  collapseAll(): void;
  centerOnNode(nodeId: string): void;
  setViewport(viewport: ViewportState): void;
  getViewport(): ViewportState;
}

/** 列表视图适配器接口 */
export interface IListAdapter {
  buildListData(collapsedIds?: Set<string>): FlattenedNode[];
  expandNode(nodeId: string): void;
  collapseNode(nodeId: string): void;
  expandAll(): void;
  collapseAll(): void;
  scrollToNode(nodeId: string): void;
}

/** 筛选视图适配器接口 */
export interface IFilterAdapter {
  setFilterConfig(config: FilterConfig): void;
  getCurrentConfig(): FilterConfig;
  applyFilter(): FilterResult;
  saveCurrentAsPreset(name: string): void;
  loadPreset(presetId: string): void;
  deletePreset(presetId: string): void;
  getAllPresets(): FilterPreset[];
}

/** 视图组件接口 */
export interface IViewComponent {
  mount(container: HTMLElement): void;
  unmount(): void;
  refresh(): void;
  getViewType(): ViewType;
}

// ============================================================================
// 工具类型 (Utility Types)
// ============================================================================

/** 节点创建参数 */
export interface CreateNodeParams {
  parentId: string | null;
  title?: string;
  description?: string;
  importance?: ImportanceLevel;
  dueDate?: string | null;
  tags?: string[];
}

/** 节点更新参数 */
export interface UpdateNodeParams {
  id: string;
  title?: string;
  description?: string;
  importance?: ImportanceLevel;
  dueDate?: string | null;
  tags?: string[];
}

/** 树遍历回调 */
export type TreeTraversalCallback = (node: ScheduleNode, depth: number) => void;

/** 获取节点的子节点（需要配合树结构实现） */
export type GetChildrenFn = (parentId: string) => ScheduleNode[];

/** 从节点列表构建父子映射 */
export function buildChildrenMap(nodes: ScheduleNode[]): Map<string | null, ScheduleNode[]> {
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

/** 查找根节点 */
export function findRootNode(nodes: ScheduleNode[]): ScheduleNode | null {
  return nodes.find(n => n.parentId === null) ?? null;
}


// ============================================================================
// 常量定义 (Constants)
// ============================================================================

/** 重要度标签 */
export const IMPORTANCE_LABELS: Record<ImportanceLevel, string> = {
  1: '最低',
  2: '低',
  3: '中',
  4: '高',
  5: '最高'
};

/** 重要度颜色 */
export const IMPORTANCE_COLORS: Record<ImportanceLevel, string> = {
  1: '#9E9E9E',
  2: '#4CAF50',
  3: '#FFC107',
  4: '#FF9800',
  5: '#F44336'
};

/** 标签预设颜色 */
export const TAG_PRESET_COLORS = [
  '#FF6B6B', // 珊瑚红
  '#4ECDC4', // 青绿
  '#45B7D1', // 天蓝
  '#96CEB4', // 薄荷绿
  '#FFEAA7', // 柠檬黄
  '#DDA0DD', // 梅红
  '#98D8C8', // 薄荷
  '#F7DC6F', // 金黄
  '#BB8FCE', // 紫罗兰
  '#85C1E9', // 浅蓝
  '#F8B500', // 橙黄
  '#58D68D', // 翠绿
];

/** 默认筛选配置 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  sortBy: 'importance',
  sortOrder: 'desc'
};

/** 默认应用设置 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultView: 'list',
  theme: 'light',
  showCompletedNodes: true,
  undoHistoryLimit: 50,
  mindMapSettings: {
    nodeWidth: 180,
    nodeHeight: 40,
    horizontalGap: 60,
    verticalGap: 20,
    defaultZoom: 1,
    showConnectionLines: true,
    connectionLineStyle: 'bezier'
  },
  listViewSettings: {
    showImportance: true,
    showDueDate: true,
    showTags: true,
    showCheckbox: true,
    defaultIndentSize: 24
  }
};

/** 版本号 */
export const APP_VERSION = '1.0.0';
