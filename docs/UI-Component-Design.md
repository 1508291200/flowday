# FlowDay 组件详细设计

**版本**: V1.0  
**配套文档**: UI-Design-Spec.md

---

## 1. Header 头部组件

### 设计稿
```
┌────────────────────────────────────────────────────────────┐
│  FlowDay  智能日程管理          [列表|思维导图|筛选]       │
│  ↑ h-14 bg-white border-b                                 │
└────────────────────────────────────────────────────────────┘
```

### Tailwind 类名
```tsx
<header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
  {/* Logo区域 */}
  <div className="flex items-center gap-2">
    <h1 className="text-xl font-bold text-gray-800">FlowDay</h1>
    <span className="text-sm text-gray-400">智能日程管理</span>
  </div>
  
  {/* 视图切换 */}
  <div className="flex items-center bg-gray-100 rounded-lg p-1">
    {views.map(({ key, label }) => (
      <button className={clsx(
        "px-3 py-1 text-sm rounded-md transition-colors",
        currentView === key
          ? "bg-white text-blue-600 shadow-sm"
          : "text-gray-600 hover:text-gray-900"
      )}>
        {label}
      </button>
    ))}
  </div>
</header>
```

---

## 2. Toolbar 工具栏组件

### 设计稿
```
┌────────────────────────────────────────────────────────────┐
│ [+添加] | [展开][折叠] | [撤销][重做]                     │
│ ↑ h-10 bg-gray-50 border-b px-3 gap-2                      │
└────────────────────────────────────────────────────────────┘
```

### Tailwind 类名
```tsx
<div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center gap-2 px-3">
  {/* 主操作组 */}
  <div className="flex items-center gap-1">
    <Button size="sm" icon={<PlusIcon />}>添加日程</Button>
  </div>
  
  {/* 分割线 */}
  <div className="w-px h-5 bg-gray-300 mx-1" />
  
  {/* 次要操作组 */}
  <div className="flex items-center gap-1">
    <IconButton size="sm" title="全部展开"><ExpandIcon /></IconButton>
    <IconButton size="sm" title="全部折叠"><CollapseIcon /></IconButton>
  </div>
</div>
```

---

## 3. StatusBar 状态栏组件

### 设计稿
```
┌────────────────────────────────────────────────────────────┐
│  FlowDay v1.0.0 | 节点数: 12 | 已完成: 5                   │
│  ↑ h-8 bg-white border-t text-xs text-gray-400 px-4       │
└────────────────────────────────────────────────────────────┘
```

### Tailwind 类名
```tsx
<footer className="h-8 bg-white border-t border-gray-200 flex items-center px-4 text-xs text-gray-400">
  <span>FlowDay v1.0.0</span>
  <span className="mx-2">|</span>
  <span>节点数: {nodeCount}</span>
  <span className="mx-2">|</span>
  <span>已完成: {completedCount}</span>
</footer>
```

---

## 4. ListItem 列表项组件

### 设计稿 - 默认状态
```
┌────────────────────────────────────────────────────────────┐
│  ▶ ○ │ 我的日程                                          │
│  ↑ depth=0, pl-8                                          │
└────────────────────────────────────────────────────────────┘
```

### 设计稿 - 子节点状态
```
┌────────────────────────────────────────────────────────────┐
│  ▼ ☑ │ ┃ 任务A                       [工作][紧急] 明天   │
│  ↑ depth=1, pl-8+24=32, 完成状态opacity-60               │
└────────────────────────────────────────────────────────────┘
```

### 设计稿 - 悬浮状态
```
┌────────────────────────────────────────────────────────────┐
│  ▼ ○ │ ┃ ┣ 任务B     [+][编辑][删除]    [个人]  3天后    │
│  ↑ hover:bg-gray-50, 操作按钮opacity-0→opacity-100       │
└────────────────────────────────────────────────────────────┘
```

### Tailwind 类名
```tsx
<div
  className={clsx(
    "flex items-center gap-2 px-2 py-1.5",
    "hover:bg-gray-50 transition-colors cursor-pointer",
    selected && "bg-blue-50"
  )}
  style={{ paddingLeft: `${depth * 24 + 8}px` }}
>
  {/* 折叠按钮 */}
  {hasChildren && (
    <button onClick={onToggleCollapse} className="w-6 h-6 flex items-center justify-center">
      <ChevronIcon expanded={!collapsed} />
    </button>
  )}
  
  {/* 复选框 */}
  {!isRoot && (
    <button onClick={onToggleComplete} className={clsx(
      "w-5 h-5 rounded border-2 flex items-center justify-center",
      completed ? "bg-blue-500 border-blue-500" : "border-gray-300"
    )}>
      {completed && <CheckIcon />}
    </button>
  )}
  
  {/* 重要度指示器 */}
  <div
    className="w-2 h-2 rounded-full flex-shrink-0"
    style={{ backgroundColor: IMPORTANCE_COLORS[importance] }}
  />
  
  {/* 标题 */}
  <span className={clsx(
    "flex-1 text-sm truncate",
    completed && "line-through text-gray-400",
    overdue && "text-red-500"
  )}>
    {title}
  </span>
  
  {/* 标签 */}
  {tags.length > 0 && (
    <div className="flex gap-1">
      {tags.slice(0, 3).map(tag => (
        <span
          key={tag.id}
          className="px-1.5 py-0.5 text-xs rounded text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )}
  
  {/* 截止日期 */}
  {dueDate && (
    <span className={clsx("text-xs", overdue ? "text-red-500" : "text-gray-400")}>
      {formatRelativeTime(dueDate)}
    </span>
  )}
  
  {/* 操作按钮 - 悬浮显示 */}
  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <IconButton size="sm" onClick={onAddChild}>+</IconButton>
    <IconButton size="sm" onClick={onEdit}>编辑</IconButton>
    <IconButton size="sm" onClick={onDelete}>删除</IconButton>
  </div>
</div>
```

