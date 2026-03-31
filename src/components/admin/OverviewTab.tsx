/**
 * 数据概览标签页
 */

import {
    Users,
    MessageSquare,
    Loader2,
    TrendingUp,
    BarChart3,
    Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { OverviewStats, TrendData, ActiveUser, HourlyData } from './types';

interface OverviewTabProps {
    statsLoading: boolean;
    overviewStats: OverviewStats | null;
    userGrowth: TrendData[];
    messageTrend: TrendData[];
    activeRanking: ActiveUser[];
    hourlyActivity: HourlyData[];
    onViewAllUsers: () => void;
    onViewNewUsers: () => void;
    onViewUserDetail: (userId: string) => void;
}

export function OverviewTab({
    statsLoading,
    overviewStats,
    userGrowth,
    messageTrend,
    activeRanking,
    hourlyActivity,
    onViewAllUsers,
    onViewNewUsers,
    onViewUserDetail,
}: OverviewTabProps) {
    return (
        <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                    className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 backdrop-blur-sm cursor-pointer hover:bg-zinc-700/50 transition-colors"
                    onClick={onViewAllUsers}
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
                    onClick={onViewNewUsers}
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
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
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
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
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
                                onClick={() => onViewUserDetail(user.id)}
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
                            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
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
    );
}
