# FlowDay 迭代方案 (V1.1 - V2.2)

**文档版本**: V1.0  
**编写日期**: 2026-04-28  
**文档状态**: 规划中

---

## 1. 迭代路线图总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FlowDay 迭代路线图                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  V1.0 (MVP)        V1.1 (增强)         V2.0 (协作)         V2.1 (智能)   │
│  ┌─────────┐      ┌─────────┐        ┌─────────┐        ┌─────────┐     │
│  │ 基础功能 │ ──── │ 增强体验 │ ──── │ 云端同步 │ ──── │ AI 赋能 │     │
│  └─────────┘      └─────────┘        └─────────┘        └─────────┘     │
│       │                 │                 │                 │           │
│       └────────┬────────┴────────┬────────┴────────┬────────┴───── V2.2 │
│                │                │                │                 生态 │
│                ▼                ▼                ▼                    │
│          ┌─────────┐      ┌─────────┐      ┌─────────┐          ┌─────────┐
│          │快捷键   │      │同步引擎│      │插件系统│          │开放API │
│          │提醒    │      │冲突解决│      │导入导出│          │第三方集成│
│          └─────────┘      └─────────┘      └─────────┘          └─────────┘
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. V1.1 增强版

**预计周期**: 6周  
**发布时间**: V1.0 发布后 6周  
**核心目标**: 提升用户体验，完善 MVP 功能

### 2.1 功能清单

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 键盘快捷键 | P0 | 2周 | 全套快捷键支持，提升操作效率 |
| 重复提醒 | P1 | 2周 | 每日/每周/每月重复 |
| 时间长度设置 | P1 | 1周 | 支持设置日程预计耗时 |
| 拖拽预览 | P1 | 1周 | 拖拽时显示插入位置预览 |
| 撤销/重做 | P0 | 2周 | CommandProcessor 完善 |
| 搜索高亮 | P2 | 1周 | 搜索结果关键词高亮 |
| 快速添加面板 | P2 | 1周 | 支持快速添加常用模板 |

### 2.2 键盘快捷键设计

```typescript
// src/components/common/KeyboardShortcuts.tsx

interface ShortcutConfig {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  action: () => void;
}

const shortcuts: ShortcutConfig[] = [
  // 文件操作
  { key: 'n', modifiers: ['ctrl'], description: '新建节点', action: createNode },
  { key: 's', modifiers: ['ctrl'], description: '保存', action: save },
  
  // 节点操作
  { key: 'Enter', description: '添加同级节点', action: addSiblingNode },
  { key: 'Tab', description: '添加子节点', action: addChildNode },
  { key: 'Delete', description: '删除节点', action: deleteNode },
  { key: 'F2', description: '编辑节点标题', action: editNodeTitle },
  { key: 'Escape', description: '退出编辑', action: cancelEdit },
  
  // 折叠/展开
  { key: '[', modifiers: ['ctrl'], description: '折叠当前', action: collapseCurrent },
  { key: ']', modifiers: ['ctrl'], description: '展开当前', action: expandCurrent },
  { key: '[', modifiers: ['ctrl', 'shift'], description: '折叠全部', action: collapseAll },
  { key: ']', modifiers: ['ctrl', 'shift'], description: '展开全部', action: expandAll },
  
  // 视图切换
  { key: '1', modifiers: ['ctrl'], description: '思维导图视图', action: switchToMindMap },
  { key: '2', modifiers: ['ctrl'], description: '列表视图', action: switchToList },
  { key: '3', modifiers: ['ctrl'], description: '筛选视图', action: switchToFilter },
  
  // 历史操作
  { key: 'z', modifiers: ['ctrl'], description: '撤销', action: undo },
  { key: 'z', modifiers: ['ctrl', 'shift'], description: '重做', action: redo },
  
  // 导航
  { key: 'ArrowUp', description: '选择上一个节点', action: selectPrev },
  { key: 'ArrowDown', description: '选择下一个节点', action: selectNext },
  { key: 'ArrowLeft', description: '选择父节点', action: selectParent },
  { key: 'ArrowRight', description: '选择第一个子节点', action: selectFirstChild },
  
  // 完成状态
  { key: ' ', description: '切换完成状态', action: toggleComplete },
};

// 实现：使用 useEffect 注册全局键盘监听
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const shortcut = findMatchingShortcut(e);
    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 2.3 重复提醒设计

```typescript
// 新增类型
interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;  // 重复间隔
  daysOfWeek?: number[];  // 每周的哪些天 (0-6)
  dayOfMonth?: number;  // 每月的第几天
  endDate?: string;  // 重复结束日期
  maxOccurrences?: number;  // 最大重复次数
  exceptions: string[];  // 例外日期 (跳过的日期)
}

