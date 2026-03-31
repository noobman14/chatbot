/**
 * 管理员仪表板
 * 
 * 主入口组件，整合所有子组件并管理状态
 */

// 导出 AdminLoginPage
export { AdminLoginPage } from './AdminLoginPage';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import { UserDetailModal } from './UserDetailModal';

// 子组件
import { AdminHeader } from './AdminHeader';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { OperationLogsTab } from './OperationLogsTab';
import { LoginLogsTab } from './LoginLogsTab';
import { BanDialog } from './BanDialog';

// 类型
import type {
    AdminDashboardProps,
    UserData,
    OverviewStats,
    TrendData,
    ActiveUser,
    HourlyData,
    OperationLog,
    LoginLogData,
    AdminTab,
    UserFilter,
} from './types';

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
    // ==================== 用户列表状态 ====================
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userFilter, setUserFilter] = useState<UserFilter>('all');
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    // ==================== 统计数据状态 ====================
    const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
    const [userGrowth, setUserGrowth] = useState<TrendData[]>([]);
    const [messageTrend, setMessageTrend] = useState<TrendData[]>([]);
    const [activeRanking, setActiveRanking] = useState<ActiveUser[]>([]);
    const [hourlyActivity, setHourlyActivity] = useState<HourlyData[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    // ==================== 用户详情弹窗 ====================
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // ==================== 当前视图标签 ====================
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');

    // ==================== 封禁对话框状态 ====================
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [banTargetUserId, setBanTargetUserId] = useState<string | null>(null);
    const [banDays, setBanDays] = useState<string>('0');

    // ==================== 操作日志状态 ====================
    const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
    const [opLogPage, setOpLogPage] = useState(1);
    const [opLogTotal, setOpLogTotal] = useState(0);
    const [opLogLoading, setOpLogLoading] = useState(false);

    // ==================== 登录日志状态 ====================
    const [loginLogs, setLoginLogs] = useState<LoginLogData[]>([]);
    const [loginLogPage, setLoginLogPage] = useState(1);
    const [loginLogTotal, setLoginLogTotal] = useState(0);
    const [loginLogLoading, setLoginLogLoading] = useState(false);

    // ==================== 数据加载 ====================

    // 加载统计数据
    useEffect(() => {
        const loadStats = async () => {
            setStatsLoading(true);
            try {
                const [overview, growth, messages, ranking, hourly] = await Promise.all([
                    api.getOverviewStats(),
                    api.getUserGrowth(),
                    api.getMessageTrend(),
                    api.getActiveRanking(5),
                    api.getHourlyActivity()
                ]);
                setOverviewStats(overview);
                setUserGrowth(growth);
                setMessageTrend(messages);
                setActiveRanking(ranking);
                setHourlyActivity(hourly);
            } catch (err) {
                console.error('加载统计数据失败:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        loadStats();
    }, []);

    // 加载操作日志
    const loadOperationLogs = useCallback(async () => {
        setOpLogLoading(true);
        try {
            const data = await api.getAdminOperationLogs(opLogPage, 15);
            setOperationLogs(data.logs);
            setOpLogTotal(data.total);
        } catch (err) {
            console.error('加载操作日志失败:', err);
        } finally {
            setOpLogLoading(false);
        }
    }, [opLogPage]);

    // 加载登录日志
    const loadLoginLogs = useCallback(async () => {
        setLoginLogLoading(true);
        try {
            const data = await api.getLoginLogs(loginLogPage, 15);
            setLoginLogs(data.logs);
            setLoginLogTotal(data.total);
        } catch (err) {
            console.error('加载登录日志失败:', err);
        } finally {
            setLoginLogLoading(false);
        }
    }, [loginLogPage]);

    // 当切换到日志标签时加载数据
    useEffect(() => {
        if (activeTab === 'operation-logs') {
            loadOperationLogs();
        } else if (activeTab === 'login-logs') {
            loadLoginLogs();
        }
    }, [activeTab, loadOperationLogs, loadLoginLogs]);

    // 加载用户列表
    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getUsers(page, 10, searchTerm || undefined);
            let filteredUsers = data.users;

            // 客户端筛选：本周新用户
            if (userFilter === 'new') {
                const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                filteredUsers = data.users.filter(u => u.createdAt >= oneWeekAgo);
            }

            setUsers(filteredUsers);
            setTotalPages(userFilter === 'new' ? 1 : data.totalPages);
            setTotal(userFilter === 'new' ? filteredUsers.length : data.total);
        } catch (err: any) {
            setError(err.message || '加载用户列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [page, searchTerm, userFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // ==================== 事件处理 ====================

    // 搜索处理
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchTerm(keyword);
    };

    // 清除搜索
    const handleClearSearch = () => {
        setKeyword('');
        setSearchTerm('');
        setPage(1);
    };

    // 清除筛选
    const handleClearFilter = () => {
        setUserFilter('all');
    };

    // 用户操作 - 打开封禁对话框
    const handleBan = (userId: string) => {
        setBanTargetUserId(userId);
        setBanDays('0');
        setBanDialogOpen(true);
    };

    // 确认封禁
    const confirmBan = async () => {
        if (!banTargetUserId) return;
        setActionLoading(banTargetUserId);
        setBanDialogOpen(false);
        try {
            const days = parseInt(banDays) || 0;
            await api.banUser(banTargetUserId, days);
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '操作失败');
        } finally {
            setActionLoading(null);
            setBanTargetUserId(null);
        }
    };

    const handleUnban = async (userId: string) => {
        if (!confirm('确定要解封此用户吗？')) return;
        setActionLoading(userId);
        try {
            await api.unbanUser(userId);
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '操作失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('确定要删除此用户吗？此操作不可恢复！')) return;
        setActionLoading(userId);
        try {
            await api.deleteUser(userId);
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '操作失败');
        } finally {
            setActionLoading(null);
        }
    };

    // ==================== 批量操作 ====================

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const handleToggleMultiSelect = () => {
        setMultiSelectMode(!multiSelectMode);
        if (multiSelectMode) {
            setSelectedUsers(new Set());
        }
    };

    const handleBatchBan = async () => {
        if (selectedUsers.size === 0) return;
        if (!confirm(`确定要批量封禁 ${selectedUsers.size} 个用户吗？`)) return;
        setActionLoading('batch');
        try {
            const result = await api.batchBanUsers(Array.from(selectedUsers));
            alert(`成功封禁 ${result.affected} 个用户`);
            setSelectedUsers(new Set());
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '批量封禁失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBatchUnban = async () => {
        if (selectedUsers.size === 0) return;
        if (!confirm(`确定要批量解封 ${selectedUsers.size} 个用户吗？`)) return;
        setActionLoading('batch');
        try {
            const result = await api.batchUnbanUsers(Array.from(selectedUsers));
            alert(`成功解封 ${result.affected} 个用户`);
            setSelectedUsers(new Set());
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '批量解封失败');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedUsers.size === 0) return;
        if (!confirm(`确定要批量删除 ${selectedUsers.size} 个用户吗？此操作不可恢复！`)) return;
        setActionLoading('batch');
        try {
            const result = await api.batchDeleteUsers(Array.from(selectedUsers));
            alert(`成功删除 ${result.affected} 个用户`);
            setSelectedUsers(new Set());
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '批量删除失败');
        } finally {
            setActionLoading(null);
        }
    };

    // ==================== Tab 切换回调 ====================

    const handleViewAllUsers = () => {
        setUserFilter('all');
        setActiveTab('users');
    };

    const handleViewNewUsers = () => {
        setUserFilter('new');
        setActiveTab('users');
    };

    // ==================== 渲染 ====================

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
            {/* 顶部导航栏 */}
            <AdminHeader
                admin={admin}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onLogout={onLogout}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'overview' ? (
                    <OverviewTab
                        statsLoading={statsLoading}
                        overviewStats={overviewStats}
                        userGrowth={userGrowth}
                        messageTrend={messageTrend}
                        activeRanking={activeRanking}
                        hourlyActivity={hourlyActivity}
                        onViewAllUsers={handleViewAllUsers}
                        onViewNewUsers={handleViewNewUsers}
                        onViewUserDetail={setSelectedUserId}
                    />
                ) : activeTab === 'users' ? (
                    <UsersTab
                        users={users}
                        isLoading={isLoading}
                        error={error}
                        keyword={keyword}
                        searchTerm={searchTerm}
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        userFilter={userFilter}
                        actionLoading={actionLoading}
                        multiSelectMode={multiSelectMode}
                        selectedUsers={selectedUsers}
                        onKeywordChange={setKeyword}
                        onSearch={handleSearch}
                        onClearSearch={handleClearSearch}
                        onClearFilter={handleClearFilter}
                        onPageChange={setPage}
                        onBan={handleBan}
                        onUnban={handleUnban}
                        onDelete={handleDelete}
                        onViewDetail={setSelectedUserId}
                        onToggleMultiSelect={handleToggleMultiSelect}
                        onToggleUserSelection={toggleUserSelection}
                        onToggleSelectAll={toggleSelectAll}
                        onBatchBan={handleBatchBan}
                        onBatchUnban={handleBatchUnban}
                        onBatchDelete={handleBatchDelete}
                        onClearSelection={() => setSelectedUsers(new Set())}
                    />
                ) : activeTab === 'operation-logs' ? (
                    <OperationLogsTab
                        logs={operationLogs}
                        isLoading={opLogLoading}
                        page={opLogPage}
                        total={opLogTotal}
                        onPageChange={setOpLogPage}
                    />
                ) : activeTab === 'login-logs' ? (
                    <LoginLogsTab
                        logs={loginLogs}
                        isLoading={loginLogLoading}
                        page={loginLogPage}
                        total={loginLogTotal}
                        onPageChange={setLoginLogPage}
                    />
                ) : null}
            </main>

            {/* 用户详情弹窗 */}
            {selectedUserId && (
                <UserDetailModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}

            {/* 封禁对话框 */}
            <BanDialog
                isOpen={banDialogOpen}
                banDays={banDays}
                onBanDaysChange={setBanDays}
                onConfirm={confirmBan}
                onCancel={() => setBanDialogOpen(false)}
            />
        </div>
    );
}
