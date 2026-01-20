/**
 * 用户管理标签页
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Ban,
    CheckCircle,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
    Eye,
} from 'lucide-react';
import type { UserData, UserFilter } from './types';
import { formatTime } from './utils';

interface UsersTabProps {
    // 数据
    users: UserData[];
    isLoading: boolean;
    error: string;
    keyword: string;
    searchTerm: string;
    page: number;
    totalPages: number;
    total: number;
    userFilter: UserFilter;
    actionLoading: string | null;

    // 多选相关
    multiSelectMode: boolean;
    selectedUsers: Set<string>;

    // 事件处理
    onKeywordChange: (keyword: string) => void;
    onSearch: (e: React.FormEvent) => void;
    onClearSearch: () => void;
    onClearFilter: () => void;
    onPageChange: (page: number) => void;
    onBan: (userId: string) => void;
    onUnban: (userId: string) => void;
    onDelete: (userId: string) => void;
    onViewDetail: (userId: string) => void;

    // 多选相关
    onToggleMultiSelect: () => void;
    onToggleUserSelection: (userId: string) => void;
    onToggleSelectAll: () => void;
    onBatchBan: () => void;
    onBatchUnban: () => void;
    onBatchDelete: () => void;
    onClearSelection: () => void;
}

export function UsersTab({
    users,
    isLoading,
    error,
    keyword,
    searchTerm,
    page,
    totalPages,
    total,
    userFilter,
    actionLoading,
    multiSelectMode,
    selectedUsers,
    onKeywordChange,
    onSearch,
    onClearSearch,
    onClearFilter,
    onPageChange,
    onBan,
    onUnban,
    onDelete,
    onViewDetail,
    onToggleMultiSelect,
    onToggleUserSelection,
    onToggleSelectAll,
    onBatchBan,
    onBatchUnban,
    onBatchDelete,
    onClearSelection,
}: UsersTabProps) {
    return (
        <div className="space-y-6">
            {/* 搜索栏 */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 backdrop-blur-sm">
                <form onSubmit={onSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="搜索用户名或邮箱..."
                            value={keyword}
                            onChange={(e) => onKeywordChange(e.target.value)}
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
                            onClick={onClearSearch}
                        >
                            <X className="h-4 w-4 mr-1" />
                            清除
                        </Button>
                    )}
                    {userFilter === 'new' && (
                        <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1.5 rounded-lg">
                            <span className="text-sm text-green-400">本周新用户</span>
                            <button
                                onClick={onClearFilter}
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
                        onClick={onToggleMultiSelect}
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
                            onClick={onBatchBan}
                            disabled={actionLoading === 'batch'}
                        >
                            批量封禁
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                            onClick={onBatchUnban}
                            disabled={actionLoading === 'batch'}
                        >
                            批量解封
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            onClick={onBatchDelete}
                            disabled={actionLoading === 'batch'}
                        >
                            批量删除
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400"
                            onClick={onClearSelection}
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
                                                onChange={onToggleSelectAll}
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
                                                    onChange={() => onToggleUserSelection(user.id)}
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
                                                    onClick={() => onViewDetail(user.id)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />详情
                                                </Button>
                                                {user.status === 'ACTIVE' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                                        onClick={() => onBan(user.id)}
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Ban className="h-4 w-4 mr-1" />封禁</>}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                                        onClick={() => onUnban(user.id)}
                                                        disabled={actionLoading === user.id}
                                                    >
                                                        {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />解封</>}
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    onClick={() => onDelete(user.id)}
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
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
                                <ChevronLeft className="h-4 w-4" />上一页
                            </Button>
                            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                                下一页<ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
