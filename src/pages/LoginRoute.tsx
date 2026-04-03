/**
 * 登录页面路由组件
 * 
 * 独立路由 /login，处理登录/注册逻辑
 * 已登录用户自动重定向到聊天页面
 */

import { Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuth } from '@/hooks/useAuth';

export default function LoginRoute() {
  const { user, isLoading: authLoading, register, login } = useAuth();
  const navigate = useNavigate();

  // 等待认证检查
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 已登录用户自动重定向到聊天页面
  if (user) {
    return <Navigate to="/" replace />;
  }

  // 登录成功后进入主页（凭证已由 LoginForm / TwoFactorForm 写入 localStorage）
  const handleLoginSuccess = () => {
    navigate('/', { replace: true });
  };

  return (
    <LoginPage
      onLogin={login}
      onRegister={register}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
