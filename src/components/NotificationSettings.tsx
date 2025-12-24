import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/hooks/useNotification';
import { Bell, BellOff, Play } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { t } = useTranslation();
  const {
    notificationEnabled,
    notificationPermission,
    setNotificationEnabled,
  } = useNotification();

  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // 处理通知开关变化
  const handleNotificationToggle = async (checked: boolean) => {
    const success = await setNotificationEnabled(checked);
    if (!success && checked) {
      // 权限被拒绝
      console.warn('Notification permission denied');
    }
  };

  // 测试通知
  const handleTestNotification = () => {
    setIsTestingNotification(true);

    // 发送浏览器通知测试
    if (notificationEnabled && notificationPermission === 'granted') {
      new Notification(t('notification.newMessage'), {
        body: t('notification.aiReplied'),
        icon: '/favicon.png',
      });
    }

    setTimeout(() => {
      setIsTestingNotification(false);
    }, 1000);
  };

  return (
    <div className={cn('notification-settings space-y-4 p-4', className)}>
      {/* 浏览器通知开关 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {notificationEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{t('notification.browserNotification')}</span>
        </div>
        <Switch
          checked={notificationEnabled}
          onCheckedChange={handleNotificationToggle}
        />
      </div>

      {/* 测试按钮 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={handleTestNotification}
        disabled={isTestingNotification || !notificationEnabled}
      >
        <Play className="h-4 w-4 mr-2" />
        {t('notification.test')}
      </Button>

      {/* 权限被拒绝提示 */}
      {notificationPermission === 'denied' && (
        <p className="text-xs text-destructive mt-2">
          {t('notification.permissionDenied')}
        </p>
      )}
    </div>
  );
}

export default NotificationSettings;
