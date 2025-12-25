import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// API 基础URL
const API_BASE_URL = 'http://localhost:8080/api/v1';

// 定义组件属性接口，接收登录和注册方法
interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onLoginSuccess?: (user: any, token: string) => void;
}

export function LoginPage({ onLogin, onRegister, onLoginSuccess }: LoginPageProps) {
  const { t } = useTranslation();

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

  // 二次认证状态
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 处理登录逻辑（第一步）
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 调用后端登录接口
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('login.loginFailed'));
      }

      // 检查是否需要二次认证
      if (result.data?.requires_2fa) {
        setShow2FAStep(true);
        if (result.data.code_sent) {
          setCountdown(60); // 60秒倒计时
        } else if (result.data.wait_seconds) {
          setCountdown(result.data.wait_seconds);
        }
      } else if (result.data?.token && result.data?.user) {
        // 直接登录成功（未启用二次认证）
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        if (onLoginSuccess) {
          onLoginSuccess(result.data.user, result.data.token);
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 处理验证码验证（第二步）
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('login.verifyFailed'));
      }

      if (result.data?.token && result.data?.user) {
        // 验证成功，保存token和用户信息
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        // 如果提供了onLoginSuccess回调，使用它；否则刷新页面
        if (onLoginSuccess) {
          onLoginSuccess(result.data.user, result.data.token);
        } else {
          // 刷新页面使useAuth重新读取localStorage
          window.location.reload();
        }
      }
    } catch (err: any) {
      setError(err.message || t('login.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = async () => {
    if (countdown > 0) return;

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
        }),
      });

      const result = await response.json();

      if (result.data?.success) {
        setCountdown(60);
      } else if (result.data?.wait_seconds) {
        setCountdown(result.data.wait_seconds);
      }
    } catch (err: any) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // 返回登录步骤
  const handleBackToLogin = () => {
    setShow2FAStep(false);
    setVerificationCode('');
    setError('');
    setCountdown(0);
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
      setError(err.message || t('login.registerFailed'));
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
          <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('login.subtitle')}
          </p>
        </div>

        {/* 二次认证验证码输入界面 */}
        {show2FAStep ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToLogin}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>{t('login.verificationCode')}</CardTitle>
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Mail className="h-4 w-4" />
                {t('login.verificationCodeSent')}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleVerify2FA} className="flex flex-col gap-6">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">{t('login.verificationCode')}</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={t('login.verificationCodePlaceholder')}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    disabled={countdown > 0 || isLoading}
                    onClick={handleResendCode}
                    className="text-sm"
                  >
                    {countdown > 0
                      ? t('login.resendCodeIn', { seconds: countdown })
                      : t('login.resendCode')}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.verify')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          /* 使用 Tabs 组件切换登录和注册视图 */
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">{t('login.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('login.register')}</TabsTrigger>
            </TabsList>

            {/* 登录表单内容 */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{t('login.login')}</CardTitle>
                  <CardDescription>
                    {t('login.loginDescription')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('login.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('login.password')}</Label>
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
                      {t('login.signIn')}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* 注册表单内容 */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>{t('login.createAccount')}</CardTitle>
                  <CardDescription>
                    {t('login.registerDescription')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister} className="flex flex-col gap-6">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">{t('login.name')}</Label>
                      <Input
                        id="register-name"
                        placeholder={t('login.namePlaceholder')}
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('login.email')}</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t('login.emailPlaceholder')}
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('login.password')}</Label>
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
                      {t('login.createAccount')}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