// 生成下一次提醒日期
function getNextOccurrence(node: ScheduleNode, fromDate: Date): Date | null {
  const rule = node.recurrenceRule;
  if (!rule) return null;
  
  switch (rule.type) {
    case 'daily':
      return addDays(fromDate, rule.interval);
    case 'weekly':
      return addWeeks(fromDate, rule.interval);
    case 'monthly':
      return addMonths(fromDate, rule.interval);
    case 'yearly':
      return addYears(fromDate, rule.interval);
    case 'custom':
      return calculateCustomNext(fromDate, rule);
  }
}

// 提醒系统集成
class ReminderService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  scheduleReminder(node: ScheduleNode) {
    if (!node.dueDate || node.completed) return;
    
    const reminderTime = subMinutes(new Date(node.dueDate), 15);  // 提前15分钟
    const now = new Date();
    
    if (reminderTime > now) {
      const delay = reminderTime.getTime() - now.getTime();
      const timer = setTimeout(() => {
        this.showNotification(node);
      }, delay);
      
      this.timers.set(node.id, timer);
    }
  }
  
  cancelReminder(nodeId: string) {
    const timer = this.timers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(nodeId);
    }
  }
}
```

### 2.4 撤销/重做增强

```typescript
// CommandProcessor 完善实现
class CommandProcessor implements ICommandProcessor {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory = 50;
  
  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    
    // 超过限制时移除最旧的
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
    // 执行新命令时清空重做栈
    this.redoStack = [];
    
    // 发布事件
    this.eventBus.emit('history:changed', {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    });
  }
  
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    
    command.undo();
    this.redoStack.push(command);
    
    this.eventBus.emit('history:changed', {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    });
    
    return true;
  }
  
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    
    command.execute();  // 注意：这里调用的是 execute
    this.undoStack.push(command);
    
    this.eventBus.emit('history:changed', {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    });
    
    return true;
  }
}

// 特定命令实现
class DeleteNodeCommand implements Command {
  type = 'DELETE_NODE' as const;
  id: string;
  private nodeBackup: ScheduleNode;
  private childrenBackup: ScheduleNode[];
  
  constructor(
    private scheduler: SchedulerManager,
    private nodeId: string
  ) {
    this.nodeBackup = { ...scheduler.getNodeById(nodeId)! };
    this.childrenBackup = scheduler.getChildren(nodeId).map(c => ({ ...c }));
    this.id = generateUUID();
    this.timestamp = Date.now();
  }
  
  execute() {
    this.scheduler.deleteNodeDirectly(this.nodeId);
  }
  
