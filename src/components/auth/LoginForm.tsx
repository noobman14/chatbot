import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = 'http://localhost:8080/api/v1';

interface LoginFormProps {
  onLoginSuccess?: (user: any, token: string) => void;
  onRequires2FA: (email: string, countdown: number) => void;
}

export function LoginForm({ onLoginSuccess, onRequires2FA }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t('login.loginFailed'));
      }

      if (result.data?.requires_2fa) {
        const initialCountdown = result.data.code_sent ? 60 : (result.data.wait_seconds || 0);
        onRequires2FA(email, initialCountdown);
      } else if (result.data?.token && result.data?.user) {
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

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-6">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('login.email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('login.emailPlaceholder')}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('login.password')}</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('login.signIn')}
        </Button>
      </CardFooter>
    </form>
  );
}
