# 智能 AI 聊天机器人 (前端)

![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green)

这是一个基于 React 和 TypeScript 构建的现代化、响应式且功能丰富的 AI 聊天机器人应用。它支持实时流式响应、安全认证，并拥有适配桌面和移动端的精美 UI。

## 核心功能

### 智能交互
- **实时流式响应 (SSE)**：使用服务器发送事件 (Server-Sent Events) 实现打字机风格的 AI 回复，提供即时反馈。
- **深度思考模式**：支持切换“思考模式”，展示 AI 的推理过程（需后端模型支持）。
- **Markdown 支持**：完整渲染代码块、表格、列表和富文本格式。

### 会话管理
- **多会话支持**：支持创建、重命名和删除多个聊天会话。
- **历史记录持久化**：所有聊天记录自动保存到 `localStorage`，确保刷新页面后数据不丢失。
- **自动命名**：根据首次交互内容智能生成会话标题（支持异步更新）。

### 现代化 UI/UX
- **响应式设计**：移动端优先的优化，包含可折叠侧边栏和自适应布局。
- **主题系统**：原生支持深色/浅色模式，并可跟随系统设置。
- **组件库**：基于 `shadcn/ui` 和 Radix UI 构建，提供无障碍且高质量的组件。
- **流畅动画**：消息气泡和界面元素拥有丝滑的过渡动画。

## 技术栈

- **框架**: React 19, TypeScript
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4, CSS Modules (用于特定组件)
- **UI 库**: shadcn/ui (Radix UI primitives)
- **图标**: Lucide React
- **工具库**: `date-fns` (或 dayjs), `clsx`, `tailwind-merge`

## 项目结构

```bash
src/
├── components/          # React 组件
│   ├── ui/             # 可复用 UI 组件 (shadcn/ui)
│   ├── AiRespond.tsx   # AI 消息气泡及推理展示
│   ├── ChatInput.tsx   # 消息输入区域
│   ├── ChatMessages.tsx # 消息列表渲染
│   └── ...
├── hooks/              # 自定义 Hooks
│   ├── useAuth.ts      # 认证逻辑与状态
│   ├── useChatSessions.ts # 聊天会话 CRUD 操作
│   └── ...
├── lib/                # 工具函数
│   └── utils.ts        # 辅助函数 (cn 等)
└── App.tsx             # 主应用入口
```

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm 或 yarn

### 安装

1. 克隆仓库：
   ```bash
   git clone <repository-url>
   ```

2. 安装依赖：
   ```bash
   cd chatbot-frontend
   npm install
   ```

### 本地运行

启动开发服务器：
```bash
npm run dev
```
应用将在 `http://localhost:5173` 访问。

### 生产环境构建

创建生产环境构建：
```bash
npm run build
```
预览生产构建：
```bash
npm run preview
```

## 集成

本前端项目设计用于配合 **Chatbot Backend** 工作。请确保后端服务运行在 `http://localhost:8080`（默认端口），或根据需要在源代码中配置 API 端点。


