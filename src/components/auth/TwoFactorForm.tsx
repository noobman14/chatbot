import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/utils/api';

interface TwoFactorFormProps {
  email: string;
  initialCountdown: number;
  onVerifySuccess?: (user: any, token: string) => void;
  onBack: () => void;
}

export function TwoFactorForm({ email, initialCountdown, onVerifySuccess, onBack }: TwoFactorFormProps) {
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user } = await api.verifyTwoFactor({
        email,
        code: verificationCode,
      });

      localStorage.setItem('user', JSON.stringify(user));

      if (onVerifySuccess) {
        onVerifySuccess(user, '');
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || t('login.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setError('');
    setIsLoading(true);

    try {
      const next = await api.resendTwoFactorCode({ email });
      if (next) {
        setCountdown(next.nextCountdown);
      }
    } catch (err: any) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
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
  );
}
