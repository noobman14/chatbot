import { useState } from 'react';

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export function useAuth() {
  // 用户状态管理
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (user: User) => {
    setUser(user);
    localStorage.setItem('chat_user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chat_user');
  };

  return {
    user,
    login,
    logout
  };
}