  undo() {
    // 先恢复父节点
    this.scheduler.restoreNodeDirectly(this.nodeBackup);
    // 再恢复子节点
    this.childrenBackup.forEach(child => {
      this.scheduler.restoreNodeDirectly(child);
    });
  }
}
```

---

## 3. V2.0 协作版

**预计周期**: 10周  
**发布时间**: V1.1 发布后 10周  
**核心目标**: 实现云端同步，支持多设备协作

### 3.1 架构演进

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         V2.0 架构升级                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │   Client    │◄──────►│  Sync Engine │◄──────►│   Cloud API  │       │
│  │  (V1.0)    │         │  (New)       │         │  (REST/WS)   │       │
│  └─────────────┘         └──────┬──────┘         └─────────────┘       │
│                                 │                                        │
│         ┌───────────────────────┼───────────────────────┐               │
│         │                       │                       │               │
│         ▼                       ▼                       ▼               │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │
│  │  IndexedDB  │         │ Sync Queue  │         │Conflict     │       │
│  │  (Offline)  │         │ (Pending)   │         │Resolver     │       │
│  └─────────────┘         └─────────────┘         └─────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 同步引擎设计

```typescript
// src/sync/SyncEngine.ts

interface SyncableEntity {
  id: string;
  updatedAt: string;
  version: number;
  deleted?: boolean;
}

interface SyncRecord {
  entityType: 'node' | 'tag' | 'preset';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: string;
  data?: unknown;
}

class SyncEngine {
  private syncQueue: SyncRecord[] = [];
  private isOnline = navigator.onLine;
  private syncInterval = 30000;  // 30秒同步一次
  
  constructor(
    private storage: IStorageLayer,
    private eventBus: IEventBus,
    private apiClient: APIClient
  ) {
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }
  
  // 队列操作
  enqueue(record: SyncRecord) {
    this.syncQueue.push(record);
    this.persistQueue();
    
    // 如果在线，立即尝试同步
    if (this.isOnline) {
      this.sync();
    }
  }
  
  // 冲突解决策略
  async resolveConflict(
    local: SyncableEntity,
    remote: SyncableEntity
  ): Promise<SyncableEntity> {
    // 策略1：Last-Write-Wins (默认)
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    return remoteTime > localTime ? remote : local;
    
    // 策略2：可配置为用户选择
    // 策略3：字段级别合并
  }
  
  // 同步主流程
  async sync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, reason: 'offline' };
    }
    
    try {
      // 1. 获取远程变更
      const remoteChanges = await this.apiClient.getChanges({
        since: this.getLastSyncTime(),
      });
      
      // 2. 应用远程变更到本地
      for (const change of remoteChanges.changes) {
        await this.applyRemoteChange(change);
      }
      
      // 3. 上传本地变更
      for (const record of this.syncQueue) {
        await this.uploadChange(record);
      }
      
      // 4. 更新同步时间
      this.updateLastSyncTime();
      
      return { success: true, changes: remoteChanges.changes.length };
    } catch (error) {
      return { success: false, reason: (error as Error).message };
    }
  }
  
  // 离线优先策略
  private async applyRemoteChange(change: RemoteChange): Promise<void> {
    const local = await this.storage.getEntity(change.entityType, change.id);
    
    if (!local) {
      // 本地不存在，直接应用
      await this.storage.saveEntity(change.entityType, change.data);
    } else {
      // 存在本地，检查冲突
      const resolved = await this.resolveConflict(local, change.data);
      await this.storage.saveEntity(change.entityType, resolved);
    }
    
    this.eventBus.emit(`${change.entityType}:synced`, change.data);
  }
}

// API 客户端
interface APIClient {
  getChanges(options: { since: string }): Promise<RemoteChangeSet>;
  uploadChange(record: SyncRecord): Promise<void>;
  login(credentials: Credentials): Promise<AuthToken>;
  refreshToken(): Promise<AuthToken>;
}
```

### 3.3 功能清单

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 用户认证 | P0 | 2周 | 登录/注册/第三方登录 |
| 云端存储 | P0 | 3周 | 数据云端备份 |
| 实时同步 | P0 | 3周 | WebSocket 实时推送 |
| 冲突解决 | P0 | 2周 | 多种冲突策略 |
| 离线模式 | P0 | 2周 | 离线优先，网络恢复后同步 |
| 多设备管理 | P1 | 2周 | 查看登录设备、远程登出 |
| 分享功能 | P2 | 2周 | 生成分享链接 |

---

## 4. V2.1 智能版

**预计周期**: 8周  
**发布时间**: V2.0 发布后 8周  
**核心目标**: AI 赋能，提升日程管理效率

### 4.1 AI 功能设计

#### 4.1.1 智能拆解

```
用户输入: "准备季度汇报"

