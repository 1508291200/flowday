# FlowDay - 智能日程管理工具

> 一款以思维导图为核心组织逻辑的日程管理工具，支持三种视图模式：思维导图、列表、筛选。

## 核心特性

### 三种视图，同步展示

- **思维导图视图**：以树形结构横向展示日程，支持自由延展和折叠
- **列表视图**：大纲列表形式，支持分级缩进和批量操作
- **筛选视图**：多维度筛选和排序，精确定位目标日程

### 核心优势

- **统一数据源**：三种视图共享同一份日程数据，任意修改即时同步
- **灵活的层级管理**：支持无限层级的日程拆解
- **多维度属性**：重要度、截止日期、自定义标签
- **低耦合架构**：模块化设计，支持独立开发和测试

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (推荐) 或 npm >= 9.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/flowday.git
cd flowday

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 构建

```bash
# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 项目结构

```
FlowDay/
├── docs/                    # 文档
│   ├── SRS.md              # 软件需求规格说明书
│   ├── SDD.md              # 系统设计文档
│   ├── V1-Design.md        # V1.0 详细设计
│   └── Iteration-Plan.md   # 迭代规划
│
├── src/                     # 源代码
│   ├── core/               # 核心层 (无 UI 依赖)
│   │   ├── types.ts       # 类型定义
│   │   ├── SchedulerManager.ts
│   │   ├── TagManager.ts
│   │   ├── FilterEngine.ts
│   │   ├── EventBus.ts
│   │   └── CommandProcessor.ts
│   │
│   ├── adapters/           # 视图适配层
│   │   ├── MindMapAdapter.ts
│   │   ├── ListAdapter.ts
│   │   └── FilterAdapter.ts
│   │
│   ├── components/         # UI 组件
│   │   ├── common/
│   │   ├── mindmap/
│   │   ├── list/
│   │   └── filter/
│   │
│   ├── stores/             # 状态管理
│   └── hooks/              # React Hooks
│
└── public/                  # 静态资源
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 状态管理 | Zustand |
| 思维导图 | React Flow |
| 列表虚拟化 | @tanstack/react-virtual |
| 样式 | Tailwind CSS |
| 本地存储 | IndexedDB (Dexie.js) |

## 文档

- [软件需求规格说明书 (SRS)](./docs/SRS.md)
- [系统设计文档 (SDD)](./docs/SDD.md)
- [V1.0 详细设计](./docs/V1-Design.md)
- [迭代规划](./docs/Iteration-Plan.md)

## 开发指南

### 模块开发

项目采用低耦合架构，各模块可独立开发测试：

1. **Core 层**：纯业务逻辑，不依赖 UI
2. **Adapter 层**：连接 Core 和视图
3. **Component 层**：UI 展示组件

### 代码规范

```bash
# 运行类型检查
pnpm type-check

# 运行 ESLint
pnpm lint

# 运行测试
pnpm test

# 运行所有检查
pnpm check
```

### 提交规范

使用 Conventional Commits：

```
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 版本规划

| 版本 | 目标 | 状态 |
|------|------|------|
| V1.0 | MVP - 三视图基础功能 | 🔨 开发中 |
| V1.1 | 增强 - 快捷键、提醒、撤销重做 | 📋 规划中 |
| V2.0 | 协作 - 云端同步、多设备协作 | 📋 规划中 |
| V2.1 | 智能 - AI 任务拆解、智能推荐 | 📋 规划中 |
| V2.2 | 生态 - 插件系统、开放 API | 📋 规划中 |

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**FlowDay** - 让日程管理像思维导图一样自由延展
