# 智能聊天机器人 (Chatbot)

一个功能完善的现代化聊天机器人应用，基于 React + TypeScript + Vite 构建，提供流畅的用户体验和丰富的交互功能。
暂时支持聊天，后续加入文件支持，生图支持。暂时使用localstorage存储数据

## ✨ 功能特性


### 核心功能
- 🤖 **智能AI对话** - 支持与AI进行自然语言对话，支持Markdown格式响应
- 💬 **多会话管理** - 支持创建、切换、删除多个聊天会话
- 📝 **聊天历史** - 自动保存聊天记录到本地存储,刷新页面不丢失
- 🔐 **用户认证** - 完善的登录系统，支持用户身份管理

### 界面特性
- 🎨 **现代化UI** - 基于 shadcn/ui 组件库，界面美观大方
- 🌓 **主题切换** - 支持亮色/暗色主题自由切换
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔄 **自动滚动** - 新消息自动滚动到可视区域
- 💅 **优雅动画** - 流畅的过渡动画和交互反馈

### 技术特性
- ⚡ **快速构建** - 使用 Vite 提供极速的开发体验
- 🎯 **类型安全** - 完整的 TypeScript 类型支持
- 🔌 **模块化设计** - 通过自定义 Hooks 实现状态管理
- 📦 **本地存储** - 使用 localStorage 持久化数据

## 🛠 技术栈

### 核心框架
- **React 19.1.0** - 前端UI框架
- **TypeScript 5.9.3** - 类型安全的JavaScript
- **Vite 6.3.5** - 下一代前端构建工具

### UI组件库
- **shadcn/ui** - 基于 Radix UI 的高质量组件
- **Tailwind CSS 4.1.17** - 实用优先的CSS框架
- **Lucide React** - 精美的图标库

### 主要依赖
- **react-markdown** - Markdown渲染支持
- **remark-gfm** - GitHub风格的Markdown扩展
- **dayjs** - 轻量级日期处理库
- **supersimpledev** - 聊天机器人核心库
- **class-variance-authority** - CSS变体管理
- **clsx** - 条件类名合并工具

## 📁 项目结构

```
chatbot/
├── src/
│   ├── components/          # 组件目录
│   │   ├── ui/             # 基础UI组件 (shadcn/ui)
│   │   ├── AiRespond.tsx   # AI响应组件
│   │   ├── ChatInput.tsx   # 聊天输入框
│   │   ├── ChatMessages.tsx # 消息列表
│   │   ├── LoginPage.tsx   # 登录页面
│   │   ├── Header.tsx      # 页面头部
│   │   ├── app-sidebar.tsx # 侧边栏
│   │   ├── nav-user.tsx    # 用户导航
│   │   ├── mode-toggle.tsx # 主题切换
│   │   └── theme-provider.tsx # 主题提供者
│   ├── hooks/              # 自定义Hooks
│   │   ├── useAuth.ts      # 用户认证Hook
│   │   ├── useChatSessions.ts # 会话管理Hook
│   │   └── use-mobile.ts   # 移动端检测Hook
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 工具函数
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 应用样式
│   ├── index.css           # 全局样式
│   └── main.tsx            # 应用入口
├── public/                 # 静态资源
├── backend-api-documentation.md # 后端API文档
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite配置
└── components.json         # shadcn/ui配置
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0 或 pnpm/yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 💡 使用说明

### 用户登录
1. 首次访问时会显示登录页面
2. 输入用户名登录（演示模式，无需密码）
3. 登录后进入聊天界面

### 创建和管理会话
1. 点击侧边栏顶部的 **"新建聊天"** 按钮创建新会话
2. 在侧边栏的历史记录中可以查看和切换所有会话
3. 悬停在会话上可以看到删除按钮（垃圾桶图标）
4. 当前会话会高亮显示

### 发送消息
1. 在底部输入框中输入消息
2. 按回车键或点击发送按钮发送消息
3. AI会自动响应并显示在聊天区域
4. 支持Markdown格式的消息渲染

### 主题切换
- 点击右上角的主题切换按钮
- 可在亮色、暗色和跟随系统三种模式间切换

### 移动端使用
- 移动端会自动切换为适配的布局
- 侧边栏可以通过菜单按钮展开/收起

## 🎯 核心功能实现

### 自定义Hooks

#### `useAuth` - 用户认证
```typescript
const { user, login, logout } = useAuth();
```
管理用户登录状态，数据持久化到 localStorage

#### `useChatSessions` - 会话管理
```typescript
const {
  sessions,          // 所有会话
  currentChatId,     // 当前会话ID
  currentMessages,   // 当前会话消息
  createNewChat,     // 创建新会话
  switchChat,        // 切换会话
  deleteChat,        // 删除会话
  setChatMessages    // 更新消息
} = useChatSessions();
```

### 数据持久化
- 聊天会话和消息保存在 `localStorage` 中
- 用户信息保存在 `localStorage` 中
- 主题偏好保存在 `localStorage` 中

### Markdown支持
消息支持完整的Markdown语法：
- **粗体** 和 *斜体*
- 代码块和行内代码
- 列表（有序/无序）
- 引用
- 链接和图片
- 表格（通过 remark-gfm）

## 🔧 配置说明

### Tailwind CSS
项目使用 Tailwind CSS v4，配置文件位于 `src/index.css`

### TypeScript
- `tsconfig.json` - 基础配置
- `tsconfig.app.json` - 应用配置
- `tsconfig.node.json` - Node环境配置

### ESLint
使用 `eslint.config.js` 进行代码质量检查


## 🤝 开发指南

### 添加新组件
使用 shadcn/ui CLI 添加组件：
```bash
npx shadcn@latest add [component-name]
```

### 代码规范
- 使用 TypeScript 编写所有代码
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- CSS 优先使用 Tailwind utility classes

### 状态管理
- 使用 React Hooks 进行状态管理
- 复杂逻辑封装为自定义 Hooks
- 使用 localStorage 进行数据持久化

---

**最后更新时间**: 2025-11-24
