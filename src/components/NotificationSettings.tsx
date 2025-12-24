import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/hooks/useNotification';
import { Bell, BellOff, Volume2, VolumeX, Play } from 'lucide-react';
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
    soundEnabled,
    notificationPermission,
    setNotificationEnabled,
    setSoundEnabled,
    sendNotification,
    playNotificationSound,
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

  // 处理声音开关变化
  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
  };

  // 测试通知
  const handleTestNotification = () => {
    setIsTestingNotification(true);

    // 播放声音
    if (soundEnabled) {
      playNotificationSound();
    }

    // 发送浏览器通知（即使在焦点页面也发送，用于测试）
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
      <h3 className="text-sm font-medium mb-3">{t('notification.title')}</h3>

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

      {/* 声音提醒开关 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-primary" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">{t('notification.soundAlert')}</span>
        </div>
        <Switch
          checked={soundEnabled}
          onCheckedChange={handleSoundToggle}
        />
      </div>

      {/* 测试按钮 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={handleTestNotification}
        disabled={isTestingNotification || (!notificationEnabled && !soundEnabled)}
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
