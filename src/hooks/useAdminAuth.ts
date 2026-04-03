import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { UNAUTHORIZED_EVENT } from '@/utils/authSession';

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

    useEffect(() => {
        const onUnauthorized = () => setAdmin(null);
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    useEffect(() => {
        const savedAdmin = localStorage.getItem('admin');
        if (savedAdmin) {
            try {
                setAdmin(JSON.parse(savedAdmin));
            } catch {
                localStorage.removeItem('admin');
                setAdmin(null);
            }
        } else {
            setAdmin(null);
        }
        setIsLoading(false);
    }, []);

    /**
     * 管理员登录
     */
    const login = async (email: string, password: string) => {
        const data = await api.adminLogin({ email, password });
        setAdmin(data.admin);
        localStorage.setItem('admin', JSON.stringify(data.admin));
    };

    /**
     * 管理员登出
     */
    const logout = async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Admin logout error:', error);
        } finally {
            setAdmin(null);
            localStorage.removeItem('admin');
        }
    };

    return {
        admin,
        isLoading,
        login,
        logout
    };
}
