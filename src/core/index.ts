/**
 * Core 模块导出
 * 
 * 包含所有核心业务逻辑，无 UI 依赖
 */

// 类型定义
export type {
  ScheduleNode,
  ImportanceLevel,
  Tag,
  FilterConfig,
  FilterPreset,
  CreateNodeData,
  UpdateNodeData,
  ViewType,
  MindMapNode,
  MindMapEdge,
  MindMapLayoutData,
  ViewportState,
  ListItem,
  FlattenedNode,
  FilterCard,
  DueDateStatus,
  FilterResult,
  AppSettings,
  MindMapSettings,
  ListViewSettings,
  Command,
  EventDataMap,
  EventType,
  EventHandler,
  EventRecord,
  ISchedulerManager,
  ITagManager,
  IFilterEngine,
  IEventBus,
  ICommandProcessor,
  IStorageLayer,
} from './types';

// 常量
export {
  IMPORTANCE_LABELS,
  IMPORTANCE_COLORS,
  TAG_PRESET_COLORS,
  DEFAULT_FILTER_CONFIG,
  DEFAULT_APP_SETTINGS,
  APP_VERSION,
} from './types';

// 核心类
export { generateUUID, isValidUUID, generateShortId } from './uuid';
export { EventBus } from './EventBus';
export { SchedulerManager } from './SchedulerManager';
export { TagManager } from './TagManager';
export { FilterEngine } from './FilterEngine';
export { CommandProcessor } from './CommandProcessor';
