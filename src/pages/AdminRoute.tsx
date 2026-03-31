/**
 * 管理员应用页面
 * 
 * 管理员路由 /admin 下的入口组件
 * 处理管理员认证状态，未登录显示管理员登录页，已登录显示管理仪表板
 */

import { AdminLoginPage, AdminDashboard } from '@/components/admin';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminRoute() {
  const { admin, isLoading, login, logout } = useAdminAuth();

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  // 未登录显示管理员登录页
  if (!admin) {
    return <AdminLoginPage onLogin={login} />;
  }

  // 已登录显示管理仪表板
  return <AdminDashboard admin={admin} onLogout={logout} />;
}
