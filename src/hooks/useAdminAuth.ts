import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export interface Admin {
    id: string;
    email: string;
    name: string;
    role: string;
}

/**
 * 管理员认证 Hook
 * 
 * 管理管理员的登录状态
 */
export function useAdminAuth() {
    // 管理员状态管理
    const [admin, setAdmin] = useState<Admin | null>(() => {
        const savedAdmin = localStorage.getItem('admin');
        return savedAdmin ? JSON.parse(savedAdmin) : null;
    });

    const [isLoading, setIsLoading] = useState(true);

    // 初始化时验证管理员 Token
    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        const savedAdmin = localStorage.getItem('admin');

        if (adminToken && savedAdmin) {
            // 确保 token key 使用管理员 token
            localStorage.setItem('token', adminToken);
            setAdmin(JSON.parse(savedAdmin));
        } else {
            setAdmin(null);
            // 清理可能残留的token
            localStorage.removeItem('token');
        }
        setIsLoading(false);
    }, []);

    /**
     * 管理员登录
     */
    const login = async (email: string, password: string) => {
        const data = await api.adminLogin({ email, password });
        setAdmin(data.admin);
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin', JSON.stringify(data.admin));
        // 同时设置 token，因为 API 调用使用的是通用的 token key
        localStorage.setItem('token', data.token);
    };

    /**
     * 管理员登出
     */
    const logout = () => {
        setAdmin(null);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        localStorage.removeItem('token');
    };

    return {
        admin,
        isLoading,
        login,
        logout
    };
}
