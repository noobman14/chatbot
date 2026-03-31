import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RegisterFormProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
}

export function RegisterForm({ onRegister }: RegisterFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onRegister(name, email, password);
    } catch (err: any) {
      setError(err.message || t('login.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="flex flex-col gap-6">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-name">{t('login.name')}</Label>
          <Input
            id="register-name"
            placeholder={t('login.namePlaceholder')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-email">{t('login.email')}</Label>
          <Input
            id="register-email"
            type="email"
            placeholder={t('login.emailPlaceholder')}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">{t('login.password')}</Label>
          <Input
            id="register-password"
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
          {t('login.createAccount')}
        </Button>
      </CardFooter>
    </form>
  );
}
