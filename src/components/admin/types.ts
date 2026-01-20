/**
 * 管理后台类型定义
 */

import type { Admin } from '@/hooks/useAdminAuth';

export interface AdminDashboardProps {
    admin: Admin;
    onLogout: () => void;
}

export interface UserData {
    id: string;
    name: string;
    email: string;
    avatar: string;
    status: string;
    createdAt: number;
    updatedAt: number;
    sessionCount: number;
    messageCount: number;
}

export interface OverviewStats {
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    userGrowth: number;
    newUsersThisWeek: number;
}

export interface TrendData {
    date: string;
    count: number;
}

export interface ActiveUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    sessionCount: number;
    messageCount: number;
}

export interface HourlyData {
    hour: number;
    count: number;
}

export interface OperationLog {
    id: string;
    adminId: string;
    operationType: string;
    operationTypeLabel: string;
    targetUserId: string | null;
    targetUserEmail: string | null;
    detail: string;
    ipAddress: string;
    createdAt: number;
}

export interface LoginLogData {
    id: string;
    userId: string | null;
    userEmail: string;
    loginType: string;
    loginTypeLabel: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failReason: string | null;
    createdAt: number;
}

// Tab 类型
export type AdminTab = 'overview' | 'users' | 'operation-logs' | 'login-logs';

// 用户筛选类型
export type UserFilter = 'all' | 'new';