AI 拆解结果:
├── 准备季度汇报
│   ├── 收集数据
│   │   ├── 销售数据统计
│   │   ├── 运营指标分析
│   │   └── 用户反馈汇总
│   ├── 撰写报告
│   │   ├── 业绩概述
│   │   ├── 问题分析
│   │   └── 下季度计划
│   ├── 制作PPT
│   │   ├── 设计模板
│   │   ├── 数据可视化
│   │   └── 演讲稿准备
│   └── 预演与修改
│       ├── 内部预演
│       └── 最终修改
```

```typescript
// AI 拆解接口
interface AIDecomposeRequest {
  title: string;
  description?: string;
  targetDate?: string;
  estimatedDays?: number;  // 预计总天数
  depth?: number;  // 拆解深度
}

interface AIDecomposeResponse {
  rootNode: {
    title: string;
    children: DecomposedTask[];
  };
  confidence: number;  // AI 置信度
  suggestions: string[];  // 额外建议
}

interface DecomposedTask {
  title: string;
  description?: string;
  importance?: number;
  suggestedDuration?: number;  // 建议时长(天)
  estimatedDate?: string;  // 建议日期
  subTasks?: DecomposedTask[];
}
```

#### 4.1.2 智能推荐

```typescript
// 智能推荐接口
interface AIRecommendation {
  type: 'priority' | 'schedule' | 'break' | 'delegate';
  title: string;
  reason: string;
  confidence: number;
  action?: RecommendedAction;
}

class AIRecommendationEngine {
  // 基于历史数据分析最佳工作模式
  analyzeWorkPattern(userId: string): WorkPattern {
    // 分析: 上午效率高 → 建议将重要任务安排在上午
  }
  
  // 智能优先级建议
  suggestPriority(nodeId: string): number {
    // 考虑因素:
    // - 截止日期距离
    // - 依赖关系
    // - 历史完成率
    // - 用户偏好
  }
  
  // 智能日程安排
  suggestSchedule(nodeId: string): DateTimeSlot {
    // 考虑因素:
    // - 用户的工作习惯
    // - 任务的预计时长
    // - 冲突检测
    // - 精力周期
  }
  
  // 休息提醒
  suggestBreak(): BreakRecommendation {
    // 连续工作 90 分钟后提醒休息
  }
}
```

### 4.2 AI 服务集成

```typescript
// AI 服务适配器
interface AIServiceAdapter {
  // 文本补全
  complete(prompt: string, options?: CompleteOptions): Promise<string>;
  
  // 任务拆解
  decompose(request: AIDecomposeRequest): Promise<AIDecomposeResponse>;
  
  // 智能摘要
  summarize(text: string): Promise<string>;
  
  // 情感分析 (用于分析任务描述)
  analyzeSentiment(text: string): Promise<SentimentResult>;
}

// 使用 OpenAI / Claude API 实现
class OpenAIAdapter implements AIServiceAdapter {
  private client: OpenAI;
  
  async decompose(request: AIDecomposeRequest): Promise<AIDecomposeResponse> {
    const prompt = this.buildDecomposePrompt(request);
    const response = await this.client.complete(prompt);
    return this.parseDecomposeResponse(response);
  }
  
