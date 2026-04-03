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

  // 初始化：仅当 localStorage 有用户数据时才验证 Cookie 中的 JWT
  // 如果从未登录过（localStorage 无 user），跳过请求，避免控制台出现 401 错误
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    // 未登录过，无需验证，直接结束加载
    if (!savedUser || savedUser === 'undefined' || savedUser === 'null') {
      setIsLoading(false);
      return;
    }

    // 有残留用户数据，说明之前登录过，验证 Cookie 是否仍有效
    api.verifyToken(true)
      .then(data => {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Unauthorized') {
          // Token 已失效，清除本地数据
          localStorage.removeItem('user');
          setUser(null);
        } else {
          // 网络错误等，保留本地缓存的用户数据
          try {
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /**
   * 用户注册
   */
  const register = async (name: string, email: string, password: string) => {
    const data = await api.register({ name, email, password });
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  /**
   * 用户登录
   */
  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.user);
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
