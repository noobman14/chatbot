/**
 * 登录日志标签页
 */

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, UserCheck, CheckCircle, X } from 'lucide-react';
import type { LoginLogData } from './types';
import { formatTime } from './utils';

interface LoginLogsTabProps {
    logs: LoginLogData[];
    isLoading: boolean;
    page: number;
    total: number;
    onPageChange: (page: number) => void;
}

export function LoginLogsTab({
    logs,
    isLoading,
    page,
    total,
    onPageChange,
}: LoginLogsTabProps) {
    const getLoginTypeStyle = (loginType: string) => {
        switch (loginType) {
            case 'ADMIN_LOGIN':
                return 'bg-amber-500/20 text-amber-400';
            case 'USER_REGISTER':
                return 'bg-purple-500/20 text-purple-400';
            default:
                return 'bg-blue-500/20 text-blue-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-zinc-700">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-amber-500" />
                        用户登录日志
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">记录所有用户和管理员的登录活动</p>
                </div>
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-400">暂无登录日志</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-zinc-700/30">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">时间</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">用户</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">类型</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">状态</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">IP地址</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">浏览器</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-zinc-700/30">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                                            {formatTime(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                                            {log.userEmail}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLoginTypeStyle(log.loginType)}`}>
                                                {log.loginTypeLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {log.success ? (
                                                <span className="inline-flex items-center text-green-400">
                                                    <CheckCircle className="h-4 w-4 mr-1" />成功
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-red-400" title={log.failReason || ''}>
                                                    <X className="h-4 w-4 mr-1" />失败
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-mono">
                                            {log.ipAddress || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-500 max-w-xs truncate" title={log.userAgent}>
                                            {log.userAgent ? log.userAgent.substring(0, 40) + '...' : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {/* 分页 */}
                {logs.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-700">
                        <p className="text-sm text-zinc-400">共 {total} 条记录</p>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
                                <ChevronLeft className="h-4 w-4" />上一页
                            </Button>
                            <span className="text-sm text-zinc-400">第 {page} 页</span>
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => onPageChange(page + 1)} disabled={logs.length < 15}>
                                下一页<ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