  private buildDecomposePrompt(request: AIDecomposeRequest): string {
    return `
请将以下任务智能拆解为子任务:

任务: ${request.title}
${request.description ? `描述: ${request.description}` : ''}
${request.targetDate ? `截止日期: ${request.targetDate}` : ''}
${request.estimatedDays ? `预计时长: ${request.estimatedDays}天` : ''}

要求:
1. 子任务之间应保持逻辑顺序
2. 每个子任务应该清晰可执行
3. 考虑任务的依赖关系
4. 适当的粒度，不要过细或过粗

请以 JSON 格式输出...
`;
  }
}
```

### 4.3 功能清单

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| AI 任务拆解 | P0 | 3周 | 自然语言拆解复杂任务 |
| 智能优先级 | P1 | 2周 | AI 推荐重要度 |
| 时间建议 | P1 | 2周 | AI 推荐最佳执行时间 |
| 进度预测 | P2 | 2周 | 预测完成时间 |
| 异常提醒 | P2 | 1周 | 检测潜在延期风险 |
| 智能摘要 | P3 | 2周 | 自动生成任务摘要 |

---

## 5. V2.2 生态版

**预计周期**: 10周  
**发布时间**: V2.1 发布后 10周  
**核心目标**: 开放生态，扩展能力边界

### 5.1 插件系统

#### 5.1.1 插件架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           插件系统架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       Plugin Host (主应用)                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │    │
│  │  │  Plugin      │  │   UI         │  │   Data       │          │    │
│  │  │  Manager     │  │   Extension  │  │   Extension  │          │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │    │
│  │          │                 │                 │                   │    │
│  │  ┌────────┴─────────────────┴─────────────────┴────────┐        │    │
│  │  │                    Plugin API                         │        │    │
│  │  │  • 日程数据读写    • 视图定制    • 事件监听           │        │    │
│  │  │  • 标签管理       • 工具栏扩展   • 存储API           │        │    │
│  │  └──────────────────────────────────────────────────────┘        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│          ┌─────────────────────────┼─────────────────────────┐          │
│          │                         │                         │          │
│          ▼                         ▼                         ▼          │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐     │
│  │   Calendar   │           │    GitHub   │           │   Export    │     │
│  │   Plugin     │           │   Plugin    │           │   Plugin   │     │
│  └─────────────┘           └─────────────┘           └─────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5.1.2 插件 API 设计

```typescript
// 插件 API 类型定义
interface FlowDayPluginAPI {
  // 数据访问
  nodes: {
    create(data: CreateNodeData): Promise<ScheduleNode>;
    update(id: string, data: UpdateNodeData): Promise<ScheduleNode>;
    delete(id: string): Promise<void>;
    query(filter: FilterConfig): Promise<ScheduleNode[]>;
    getById(id: string): Promise<ScheduleNode | null>;
  };
  
  // 标签
  tags: {
    create(name: string, color: string): Promise<Tag>;
    update(id: string, data: UpdateTagData): Promise<Tag>;
    delete(id: string): Promise<void>;
    list(): Promise<Tag[]>;
  };
  
  // UI 扩展
  ui: {
    // 注册自定义视图类型
    registerView(config: ViewRegistration): void;
    
    // 添加工具栏按钮
    addToolbarButton(config: ToolbarButtonConfig): () => void;
    
    // 添加右键菜单项
    addContextMenuItem(config: ContextMenuConfig): () => void;
    
    // 注册节点渲染器
    registerNodeRenderer(config: NodeRendererConfig): () => void;
    
    // 模态框
    showModal(config: ModalConfig): Promise<any>;
    showToast(message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
  };
  
  // 事件
  events: {
    on(event: string, handler: Function): () => void;
    emit(event: string, data: any): void;
  };
  
  // 存储 (插件私有数据)
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
  };
  
  // 设置
  settings: {
    get(key: string): any;
    set(key: string, value: any): void;
  };
}

// 插件清单文件
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    website?: string;
  };
  main: string;  // 入口文件
  permissions: string[];  // 请求的权限
  ui?: {
    toolbarButtons?: ToolbarButtonConfig[];
    contextMenuItems?: ContextMenuConfig[];
  };
  data?: {
    schemas?: string[];  // 扩展的数据字段
  };
}

