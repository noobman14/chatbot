/**
 * 集中处理登录态失效：清本地凭证、广播事件供各 Hook 同步内存状态、并指示路由跳转。
 * 避免在 api 层直接 window.location.reload()。
 */
export const UNAUTHORIZED_EVENT = 'app:unauthorized';

export type UnauthorizedDetail = { redirectTo: string };

export function triggerUnauthorized(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('admin');
  localStorage.removeItem('chatSessions');

  const redirectTo = window.location.pathname.startsWith('/admin') ? '/admin' : '/login';
  window.dispatchEvent(
    new CustomEvent(UNAUTHORIZED_EVENT, {
      detail: { redirectTo } satisfies UnauthorizedDetail,
    })
  );
}
