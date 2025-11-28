import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Loader2 } from 'lucide-react';

// 定义组件属性接口，接收登录和注册方法
interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

export function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  // 全局状态：控制加载中动画和错误信息显示
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 登录表单状态：管理登录时的邮箱和密码输入
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册表单状态：管理注册时的姓名、邮箱和密码输入
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // 处理登录逻辑
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // 阻止表单默认提交行为
    setError(''); // 清除之前的错误信息
    setIsLoading(true); // 开启加载状态

    try {
      // 调用后端登录接口
      await onLogin(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false); // 关闭加载状态
    }
  };

  // 处理注册逻辑
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 调用后端注册接口
      await onRegister(registerName, registerEmail, registerPassword);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* 顶部 Logo 和标题区域 */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50">
            <Bot className="h-8 w-8 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Chatbot AI</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your personal AI assistant
          </p>
        </div>

        {/* 使用 Tabs 组件切换登录和注册视图 */}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          {/* 登录表单内容 */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your email and password to access your account.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  {/* 错误信息提示 */}
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {/* 加载中显示 Spinner */}
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 注册表单内容 */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                  Enter your details below to create your new account.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister} className="flex flex-col gap-6">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Name</Label>
                    <Input
                      id="register-name"
                      placeholder="John Doe"
                      required
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
