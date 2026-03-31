import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { TwoFactorForm } from './TwoFactorForm';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>; 
  // onLogin 仅为兼容现有接口，在新架构中由于要处理 2FA 这个由内部直接 fetch 管理更清晰
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onLoginSuccess?: (user: any, token: string) => void;
}

export function LoginPage({ onRegister, onLoginSuccess }: LoginPageProps) {
  const { t } = useTranslation();

  const [show2FAStep, setShow2FAStep] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [countdown, setCountdown] = useState(0);

  const handleRequires2FA = (email: string, initialCountdown: number) => {
    setAuthEmail(email);
    setCountdown(initialCountdown);
    setShow2FAStep(true);
  };

  const handleBackToLogin = () => {
    setShow2FAStep(false);
    setAuthEmail('');
    setCountdown(0);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Top Logo and Title Area */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50">
            <Bot className="h-8 w-8 text-white dark:text-zinc-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('login.subtitle')}
          </p>
        </div>

        {show2FAStep ? (
          <TwoFactorForm
            email={authEmail}
            initialCountdown={countdown}
            onVerifySuccess={onLoginSuccess}
            onBack={handleBackToLogin}
          />
        ) : (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">{t('login.login')}</TabsTrigger>
              <TabsTrigger value="register">{t('login.register')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>{t('login.login')}</CardTitle>
                  <CardDescription>{t('login.loginDescription')}</CardDescription>
                </CardHeader>
                <LoginForm onLoginSuccess={onLoginSuccess} onRequires2FA={handleRequires2FA} />
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>{t('login.createAccount')}</CardTitle>
                  <CardDescription>{t('login.registerDescription')}</CardDescription>
                </CardHeader>
                <RegisterForm onRegister={onRegister} />
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
