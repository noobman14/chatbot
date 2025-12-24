import { useState, useEffect, useCallback } from 'react';

// localStorage 键名
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';

export interface UseNotificationReturn {
  // 设置状态
  notificationEnabled: boolean;
  // 权限状态
  notificationPermission: NotificationPermission | 'default';
  // 操作方法
  setNotificationEnabled: (enabled: boolean) => Promise<boolean>;
  sendNotification: (title: string, body: string) => void;
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

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const [isPageVisible, setIsPageVisible] = useState<boolean>(!document.hidden);

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

  return {
    notificationEnabled,
    notificationPermission,
    setNotificationEnabled,
    sendNotification,
    requestPermission,
    isPageVisible,
  };
}

export default useNotification;
