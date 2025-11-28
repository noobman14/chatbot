import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export function useAuth() {
  // 用户状态管理
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isLoading, setIsLoading] = useState(true);

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

  return {
    user,
    isLoading,
    register,
    login,
    logout
  };
}
