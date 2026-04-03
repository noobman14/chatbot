/**
 * 集中处理登录态失效：清本地凭证、广播事件供各 Hook 同步内存状态、并指示路由跳转。
 * 避免在 api 层直接 window.location.reload()。
 */
export const UNAUTHORIZED_EVENT = 'app:unauthorized';

export type UnauthorizedDetail = { redirectTo: string };

function apiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v === 'string' && v.trim()) {
    return v.replace(/\/$/, '');
  }
  return 'http://localhost:8080/api/v1';
}

export function triggerUnauthorized(): void {
  localStorage.removeItem('user');
  localStorage.removeItem('admin');
  localStorage.removeItem('chatSessions');

  // HttpOnly Cookie 需由服务端 Set-Cookie 清除（带 Cookie 调用登出）
  fetch(`${apiBaseUrl()}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {});

  const redirectTo = window.location.pathname.startsWith('/admin') ? '/admin' : '/login';
  window.dispatchEvent(
    new CustomEvent(UNAUTHORIZED_EVENT, {
      detail: { redirectTo } satisfies UnauthorizedDetail,
    })
  );
}
