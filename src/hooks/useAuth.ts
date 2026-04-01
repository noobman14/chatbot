import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { UNAUTHORIZED_EVENT } from '@/utils/authSession';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export function useAuth() {
  // 用户状态管理 - 安全解析localStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage:', e);
      localStorage.removeItem('user');
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // 全局 401：同步清空内存中的 user（本地存储已由 api 层清理）
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // 初始化时验证 Token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证 Token 有效性
      api.verifyToken()
        .then(data => {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          // Token 无效，清除本地数据
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  /**
   * 用户注册
   */
  const register = async (name: string, email: string, password: string) => {
    const data = await api.register({ name, email, password });
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  /**
   * 用户登录
   */
  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  /**
   * 用户登出
   */
  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // 清除所有用户相关的本地存储数据
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('chatSessions');
    }
  };

  /**
   * 更新用户信息
   */
  const updateUser = (updatedUser: { name: string; email: string; avatar: string }) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  return {
    user,
    isLoading,
    register,
    login,
    logout,
    updateUser
  };
}
