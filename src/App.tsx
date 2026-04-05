/**
 * 应用主入口 - 路由配置与代码分割
 * 
 * 使用 React.lazy + Suspense 实现页面级懒加载，
 * 每个路由对应一个独立的 chunk，按需加载以优化首屏性能
 * 
 * 路由结构：
 * - /login    → 登录/注册页面（独立路由，无侧边栏）
 * - /admin/*  → 管理员应用（独立路由）
 * - /*        → 用户聊天应用（受保护路由，含侧边栏）
 */

import './App.css'
import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { UnauthorizedListener } from '@/components/UnauthorizedListener'

// ============ 懒加载页面组件（代码分割） ============
// 每个 lazy() 调用会生成一个独立的 JS chunk，访问对应路由时才会加载
const LoginRoute = lazy(() => import('./pages/LoginRoute'));
const AdminRoute = lazy(() => import('./pages/AdminRoute'));
const ChatRoute = lazy(() => import('./pages/ChatRoute'));
const CodeRoute = lazy(() => import('./pages/CodeRoute.tsx'));

/**
 * 全局加载中的占位组件
 * 在懒加载的页面 chunk 下载完成前显示
 */
function PageLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  );
}

export function App() {
  return (
    // Suspense 包裹懒加载组件，提供加载中的 fallback UI
    <Suspense fallback={<PageLoading />}>
      <UnauthorizedListener />
      <Routes>
        {/* 登录/注册页面 - 独立路由，无侧边栏 */}
        <Route path="/login" element={<LoginRoute />} />
        {/* 管理员路由 */}
        <Route path="/admin/*" element={<AdminRoute />} />
        {/* 代码沙箱页面（受保护路由） */}
        <Route path="/code" element={<CodeRoute />} />
        {/* 用户聊天应用（受保护路由） */}
        <Route path="/*" element={<ChatRoute />} />
      </Routes>
    </Suspense>
  );
}
