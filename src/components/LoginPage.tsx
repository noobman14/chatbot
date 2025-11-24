import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Loader2 } from 'lucide-react';

// 定义用户接口，包含姓名、邮箱和头像 URL
interface User {
  name: string;
  email: string;
  avatar: string;
}

// 定义组件属性接口，接收登录成功后的回调函数
interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
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

    // 模拟网络延迟，提升用户体验真实感
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // 从 localStorage 获取已注册的用户列表（模拟数据库）
      const usersDb = JSON.parse(localStorage.getItem('chat_users_db') || '[]');
      // 查找匹配邮箱和密码的用户
      const user = usersDb.find((u: any) => u.email === loginEmail && u.password === loginPassword);

      if (user) {
        // 登录成功，调用父组件传递的回调函数
        onLogin({
          name: user.name,
          email: user.email,
          avatar: user.avatar
        });
      } else {
        // 登录失败，显示错误信息
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsLoading(false); // 关闭加载状态
    }
  };

  // 处理注册逻辑
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // 获取现有用户列表
      const usersDb = JSON.parse(localStorage.getItem('chat_users_db') || '[]');

      // 检查邮箱是否已被注册
      if (usersDb.find((u: any) => u.email === registerEmail)) {
        setError('Email already exists');
        setIsLoading(false);
        return;
      }

      // 创建新用户对象
      const newUser = {
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        // 使用 DiceBear API 根据邮箱生成唯一的随机头像
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${registerEmail}`
      };

      // 保存新用户到本地存储（模拟数据库写入）
      usersDb.push(newUser);
      localStorage.setItem('chat_users_db', JSON.stringify(usersDb));

      // 注册成功后自动登录
      onLogin({
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar
      });
    } catch (err) {
      setError('Failed to create account');
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
