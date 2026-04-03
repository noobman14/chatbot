/**
 * API 工具类
 * 
 * 封装所有后端 API 接口调用
 */

import { triggerUnauthorized } from '@/utils/authSession';

const DEFAULT_API_BASE = 'http://localhost:8080/api/v1';

/** 供少数需在 fetch 之外拼 URL 的场景使用（如登出清 Cookie） */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL;
  if (typeof v === 'string' && v.trim()) {
    return v.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}

export const API_BASE_URL = getApiBaseUrl();

/** 后端业务成功码：常见为 200，亦有项目统一用 0 */
function isApiSuccessCode(code: unknown): boolean {
  return code === 200 || code === 0;
}

/**
 * 登录/2FA 等无 Token 的 JSON 请求，解析响应体（不触发 401 全局登出逻辑）
 */
async function fetchAuthJson(path: string, init: RequestInit): Promise<{ response: Response; body: any }> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
  });
  const text = await response.text();
  if (!text) {
    throw new Error('服务器返回空响应，请确保后端服务已启动');
  }
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error('服务器响应格式错误');
  }
  return { response, body };
}

/**
 * JSON 请求头。用户 JWT 由后端 HttpOnly Cookie 携带，需配合 {@link apiFetch} 的 credentials。
 */
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: 'include',
    ...init,
  });
}

/**
 * 统一处理响应
 * @param response HTTP响应对象
 * @param skipAuthRedirect 如果为 true，则不会在 401 时自动退出登录并刷新页面
 */
async function handleResponse<T>(response: Response, skipAuthRedirect: boolean = false): Promise<T> {
  // 401 表示 Token 无效或过期
  if (response.status === 401) {
    if (!skipAuthRedirect) {
      triggerUnauthorized();
    }
    throw new Error('Unauthorized');
  }

  // 检查响应是否为空或非 JSON
  const text = await response.text();
  if (!text) {
    throw new Error('服务器返回空响应，请确保后端服务已启动');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('JSON 解析失败:', text.substring(0, 200));
    throw new Error('服务器响应格式错误');
  }

  if (!isApiSuccessCode(data.code)) {
    throw new Error(data.message || 'Request failed');
  }

  return data.data;
}

/**
 * API 接口方法
 */
