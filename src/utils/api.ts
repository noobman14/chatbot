/**
 * API 工具类
 * 
 * 封装所有后端 API 接口调用
 */

// API 基础 URL
const API_BASE_URL = 'http://localhost:8080/api/v1';

/**
 * 获取请求头，自动添加 Token
 */
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * 统一处理响应
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // 401 表示 Token 无效或过期，清除本地数据并刷新页面
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  // 后端返回的业务状态码不是 200，抛出错误
  if (data.code !== 200) {
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
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
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
      token: string;
    }>(response);
  },

  /**
   * 用户登录
   */
  async login(params: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
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
      token: string;
    }>(response);
  },

  /**
   * 验证 Token
   */
  async verifyToken() {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
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

  /**
   * 用户登出
   */
  async logout() {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 获取会话列表
   */
  async getSessions(page: number = 1, pageSize: number = 20) {
    const response = await fetch(`${API_BASE_URL}/chat/sessions?page=${page}&pageSize=${pageSize}`, {
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
    const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
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
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
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
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse<void>(response);
  },

  /**
   * 更新会话标题
   */
  async updateSessionTitle(sessionId: string, title: string) {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
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
  async sendMessage(sessionId: string, params: { content: string; mode: string }) {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
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
   * 流式发送消息并获取 AI 回复
   * 使用 Server-Sent Events (SSE) 格式
   */
  async *streamMessage(sessionId: string, params: { content: string; mode: string }) {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      } as HeadersInit,
      body: JSON.stringify(params)
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
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
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
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

  /**
   * 获取用户历史图片
   * @param limit 限制数量（可选）
   */
  async getImages(limit?: number) {
    const url = limit
      ? `${API_BASE_URL}/images?limit=${limit}`
      : `${API_BASE_URL}/images`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse<Array<{
      id: string;
      url: string;
      time: number;
    }>>(response);
  }
};