---

## 5. MindMapNode 思维导图节点组件

### 设计稿 - 默认状态
```
      ┌─────────────────────┐
      │ ▏任务A              │
      │  标题      [工作]   │
      │            3天后    │
      └─────────────────────┘
      ↑ w-48 h-10, 左侧4px色条
```

### 设计稿 - 选中状态
```
      ┌─────────────────────┐
    ╭─│ ▏任务A              │╮
    │ │  标题      [工作]   │ │
    │ │            3天后    │ │
    ╰─└─────────────────────┘╯
      ↑ ring-2 ring-blue-200
```

### 设计稿 - 悬浮操作
```
           ┌──────────────┐
           │ + │编辑│删除 │
           └──────┬───────┘
                  ▼
      ┌─────────────────────┐
      │ ▏任务A              │
      │  标题      [工作]   │
      └─────────────────────┘
```

### Tailwind 类名
```tsx
<div className={clsx(
  "relative group px-3 py-2 rounded-lg border-2",
  "min-w-[120px] max-w-[200px]",
  "bg-white shadow-sm transition-all duration-200",
  selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
  completed && "opacity-60",
  isHovered && "shadow-md"
)}>
  {/* Handle - 左侧连接点 */}
  {!isRoot && (
    <Handle
      type="target"
      position={Position.Left}
      className="!w-2 !h-2 !bg-gray-400 !border-0"
    />
  )}
  
  {/* Handle - 右侧连接点 */}
  <Handle
    type="source"
    position={Position.Right}
    className="!w-2 !h-2 !bg-gray-400 !border-0"
  />
  
  {/* 折叠按钮 */}
  <button className={clsx(
    "absolute -left-4 top-1/2 -translate-y-1/2",
    "w-5 h-5 rounded-full bg-white border border-gray-300",
    "flex items-center justify-center opacity-0 group-hover:opacity-100"
  )}>
    <ChevronIcon expanded={!collapsed} />
  </button>
  
  {/* 重要度指示条 */}
  <div
    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
    style={{ backgroundColor: IMPORTANCE_COLORS[importance] }}
  />
  
  {/* 内容区 */}
  <div className="flex items-center gap-2">
    {/* 复选框 */}
    {!isRoot && (
      <button onClick={onToggleComplete} className={clsx(
        "w-4 h-4 rounded border flex-shrink-0",
        completed ? "bg-blue-500 border-blue-500" : "border-gray-300"
      )}>
        {completed && <CheckIcon />}
      </button>
    )}
    
    {/* 标题 */}
    <span className={clsx(
      "text-sm font-medium truncate flex-1",
      completed && "line-through text-gray-400",
      overdue && "text-red-500"
    )}>
      {title}
    </span>
  </div>
  
  {/* 标签 */}
  {tags.length > 0 && (
    <div className="flex gap-1 mt-1">
      {tags.slice(0, 2).map(tag => (
        <span
          key={tag.id}
          className="px-1.5 py-0.5 text-xs rounded text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )}
  
  {/* 悬浮操作面板 */}
  {isHovered && !isRoot && (
    <div className={clsx(
      "absolute -top-8 left-1/2 -translate-x-1/2",
      "flex gap-1 bg-white shadow-md rounded px-1 py-0.5 z-10"
    )}>
      <button onClick={onAddChild} className="text-xs text-gray-500 hover:text-blue-500 px-1">+</button>
      <button onClick={onEdit} className="text-xs text-gray-500 hover:text-blue-500 px-1">编辑</button>
      <button onClick={onDelete} className="text-xs text-gray-500 hover:text-red-500 px-1">删除</button>
    </div>
  )}
</div>
```

---

## 6. FilterCard 筛选卡片组件

### 设计稿
```
┌───────────────────┐
│ ○ 任务A           │
│   [工作] [紧急]   │
│   这是任务的描述  │
│                   │
│  3天后      高    │
└───────────────────┘
↑ h-36, rounded-lg, border
```

