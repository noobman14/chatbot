import { useState, useEffect, useCallback, useRef } from 'react';

// localStorage 键名
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';
const SOUND_ENABLED_KEY = 'sound_enabled';

// 通知提示音 - 使用 data URI 编码的简短提示音
const NOTIFICATION_SOUND_URI = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleB0FT6PY6Z9gBgNUqdnqo1sDAlOo2emfXQMAT6XX5ptaBQJPptbnm1kFAU+l1OOYVwcCT6TT4ZZWCAJPZJ7R4ZVVCQBPodbhllYJAU+k1OGVVgoAT6LU4JVWCgBPotTglVYKAE+i1OCVVgoAT6LU4JVWCgBPotTglVYKAE+i1OCVVgoAUKLV4JdYDABQoNXglFYKAE+g1N+TVQoAT5/T3pJUCgBPn9Pdk1QJAE+e0tyRUwkAT53R25BSCABPnNDbj1EIAE+bz9qOUAcAT5rO2Y1PBwBPmc3YjE4GAE+YzNeKTQYAT5fL1ohMBQBPlsrVh0sEAE+VydSFSgQAT5TI04RJBABS';

export interface NotificationSettings {
  notificationEnabled: boolean;
  soundEnabled: boolean;
}

export interface UseNotificationReturn {
  // 设置状态
  notificationEnabled: boolean;
  soundEnabled: boolean;
  // 权限状态
  notificationPermission: NotificationPermission | 'default';
  // 操作方法
  setNotificationEnabled: (enabled: boolean) => Promise<boolean>;
  setSoundEnabled: (enabled: boolean) => void;
  sendNotification: (title: string, body: string) => void;
  playNotificationSound: () => void;
  requestPermission: () => Promise<boolean>;
  // 页面焦点状态
  isPageVisible: boolean;
}

export function useNotification(): UseNotificationReturn {
  // 从 localStorage 读取初始值
  const [notificationEnabled, setNotificationEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return saved === 'true';
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved === 'true';
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const [isPageVisible, setIsPageVisible] = useState<boolean>(!document.hidden);

  // 音频元素引用
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化时检查通知权限
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 初始化音频元素
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URI);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  // 请求通知权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  // 设置通知开关
  const setNotificationEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }

    setNotificationEnabledState(enabled);
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled));
    return true;
  }, [requestPermission]);

  // 设置声音开关
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  // 发送浏览器通知
  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationEnabled) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // 仅在页面不可见时发送通知
    if (!document.hidden) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.png',
        tag: 'chatbot-message', // 使用相同的 tag 避免重复通知
      });

      // 点击通知时聚焦到页面
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5秒后自动关闭
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, [notificationEnabled]);

  // 播放通知声音
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.warn('Failed to play notification sound:', error);
      });
    }
  }, [soundEnabled]);

  return {
    notificationEnabled,
    soundEnabled,
    notificationPermission,
    setNotificationEnabled,
    setSoundEnabled,
    sendNotification,
    playNotificationSound,
    requestPermission,
    isPageVisible,
  };
}

export default useNotification;
