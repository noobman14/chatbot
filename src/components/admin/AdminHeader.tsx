/**
 * 管理后台顶部导航栏
 */

import { Button } from '@/components/ui/button';
import { Shield, LogOut, FileText, UserCheck } from 'lucide-react';
import type { Admin } from '@/hooks/useAdminAuth';
import type { AdminTab } from './types';

interface AdminHeaderProps {
    admin: Admin;
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    onLogout: () => void;
}

export function AdminHeader({ admin, activeTab, onTabChange, onLogout }: AdminHeaderProps) {
    return (
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
                    <div className="flex items-center gap-1 bg-zinc-700/50 rounded-lg p-1">
                        <button
                            onClick={() => onTabChange('overview')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview'
                                ? 'bg-amber-500 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            数据概览
                        </button>
                        <button
                            onClick={() => onTabChange('users')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'users'
                                ? 'bg-amber-500 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            用户管理
                        </button>
                        <button
                            onClick={() => onTabChange('operation-logs')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'operation-logs'
                                ? 'bg-amber-500 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            <FileText className="h-3.5 w-3.5 inline mr-1" />操作日志
                        </button>
                        <button
                            onClick={() => onTabChange('login-logs')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'login-logs'
                                ? 'bg-amber-500 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            <UserCheck className="h-3.5 w-3.5 inline mr-1" />登录日志
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
    );
}
