import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UNAUTHORIZED_EVENT, type UnauthorizedDetail } from '@/utils/authSession';

/**
 * 监听全局 401 事件，在 SPA 内跳转到登录页（或管理端入口），避免整页 reload。
 */
export function UnauthorizedListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<UnauthorizedDetail | undefined>;
      const to = ce.detail?.redirectTo ?? '/login';
      navigate(to, { replace: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [navigate]);

  return null;
}