### Tailwind 类名
```tsx
<div className={clsx(
  "bg-white rounded-lg border p-4 cursor-pointer",
  "hover:shadow-md transition-shadow",
  completed && "opacity-60",
  overdue ? "border-red-200" : "border-gray-200"
)}>
  {/* 标题行 */}
  <div className="flex items-center gap-2 mb-2">
    <div
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: IMPORTANCE_COLORS[importance] }}
    />
    {completed && <CheckIcon className="w-4 h-4 text-blue-500" />}
    <h3 className={clsx(
      "text-sm font-medium flex-1 truncate",
      completed && "line-through text-gray-400",
      overdue && "text-red-500"
    )}>
      {title}
    </h3>
  </div>
  
  {/* 描述 */}
  {description && (
    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
      {description}
    </p>
  )}
  
  {/* 标签 */}
  {tags.length > 0 && (
    <div className="flex flex-wrap gap-1 mb-2">
      {tags.map(tag => (
        <span
          key={tag.id}
          className="px-1.5 py-0.5 text-xs rounded text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  )}
  
  {/* 底部信息 */}
  <div className="flex items-center justify-between text-xs text-gray-400">
    <span className={overdue ? "text-red-500" : ""}>
      {formatRelativeTime(dueDate)}
    </span>
    <span>{IMPORTANCE_LABELS[importance]}</span>
  </div>
</div>
```

---

## 7. FilterPanel 筛选面板组件

### 设计稿
```
┌─────────────────────────────────────────────────────────┐
│ 搜索: [________________]                                │
│                                                         │
│ 重要度: ○1 ○2 ●3 ○4 ○5   ← 可多选圆点按钮            │
│                                                         │
│ 状态:   [全部] [未完成] [已完成]  ← 单选按钮组        │
│                                                         │
│ 标签:   [工作] [个人] [紧急] [重要]  ← 可多选标签    │
│                                                         │
│ 排序:   [重要度 ▼] [升序 ▼]                            │
│                                                         │
│         [应用筛选] [重置]                               │
└─────────────────────────────────────────────────────────┘
```

### Tailwind 类名
```tsx
<div className="bg-white border-b border-gray-200 p-4">
  {/* 搜索框 */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
    <input
      type="text"
      placeholder="输入关键字搜索..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-400"
    />
  </div>
  
  {/* 重要度 */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">重要度</label>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(level => (
        <button
          key={level}
          className={clsx(
            "w-8 h-8 rounded-full text-xs font-medium text-white transition-all",
            selected ? "ring-2 ring-offset-2" : "opacity-60 hover:opacity-100"
          )}
          style={{ backgroundColor: IMPORTANCE_COLORS[level] }}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
  
  {/* 完成状态 */}
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">完成状态</label>
    <div className="flex gap-2">
      {['全部', '未完成', '已完成'].map(label => (
        <button className={clsx(
          "px-3 py-1 text-sm rounded-md transition-colors",
          active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
        )}>
          {label}
        </button>
      ))}
    </div>
  </div>
  
  {/* 操作按钮 */}
  <div className="flex gap-2 pt-2">
    <Button size="sm">应用筛选</Button>
    <Button size="sm" variant="secondary">重置</Button>
  </div>
</div>
```

---

## 8. EditModal 编辑弹窗组件

### 设计稿
```
┌─────────────────────────────────────┐
│  编辑日程                      [×]  │
├─────────────────────────────────────┤
│                                     │
│  标题: [_______________________]   │
│                                     │
│  描述: [_______________________]   │
│        [_______________________]   │
│        [_______________________]   │
│                                     │
│  重要度: ○1 ○2 ○3 ○4 ○5            │
│          ↑ 彩色圆点单选             │
│                                     │
│  截止日期: [____年__月__日____]   │
│            ↑ date input            │
│                                     │
│                    [取消] [保存]   │
└─────────────────────────────────────┘
```

### 弹窗遮罩
```tsx
<div className="fixed inset-0 z-50 overflow-y-auto">
  {/* 遮罩层 */}
  <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
  
  {/* 弹窗内容 */}
  <div className="flex min-h-full items-center justify-center p-4">
    <div className={clsx(
      "relative w-full max-w-md",
      "bg-white rounded-lg shadow-xl"
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-lg font-semibold text-gray-900">编辑日程</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <CloseIcon />
        </button>
      </div>
      
      {/* 内容区 */}
      <div className="px-4 py-3">
        {/* 表单内容 */}
      </div>
    </div>
  </div>
</div>
```

---

## 9. 空状态设计

### 列表视图空状态
```
┌─────────────────────────────────────┐
│                                     │
│         📝                          │
│    暂无日程                         │
│ 点击上方"添加日程"按钮开始         │
│                                     │
└─────────────────────────────────────┘
```

```tsx
<div className="flex items-center justify-center h-full">
  <div className="text-center text-gray-400">
    <div className="text-4xl mb-2">📝</div>
    <p className="text-sm">暂无日程</p>
    <p className="text-xs mt-1">点击上方"添加日程"按钮开始</p>
  </div>
</div>
```

---

## 10. 加载状态设计

```
┌─────────────────────────────────────┐
│                                     │
│         ◠ 加载中...                 │
│          ↑ 旋转动画                 │
│                                     │
└─────────────────────────────────────┘
```

```tsx
<div className="flex items-center justify-center h-full">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
    <p className="text-gray-500">加载中...</p>
  </div>
</div>
```

---

**文档结束**
