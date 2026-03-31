import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { X, User, MessageSquare, Zap, Hash, Loader2, ChevronDown, ChevronRight, Bot, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/utils/api';

interface UserDetailModalProps {
    userId: string;
    onClose: () => void;
}

interface SessionMessage {
    id: string;
    sender: string;
    content: string;
    time: number;
}

interface UserSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    messages: SessionMessage[];
}

interface UserDetail {
    id: string;
    name: string;
    email: string;
    avatar: string;
    status: string;
    createdAt: number;
    sessionCount: number;
    messageCount: number;
    apiCalls: number;
    tokensUsed: number;
    recentActivity: Array<{ date: string; messages: number }>;
    sessions: UserSession[];
}

// 单条消息组件 - 使用 memo 避免不必要的重渲染
const MessageItem = memo(function MessageItem({
    msg,
    onDelete,
}: {
    msg: SessionMessage;
    onDelete: (id: string) => void;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('确定要删除这条消息吗？')) return;
        setIsDeleting(true);
        await onDelete(msg.id);
        setIsDeleting(false);
    };

    // 截断过长的内容
    const displayContent = useMemo(() => {
        return msg.content.length > 500
            ? msg.content.substring(0, 500) + '...'
            : msg.content;
    }, [msg.content]);

    return (
        <div className="flex gap-3">
            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.sender === 'user' ? 'bg-blue-500/20' : 'bg-amber-500/20'
                }`}>
                {msg.sender === 'user' ? (
                    <User className="h-4 w-4 text-blue-400" />
                ) : (
                    <Bot className="h-4 w-4 text-amber-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400">
                        {msg.sender === 'user' ? '用户' : 'AI'}
                    </span>
                    <span className="text-xs text-zinc-600">
                        {new Date(msg.time).toLocaleTimeString('zh-CN')}
                    </span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words mt-1">
                    {displayContent}
                </p>
            </div>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                title="删除消息"
            >
                {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </div>
    );
});

// 会话列表项组件 - 使用 memo
const SessionItem = memo(function SessionItem({
    session,
    isExpanded,
    onToggle,
    onDeleteMessage,
}: {
    session: UserSession;
    isExpanded: boolean;
    onToggle: () => void;
    onDeleteMessage: (id: string) => void;
}) {
    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('zh-CN');
    };

    // 只在展开时渲染消息列表
    const messagesElement = useMemo(() => {
        if (!isExpanded) return null;

        return (
            <div className="border-t border-zinc-600 p-4 space-y-3 max-h-80 overflow-y-auto">
                {session.messages.map(msg => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        onDelete={onDeleteMessage}
                    />
                ))}
            </div>
        );
    }, [isExpanded, session.messages, onDeleteMessage]);

    return (
        <div className="bg-zinc-700/50 rounded-xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-700 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                    )}
                    <div>
                        <p className="font-medium text-white">{session.title}</p>
                        <p className="text-xs text-zinc-500">
                            {formatDateTime(session.updatedAt)} · {session.messageCount} 条消息
                        </p>
                    </div>
                </div>
            </button>
            {messagesElement}
        </div>
    );
});

/**
 * 用户详情弹窗
 * 
 * 展示用户的详细统计信息和会话消息
 */
export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
    const [user, setUser] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'stats' | 'sessions'>('stats');
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadUserDetail = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await api.getUserDetail(userId);
                setUser(data);
            } catch (err: any) {
                setError(err.message || '加载用户详情失败');
            } finally {
                setIsLoading(false);
            }
        };
        loadUserDetail();
    }, [userId]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('zh-CN');
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    // 使用 useCallback 避免重复创建函数
    const toggleSession = useCallback((sessionId: string) => {
        setExpandedSessions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sessionId)) {
                newSet.delete(sessionId);
            } else {
                newSet.add(sessionId);
            }
            return newSet;
        });
    }, []);

    // 删除消息 - 只更新本地状态，不重新请求全部数据
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        try {
            await api.adminDeleteMessage(messageId);
            // 本地更新：从 sessions 中移除该消息
            setUser(prevUser => {
                if (!prevUser) return prevUser;
                return {
                    ...prevUser,
                    messageCount: prevUser.messageCount - 1,
                    sessions: prevUser.sessions.map(session => ({
                        ...session,
                        messageCount: session.messages.some(m => m.id === messageId)
                            ? session.messageCount - 1
                            : session.messageCount,
                        messages: session.messages.filter(m => m.id !== messageId)
                    }))
                };
            });
        } catch (err: any) {
            alert(err.message || '删除失败');
        }
    }, []);

    // 使用 useMemo 缓存会话列表，避免不必要的重渲染
    const sessionsList = useMemo(() => {
        if (!user?.sessions) return null;

        return user.sessions.map(session => (
            <SessionItem
                key={session.id}
                session={session}
                isExpanded={expandedSessions.has(session.id)}
                onToggle={() => toggleSession(session.id)}
                onDeleteMessage={handleDeleteMessage}
            />
        ));
    }, [user?.sessions, expandedSessions, toggleSession, handleDeleteMessage]);

    // 阻止点击弹窗内部时关闭
    const handleContentClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-zinc-800 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={handleContentClick}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-700">
                    <h2 className="text-xl font-semibold text-white">用户详情</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-400">{error}</div>
                    ) : user ? (
                        <div className="p-6 space-y-6">
                            {/* User Info */}
                            <div className="flex items-center gap-4">
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="h-16 w-16 rounded-full bg-zinc-600"
                                />
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                                    <p className="text-zinc-400">{user.email}</p>
                                    <p className="text-xs text-zinc-500">
                                        注册于 {formatDate(user.createdAt)}
                                    </p>
                                </div>
                                <div className="ml-auto">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {user.status === 'ACTIVE' ? '正常' : '已封禁'}
                                    </span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 border-b border-zinc-700">
                                <button
                                    onClick={() => setActiveTab('stats')}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stats'
                                        ? 'border-amber-500 text-amber-400'
                                        : 'border-transparent text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    统计数据
                                </button>
                                <button
                                    onClick={() => setActiveTab('sessions')}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sessions'
                                        ? 'border-amber-500 text-amber-400'
                                        : 'border-transparent text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    会话记录 ({user.sessions?.length || 0})
                                </button>
                            </div>

                            {activeTab === 'stats' ? (
                                <>
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-zinc-700/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="text-xs">会话数</span>
                                            </div>
                                            <p className="text-2xl font-bold text-white">{user.sessionCount}</p>
                                        </div>
                                        <div className="bg-zinc-700/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                                <Hash className="h-4 w-4" />
                                                <span className="text-xs">消息数</span>
                                            </div>
                                            <p className="text-2xl font-bold text-white">{user.messageCount}</p>
                                        </div>
                                        <div className="bg-zinc-700/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                                <Zap className="h-4 w-4" />
                                                <span className="text-xs">API 调用</span>
                                            </div>
                                            <p className="text-2xl font-bold text-amber-400">{formatNumber(user.apiCalls)}</p>
                                        </div>
                                        <div className="bg-zinc-700/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                                <User className="h-4 w-4" />
                                                <span className="text-xs">Token 消耗</span>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-400">{formatNumber(user.tokensUsed)}</p>
                                        </div>
                                    </div>

                                    {/* Recent Activity Chart */}
                                    <div className="bg-zinc-700/50 rounded-xl p-4">
                                        <h4 className="text-sm font-medium text-zinc-300 mb-4">最近 7 天活动</h4>
                                        <div className="h-48">
                                            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                                                <BarChart data={user.recentActivity}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#71717a"
                                                        fontSize={12}
                                                        tickFormatter={(value) => value.slice(5)}
                                                    />
                                                    <YAxis stroke="#71717a" fontSize={12} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#27272a',
                                                            border: '1px solid #3f3f46',
                                                            borderRadius: '8px',
                                                            color: '#fff'
                                                        }}
                                                    />
                                                    <Bar dataKey="messages" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Sessions List */
                                <div className="space-y-3">
                                    {user.sessions?.length === 0 ? (
                                        <div className="text-center py-10 text-zinc-500">暂无会话记录</div>
                                    ) : (
                                        sessionsList
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
