import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Shield,
    LogOut,
    Search,
    Ban,
    CheckCircle,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Users,
    MessageSquare,
    Loader2,
    X,
    TrendingUp,
    BarChart3,
    Clock,
    Eye
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '@/utils/api';
import type { Admin } from '@/hooks/useAdminAuth';
import { UserDetailModal } from './UserDetailModal';

interface AdminDashboardProps {
    admin: Admin;
    onLogout: () => void;
}

interface UserData {
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

interface OverviewStats {
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    userGrowth: number;
    newUsersThisWeek: number;
}

interface TrendData {
    date: string;
    count: number;
}

interface ActiveUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    sessionCount: number;
    messageCount: number;
}

interface HourlyData {
    hour: number;
    count: number;
}

/**
 * 管理员仪表板
 * 
 * 提供用户管理和数据分析功能
 */
export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
    // 用户列表状态
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [userFilter, setUserFilter] = useState<'all' | 'new'>('all'); // 用户筛选
    const [multiSelectMode, setMultiSelectMode] = useState(false); // 多选模式
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set()); // 批量选择

    // 统计数据状态
    const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
    const [userGrowth, setUserGrowth] = useState<TrendData[]>([]);
    const [messageTrend, setMessageTrend] = useState<TrendData[]>([]);
    const [activeRanking, setActiveRanking] = useState<ActiveUser[]>([]);
    const [hourlyActivity, setHourlyActivity] = useState<HourlyData[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);

    // 用户详情弹窗
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // 当前视图标签
    const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');

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

    // 搜索处理
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearchTerm(keyword);
    };

    // 用户操作
    const handleBan = async (userId: string) => {
        if (!confirm('确定要封禁此用户吗？')) return;
        setActionLoading(userId);
        try {
            await api.banUser(userId);
            await loadUsers();
        } catch (err: any) {
            alert(err.message || '操作失败');
        } finally {
            setActionLoading(null);
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

    // 批量操作
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

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
            {/* 顶部导航栏 */}
            <header className="bg-zinc-800/50 border-b border-zinc-700 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-white">管理员控制台</h1>
                                <p className="text-xs text-zinc-400">{admin.email}</p>
                            </div>
                        </div>
                        {/* Tab 切换 */}
                        <div className="flex items-center gap-2 bg-zinc-700/50 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                数据概览
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'users'
                                    ? 'bg-amber-500 text-white'
                                    : 'text-zinc-400 hover:text-white'
                                    }`}
                            >
                                用户管理
                            </button>
                        </div>
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                            onClick={onLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            退出
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'overview' ? (
                    /* ==================== 数据概览 ==================== */
                    <div className="space-y-6">
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div
                                className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm cursor-pointer hover:bg-zinc-700/50 transition-colors"
                                onClick={() => {
                                    setUserFilter('all');
                                    setActiveTab('users');
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">总用户数</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {statsLoading ? '-' : overviewStats?.totalUsers}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                                        <Users className="h-6 w-6 text-blue-400" />
                                    </div>
                                </div>
                                {overviewStats && overviewStats.userGrowth !== 0 && (
                                    <div className="mt-3 flex items-center gap-1 text-sm">
                                        <TrendingUp className={`h-4 w-4 ${overviewStats.userGrowth > 0 ? 'text-green-400' : 'text-red-400'}`} />
                                        <span className={overviewStats.userGrowth > 0 ? 'text-green-400' : 'text-red-400'}>
                                            {overviewStats.userGrowth > 0 ? '+' : ''}{overviewStats.userGrowth}%
                                        </span>
                                        <span className="text-zinc-500">较上周</span>
                                    </div>
                                )}
                                <p className="text-xs text-zinc-500 mt-2">点击查看所有用户</p>
                            </div>
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">总会话数</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {statsLoading ? '-' : overviewStats?.totalSessions}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                                        <MessageSquare className="h-6 w-6 text-purple-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">总消息数</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {statsLoading ? '-' : overviewStats?.totalMessages}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                                        <BarChart3 className="h-6 w-6 text-amber-400" />
                                    </div>
                                </div>
                            </div>
                            <div
                                className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm cursor-pointer hover:bg-zinc-700/50 transition-colors"
                                onClick={() => {
                                    setUserFilter('new');
                                    setActiveTab('users');
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">本周新用户</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {statsLoading ? '-' : overviewStats?.newUsersThisWeek}
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                                        <TrendingUp className="h-6 w-6 text-green-400" />
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">点击查看新用户</p>
                            </div>
                        </div>

                        {/* 图表区域 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 用户增长趋势 */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <h3 className="text-lg font-semibold text-white mb-4">用户增长趋势</h3>
                                <div className="h-64">
                                    {statsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={userGrowth}>
                                                <defs>
                                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                                                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                                <YAxis stroke="#71717a" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                                                    labelFormatter={(v) => `日期: ${v}`}
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#f59e0b" fillOpacity={1} fill="url(#colorUsers)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* 消息量趋势 */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <h3 className="text-lg font-semibold text-white mb-4">消息量趋势</h3>
                                <div className="h-64">
                                    {statsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={messageTrend}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                                                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                                <YAxis stroke="#71717a" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                                                />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 活跃用户排行 */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <h3 className="text-lg font-semibold text-white mb-4">最活跃用户</h3>
                                <div className="space-y-3">
                                    {activeRanking.map((user, index) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 p-3 bg-zinc-700/30 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedUserId(user.id)}
                                        >
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-500 text-white' :
                                                index === 1 ? 'bg-zinc-400 text-white' :
                                                    index === 2 ? 'bg-amber-700 text-white' :
                                                        'bg-zinc-600 text-zinc-300'
                                                }`}>
                                                {index + 1}
                                            </span>
                                            <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-amber-400">{user.messageCount}</p>
                                                <p className="text-xs text-zinc-500">消息</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 24小时活动分布 */}
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="h-5 w-5 text-zinc-400" />
                                    <h3 className="text-lg font-semibold text-white">24小时活动分布</h3>
                                </div>
                                <div className="h-48">
                                    {statsLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={hourlyActivity}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                                                <XAxis dataKey="hour" stroke="#71717a" fontSize={10} tickFormatter={(v) => `${v}时`} />
                                                <YAxis stroke="#71717a" fontSize={10} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                                                    labelFormatter={(v) => `${v}:00`}
                                                />
                                                <Bar dataKey="count" fill="#22c55e" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ==================== 用户管理 ==================== */
                    <div className="space-y-6">
                        {/* 搜索栏 */}
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 backdrop-blur-sm">
                            <form onSubmit={handleSearch} className="flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                    <Input
                                        type="text"
                                        placeholder="搜索用户名或邮箱..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="pl-10 bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                                >
                                    搜索
                                </Button>
                                {searchTerm && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                                        onClick={() => {
                                            setKeyword('');
                                            setSearchTerm('');
                                            setPage(1);
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        清除
                                    </Button>
                                )}
                                {userFilter === 'new' && (
                                    <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-lg">
                                        <span className="text-sm text-green-400">本周新用户</span>
                                        <button
                                            onClick={() => setUserFilter('all')}
                                            className="text-green-400 hover:text-white"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                                {/* 多选模式切换 */}
                                <Button
                                    type="button"
                                    variant={multiSelectMode ? "default" : "outline"}
                                    className={multiSelectMode
                                        ? "bg-amber-500 hover:bg-amber-600 text-black"
                                        : "border-zinc-600 text-zinc-400 hover:text-white hover:bg-zinc-700/50"}
                                    onClick={() => {
                                        setMultiSelectMode(!multiSelectMode);
                                        if (multiSelectMode) {
                                            setSelectedUsers(new Set());
                                        }
                                    }}
                                >
                                    {multiSelectMode ? '退出多选' : '批量操作'}
                                </Button>
                            </form>
                        </div>

                        {/* 批量操作栏 */}
                        {multiSelectMode && selectedUsers.size > 0 && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-amber-400 font-medium">
                                    已选择 {selectedUsers.size} 个用户
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                        onClick={handleBatchBan}
                                        disabled={actionLoading === 'batch'}
                                    >
                                        批量封禁
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                        onClick={handleBatchUnban}
                                        disabled={actionLoading === 'batch'}
                                    >
                                        批量解封
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                        onClick={handleBatchDelete}
                                        disabled={actionLoading === 'batch'}
                                    >
                                        批量删除
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-zinc-400"
                                        onClick={() => setSelectedUsers(new Set())}
                                    >
                                        取消选择
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 用户列表 */}
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl backdrop-blur-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                    </div>
                                ) : error ? (
                                    <div className="flex items-center justify-center py-20 text-red-400">{error}</div>
                                ) : users.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 text-zinc-400">暂无用户</div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-zinc-700/50">
                                            <tr>
                                                {multiSelectMode && (
                                                    <th className="px-4 py-4 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.size === users.length && users.length > 0}
                                                            onChange={toggleSelectAll}
                                                            className="w-4 h-4 rounded border-zinc-500 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-zinc-700"
                                                        />
                                                    </th>
                                                )}
                                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase">用户</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase">状态</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase">会话/消息</th>
                                                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase">注册时间</th>
                                                <th className="px-6 py-4 text-right text-xs font-medium text-zinc-400 uppercase">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-700">
                                            {users.map((user) => (
                                                <tr key={user.id} className={`hover:bg-zinc-700/30 transition-colors ${multiSelectMode && selectedUsers.has(user.id) ? 'bg-amber-500/10' : ''}`}>
                                                    {multiSelectMode && (
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUsers.has(user.id)}
                                                                onChange={() => toggleUserSelection(user.id)}
                                                                className="w-4 h-4 rounded border-zinc-500 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-zinc-700"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full bg-zinc-600" />
                                                            <div>
                                                                <p className="text-sm font-medium text-white">{user.name}</p>
                                                                <p className="text-xs text-zinc-400">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {user.status === 'ACTIVE' ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                                                <CheckCircle className="h-3 w-3" />正常
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                                                                <Ban className="h-3 w-3" />已封禁
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                                                        {user.sessionCount} / {user.messageCount}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                                        {formatTime(user.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                                onClick={() => setSelectedUserId(user.id)}
                                                            >
                                                                <Eye className="h-4 w-4 mr-1" />详情
                                                            </Button>
                                                            {user.status === 'ACTIVE' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                                                    onClick={() => handleBan(user.id)}
                                                                    disabled={actionLoading === user.id}
                                                                >
                                                                    {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="h-4 w-4 mr-1" />封禁</>}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                                    onClick={() => handleUnban(user.id)}
                                                                    disabled={actionLoading === user.id}
                                                                >
                                                                    {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />解封</>}
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                onClick={() => handleDelete(user.id)}
                                                                disabled={actionLoading === user.id}
                                                            >
                                                                {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />删除</>}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* 分页 */}
                            {!isLoading && users.length > 0 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700">
                                    <p className="text-sm text-zinc-400">共 {total} 条，第 {page}/{totalPages} 页</p>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                                            <ChevronLeft className="h-4 w-4" />上一页
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                                            下一页<ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* 用户详情弹窗 */}
            {selectedUserId && (
                <UserDetailModal
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </div>
    );
}