// 示例：日历插件
class CalendarPlugin implements FlowDayPlugin {
  manifest = {
    id: 'flowday-calendar',
    name: '日历视图',
    version: '1.0.0',
    description: '添加日历视图展示日程',
    main: 'index.js',
    permissions: ['nodes:read', 'ui:registerView'],
  };
  
  install(api: FlowDayPluginAPI) {
    api.ui.registerView({
      type: 'calendar',
      name: '日历',
      icon: 'calendar',
      component: CalendarViewComponent,
    });
  }
  
  uninstall() {
    // 清理资源
  }
}
```

### 5.2 导入导出

```typescript
// 导入导出接口
interface ImportExportAPI {
  // 支持格式
  formats: ['json', 'csv', 'ics', 'notion', 'markdown'];
  
  // 导入
  import(data: string, format: Format): Promise<ImportResult>;
  
  // 导出
  export(options: ExportOptions): Promise<ExportResult>;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'ics' | 'markdown';
  nodes?: string[];  // 导出的节点ID，不传则导出全部
  includeTags?: boolean;
  includeCompleted?: boolean;
  dateFormat?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

interface ExportResult {
  success: boolean;
  data: string;
  filename: string;
}

// ICS 格式导出
function exportToICS(nodes: ScheduleNode[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowDay//EN',
  ];
  
  for (const node of nodes) {
    if (node.dueDate) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${node.id}@flowday`);
      lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
      lines.push(`DTSTART:${formatICSDate(new Date(node.dueDate))}`);
      lines.push(`SUMMARY:${escapeICSText(node.title)}`);
      if (node.description) {
        lines.push(`DESCRIPTION:${escapeICSText(node.description)}`);
      }
      lines.push('END:VEVENT');
    }
  }
  
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
```

### 5.3 开放 API

```typescript
// REST API 设计
// Base URL: https://api.flowday.app/v1

// 认证
POST   /auth/login          // 登录
POST   /auth/register       // 注册
POST   /auth/refresh        // 刷新令牌
DELETE /auth/logout         // 登出

// 日程
GET    /nodes               // 获取日程列表
POST   /nodes               // 创建日程
GET    /nodes/:id           // 获取单个日程
PATCH  /nodes/:id           // 更新日程
DELETE /nodes/:id           // 删除日程
POST   /nodes/:id/move      // 移动日程
POST   /nodes/:id/toggle    // 切换完成状态

// 标签
GET    /tags                // 获取标签列表
POST   /tags                // 创建标签
PATCH  /tags/:id            // 更新标签
DELETE /tags/:id            // 删除标签

// 同步
GET    /sync/changes        // 获取变更
POST   /sync/push           // 推送变更

// Webhook
POST   /webhooks            // 创建 Webhook
GET    /webhooks            // 列出 Webhook
DELETE /webhooks/:id       // 删除 Webhook

// OpenAPI 规范示例
const openapiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'FlowDay API',
    version: '1.0.0',
    description: 'FlowDay 日程管理 API',
  },
  servers: [{ url: 'https://api.flowday.app/v1' }],
  paths: {
    '/nodes': {
      get: {
        operationId: 'listNodes',
        parameters: [
          { name: 'parentId', in: 'query' },
          { name: 'completed', in: 'query' },
          { name: 'limit', in: 'query' },
          { name: 'offset', in: 'query' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
                    total: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Node: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          importance: { type: 'number', enum: [1, 2, 3, 4, 5] },
          dueDate: { type: 'string', format: 'date-time' },
          completed: { type: 'boolean' },
        },
      },
    },
  },
};
```

### 5.4 功能清单

| 功能 | 优先级 | 工作量 | 说明 |
|------|--------|--------|------|
| 插件系统 | P0 | 4周 | 完整的插件加载和管理 |
| 插件市场 | P0 | 2周 | 在线安装插件 |
| JSON 导入导出 | P0 | 1周 | 数据迁移 |
| CSV 导入导出 | P1 | 1周 | Excel 兼容 |
| iCal 导入导出 | P1 | 1周 | 日历同步 |
| REST API | P0 | 3周 | 开放 API |
| Webhook | P1 | 2周 | 事件通知 |
| 钉钉集成 | P2 | 2周 | 第三方集成示例 |
| 飞书集成 | P2 | 2周 | 第三方集成示例 |
| Google Calendar | P2 | 2周 | 第三方集成示例 |

---

## 6. 各版本依赖关系

```
V1.1 依赖 V1.0
  └─ 无特殊依赖

V2.0 依赖 V1.1
  ├─ 依赖 V1.1 的 Storage 层进行扩展
  ├─ 依赖 V1.1 的撤销/重做功能
  └─ 依赖 V1.1 的快捷键功能

V2.1 依赖 V2.0
  ├─ 依赖 V2.0 的用户认证系统
  └─ 依赖 V2.0 的数据同步能力

V2.2 依赖 V2.1
  ├─ 依赖 V2.1 的所有功能
  └─ 插件系统可基于 V2.0 或更高版本
```

---

## 7. 资源规划

### 7.1 团队规模

| 角色 | V1.0 | V1.1 | V2.0 | V2.1 | V2.2 |
|------|------|------|------|------|------|
| 前端工程师 | 2 | 2 | 2 | 2 | 2 |
| 后端工程师 | 0 | 0 | 2 | 1 | 1 |
| UI/UX 设计师 | 1 | 0.5 | 0.5 | 0.5 | 0.5 |
| 测试工程师 | 1 | 1 | 1 | 1 | 1 |
| 产品经理 | 1 | 0.5 | 0.5 | 0.5 | 0.5 |
| AI 工程师 | 0 | 0 | 0 | 1 | 0 |
| DevOps | 0 | 0 | 1 | 0 | 0 |
| **总计** | 5 | 4 | 7 | 6 | 5 |

### 7.2 技术债务管理

| 版本 | 技术债务预算 | 主要清理项 |
|------|--------------|------------|
| V1.0 | 20% | 基础代码规范 |
| V1.1 | 15% | 快捷键、命令系统 |
| V2.0 | 20% | 同步引擎优化 |
| V2.1 | 15% | AI 服务集成 |
| V2.2 | 15% | 插件系统沙箱 |

---

## 8. 风险评估

| 版本 | 主要风险 | 概率 | 影响 | 应对措施 |
|------|----------|------|------|----------|
| V2.0 | 同步冲突复杂 | 高 | 高 | 提前设计冲突解决策略，用户提示清晰 |
| V2.0 | 网络不稳定 | 中 | 中 | 完善的离线模式和队列管理 |
| V2.1 | AI 服务成本 | 中 | 中 | 合理的 API 调用策略，缓存结果 |
| V2.1 | AI 质量问题 | 中 | 中 | 人工审核机制，用户可手动调整 |
| V2.2 | 插件安全 | 中 | 高 | 严格的权限控制和沙箱隔离 |
| V2.2 | API 兼容 | 低 | 高 | 版本管理和向后兼容策略 |

---

## 9. 成功指标

| 版本 | 关键指标 | 目标值 |
|------|----------|--------|
| V1.0 | 日活用户 | 1,000 |
| V1.0 | 功能满意度 | 4.0/5.0 |
| V1.1 | 快捷键使用率 | 30% |
| V2.0 | 同步成功率 | 99.5% |
| V2.0 | 用户留存率 (30天) | 50% |
| V2.1 | AI 功能使用率 | 20% |
| V2.2 | 插件安装数 | 50+ |

---

**文档结束**

*本文档为 FlowDay 的迭代规划，为团队提供长期产品路线图参考。实际发布时间和功能范围可能根据用户反馈和市场竞争情况调整。*