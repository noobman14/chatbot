import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';

interface AdminLoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

/**
 * 管理员登录页面
 * 
 * 提供管理员专用的登录界面
 */
export function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await onLogin(email, password);
        } catch (err: any) {
            setError(err.message || '登录失败');
        } finally {
            setIsLoading(false);
        }
    };

    const goBackToUserLogin = () => {
        window.location.href = '/';
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
            <div className="w-full max-w-md">
                {/* 顶部 Logo 和标题区域 */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                        <Shield className="h-9 w-9 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">管理员控制台</h1>
                    <p className="text-sm text-zinc-400">
                        仅限授权管理员访问
                    </p>
                </div>

                <Card className="bg-zinc-800/50 border-zinc-700 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white">管理员登录</CardTitle>
                        <CardDescription className="text-zinc-400">
                            请使用管理员凭据登录后台管理系统
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin} className="flex flex-col gap-6">
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-300">邮箱</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@chatbot.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-300">密码</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                登录管理后台
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                                onClick={goBackToUserLogin}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                返回用户登录
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="mt-6 text-center text-xs text-zinc-500">
                    受保护的管理区域 · 所有操作将被记录
                </p>
            </div>
        </div>
    );
}