export const api = {
  /**
   * 用户注册
   */
  async register(params: { name: string; email: string; password: string }) {
    const response = await apiFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    // 注册失败不应该触发自动退出
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        createdAt: number;
      };
      token?: string;
    }>(response, true);
  },

  /**
   * 用户登录
   */
  async login(params: { email: string; password: string }) {
    const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    // 登录失败不应该触发自动退出
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        createdAt: number;
      };
      token?: string;
    }>(response, true);
  },

  /**
   * 登录第一步（支持 2FA 分支），供登录页使用；不走 handleResponse，以便解析 requires_2fa。
   */
  async loginInit(params: { email: string; password: string }): Promise<
    | {
        status: 'session';
        user: {
          id: string;
          name: string;
          email: string;
          avatar: string;
          createdAt: number;
        };
        token?: string;
      }
    | { status: '2fa'; initialCountdown: number }
  > {
    const { response, body } = await fetchAuthJson('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }
    if (body.code !== undefined && !isApiSuccessCode(body.code)) {
      throw new Error(body.message || 'Request failed');
    }
    const data = body.data;
    if (data?.requires_2fa) {
      const initialCountdown = data.code_sent ? 60 : (data.wait_seconds || 0);
      return { status: '2fa', initialCountdown };
    }
    if (data?.user) {
      return { status: 'session', user: data.user, token: (data.token as string) ?? '' };
    }
    throw new Error(body.message || 'Request failed');
  },

  /**
   * 2FA 验证码校验
   */
  async verifyTwoFactor(params: { email: string; code: string }): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string;
      createdAt: number;
    };
    token?: string;
  }> {
    const { response, body } = await fetchAuthJson('/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(body.message || 'Request failed');
    }
    if (body.code !== undefined && !isApiSuccessCode(body.code)) {
      throw new Error(body.message || 'Request failed');
    }
    const data = body.data;
    if (data?.user) {
      return { user: data.user, token: (data.token as string) ?? '' };
    }
    throw new Error(body.message || 'Request failed');
  },

  /**
   * 重新发送 2FA 验证码；返回 null 表示响应中无可用倒计时字段（网络/解析错误会向外抛出）
   */
  async resendTwoFactorCode(params: { email: string }): Promise<{ nextCountdown: number } | null> {
    const { body } = await fetchAuthJson('/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = body.data;
    if (data?.success) {
      return { nextCountdown: 60 };
    }
    if (data?.wait_seconds != null) {
      return { nextCountdown: data.wait_seconds };
    }
    return null;
  },

  /**
   * 验证会话（Cookie 中的 JWT）
   * @param silent401 为 true 时不触发全局登出（用于首屏检测是否已登录）
   */
  async verifyToken(silent401 = false) {
    const response = await apiFetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        createdAt: number;
      };
    }>(response, silent401);
  },

  /**
   * 用户登出
   */
  async logout() {
    const response = await apiFetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 获取会话列表
   */
  async getSessions(page: number = 1, pageSize: number = 20) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      sessions: Array<{
        id: string;
        title: string;
        createdAt: number;
        updatedAt: number;
        messageCount: number;
      }>;
      total: number;
      page: number;
      pageSize: number;
    }>(response);
  },

  /**
   * 创建新会话
   */
  async createSession(title?: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title })
    });
    return handleResponse<{
      session: {
        id: string;
        title: string;
        messages: any[];
        createdAt: number;
        updatedAt: number;
      };
    }>(response);
  },

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      session: {
        id: string;
        title: string;
        messages: Array<{
          id: string;
          sender: string;
          message: {
            content: string;
            reasoning_content: string;
          };
          time: number;
          imageUrl?: string;
        }>;
        createdAt: number;
        updatedAt: number;
      };
    }>(response);
  },


  /**
   * 删除会话
   */
  async deleteSession(sessionId: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 更新会话标题
   */
  async updateSessionTitle(sessionId: string, title: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ title })
    });
    return handleResponse<{
      session: {
        id: string;
        title: string;
        updatedAt: number;
      };
    }>(response);
  },

  /**
   * 发送消息并获取 AI 回复
   */
  async sendMessage(sessionId: string, params: { content: string; mode: string; image_data?: string; image_mime_type?: string }) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse<{
      userMessage: {
        id: string;
        sender: string;
        message: {
          content: string;
          reasoning_content: string;
        };
        time: number;
      };
      aiMessage: {
        id: string;
        sender: string;
        message: {
          content: string;
          reasoning_content: string;
        };
        time: number;
      };
    }>(response);
  },

  /**
   * 修改消息
   */
  async updateMessage(sessionId: string, messageId: string, content: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/${messageId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
    return handleResponse<{ content: string }>(response);
  },

  /**
   * 删除消息
   */
  async deleteMessage(sessionId: string, messageId: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 删除指定消息及之后的所有消息
   */
  async deleteMessagesAfter(sessionId: string, messageId: string) {
    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/${messageId}/after`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 流式发送消息并获取 AI 回复
   * 使用 Server- Sent Events (SSE) 格式
   * 支持多模态（图片+文本）
   */
  async * streamMessage(sessionId: string, params: { content: string; mode: string, messageId?: string, image_data?: string, image_mime_type?: string }) {
    // 构造符合后端 DTO 的请求体
    const requestBody = {
      content: params.content,
      mode: params.mode,
      messageId: params.messageId,
      imageData: params.image_data,
      imageMimeType: params.image_mime_type
    };

    const response = await apiFetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      } as HeadersInit,
      body: JSON.stringify(requestBody)
    });

    if (response.status === 401) {
      triggerUnauthorized();
      throw new Error('Unauthorized');
    }

    if (!response.ok || !response.body) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // SSE 格式：事件之间用双换行分隔
        const events = buffer.split('\n\n');

        // 保留最后一个可能不完整的事件
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;

          // 解析 SSE 事件
          const lines = event.split('\n');
          let eventType = 'message';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              data = line.slice(5).trim();
            }
          }

          // 如果是 done 事件，正常结束
          if (eventType === 'done' || data === '[DONE]') {
            return;
          }

          // 如果是错误事件，抛出异常
          if (eventType === 'error') {
            try {
              const errorData = JSON.parse(data);
              throw new Error(errorData.text || '流式响应出错');
            } catch (e) {
              if (e instanceof SyntaxError) {
                throw new Error('流式响应出错');
              }
              throw e;
            }
          }

          // 解析 data 中的 JSON
          if (data && data !== '[DONE]') {
            try {
              const json = JSON.parse(data);
              yield json;
            } catch (e) {
              console.error('Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * 获取用户信息
   */
  async getUserProfile() {
    const response = await apiFetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        createdAt: number;
      };
    }>(response);
  },

  // ==================== 管理员 API ====================

  /**
   * 管理员登录
   */
  async adminLogin(params: { email: string; password: string }) {
    const response = await apiFetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse<{
      admin: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
      token?: string;
    }>(response);
  },

  /**
   * 更新用户信息
   */
  async updateProfile(params: { name?: string; avatar?: string }) {
    const response = await apiFetch(`${API_BASE_URL}/user/profile`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse<{
      user: {
        id: string;
        name: string;
        email: string;
        avatar: string;
        createdAt: number;
      };
    }>(response);
  },

  /**
   * 修改密码
   */
  async changePassword(params: { oldPassword: string; newPassword: string }) {
    const response = await apiFetch(`${API_BASE_URL}/user/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    // 密码错误不应该触发自动退出
    return handleResponse<void>(response, true);
  },

  /**
   * 获取用户历史图片
   * @param limit 限制数量（可选）
   */
  async getHistoryImages(limit?: number) {
    const url = limit
      ? `${API_BASE_URL}/images?limit=${limit}`
      : `${API_BASE_URL}/images`;

    const response = await apiFetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{
      id: string;
      url: string;
      time: number;
    }>>(response);
  },

  /**
   * 获取用户列表（管理员）
   */
  async getUsers(page: number = 1, pageSize: number = 20, keyword?: string) {
    let url = `${API_BASE_URL}/admin/users?page=${page}&pageSize=${pageSize}`;
    if (keyword) {
      url += `&keyword=${encodeURIComponent(keyword)}`;
    }
    const response = await apiFetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      users: Array<{
        id: string;
        name: string;
        email: string;
        avatar: string;
        status: string;
        createdAt: number;
        updatedAt: number;
        sessionCount: number;
        messageCount: number;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(response);
  },

  /**
   * 封禁用户（管理员）
   */
  async banUser(userId: string, days?: number) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/ban${days ? `?days=${days}` : ''}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 解封用户（管理员）
   */
  async unbanUser(userId: string) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/unban`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 删除用户（管理员）
   */
  async deleteUser(userId: string) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 批量封禁用户
   */
  async batchBanUsers(userIds: string[]) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/batch-ban`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userIds)
    });
    return handleResponse<{ affected: number }>(response);
  },

  /**
   * 批量解封用户
   */
  async batchUnbanUsers(userIds: string[]) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/batch-unban`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userIds)
    });
    return handleResponse<{ affected: number }>(response);
  },

  /**
   * 批量删除用户
   */
  async batchDeleteUsers(userIds: string[]) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/batch-delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userIds)
    });
    return handleResponse<{ affected: number }>(response);
  },

  /**
   * 删除消息（管理员）
   */
  async adminDeleteMessage(messageId: string) {
    const response = await apiFetch(`${API_BASE_URL}/admin/messages/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 获取操作日志
   */
  async getAdminOperationLogs(page: number, pageSize: number) {
    const response = await apiFetch(`${API_BASE_URL}/admin/logs/operations?page=${page}&limit=${pageSize}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      logs: Array<any>;
      total: number;
    }>(response);
  },

  /**
   * 获取登录日志
   */
  async getLoginLogs(page: number, pageSize: number) {
    const response = await apiFetch(`${API_BASE_URL}/admin/logs/logins?page=${page}&limit=${pageSize}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      logs: Array<any>;
      total: number;
    }>(response);
  },

  // ==================== 统计 API ====================

  /**
   * 获取总览统计
   */
  async getOverviewStats() {
    const response = await apiFetch(`${API_BASE_URL}/admin/statistics/overview`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      totalUsers: number;
      totalSessions: number;
      totalMessages: number;
      userGrowth: number;
      newUsersThisWeek: number;
    }>(response);
  },

  /**
   * 获取用户增长趋势
   */
  async getUserGrowth() {
    const response = await apiFetch(`${API_BASE_URL}/admin/statistics/user-growth`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{ date: string; count: number }>>(response);
  },

  /**
   * 获取消息趋势
   */
  async getMessageTrend() {
    const response = await apiFetch(`${API_BASE_URL}/admin/statistics/message-trend`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{ date: string; count: number }>>(response);
  },

  /**
   * 获取活跃用户排行
   */
  async getActiveRanking(limit: number = 10) {
    const response = await apiFetch(`${API_BASE_URL}/admin/statistics/active-ranking?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{
      id: string;
      name: string;
      email: string;
      avatar: string;
      sessionCount: number;
      messageCount: number;
    }>>(response);
  },

  /**
   * 获取24小时活动分布
   */
  async getHourlyActivity() {
    const response = await apiFetch(`${API_BASE_URL}/admin/statistics/hourly-activity`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{ hour: number; count: number }>>(response);
  },

  /**
   * 获取用户详细统计
   */
  async getUserDetail(userId: string) {
    const response = await apiFetch(`${API_BASE_URL}/admin/users/${userId}/detail`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<{
      id: string;
      name: string;
      email: string;
      avatar: string;
      status: string;
      createdAt: number;
      sessionCount: number;
      messageCount: number;
      apiCalls: number;
      tokensUsed: number;
      recentActivity: Array<{ date: string; messages: number }>;
      sessions: Array<{
        id: string;
        title: string;
        createdAt: number;
        updatedAt: number;
        messageCount: number;
        messages: Array<{
          id: string;
          sender: string;
          content: string;
          time: number;
        }>;
      }>;
    }>(response);
  },

  /**
   * 润色 prompt
   * 使用 AI 优化图片生成的 prompt，不保存到聊天记录
   * @param text 用户原始输入的文本
   * @returns 润色后的文本
   */
  async polishPrompt(text: string): Promise<string> {
    const response = await apiFetch(`${API_BASE_URL}/ai/polish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    const data = await handleResponse<{ polishedText: string }>(response);
    return data.polishedText;
  }
};