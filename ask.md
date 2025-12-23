# 聊天机器人项目技术面试问答文档

> 本文档针对该项目涉及的核心技术点，整理了可能被问到的面试问题及详细答案

---

## 📑 目录

1. [React 19 & TypeScript](#1-react-19--typescript)
2. [SSE 流式通信](#2-sse-流式通信)
3. [自定义 Hooks](#3-自定义-hooks)
4. [状态管理与数据持久化](#4-状态管理与数据持久化)
5. [API 层封装](#5-api-层封装)
6. [UI 组件库 (shadcn/ui)](#6-ui-组件库-shadcnui)
7. [TailwindCSS](#7-tailwindcss)
8. [Vite 构建工具](#8-vite-构建工具)
9. [性能优化](#9-性能优化)
10. [项目难点与亮点](#10-项目难点与亮点)

---

## 1. React 19 & TypeScript

### Q1: 为什么选择 React 19？有哪些新特性你用到了？

**答案**：
- **选择原因**：React 19 提供了更好的性能、更简洁的 API 和改进的并发特性
- **使用的新特性**：
  - **自动批处理优化**：多次状态更新自动合并，减少重渲染
  - **改进的 TypeScript 支持**：内置类型定义更完善
  - **useOptimistic（未来可能用）**：适合聊天场景的乐观更新

### Q2: 项目中如何使用 TypeScript 保证类型安全？

**答案**：
```typescript
// 1. 接口定义
interface Message {
  id: string;
  sender: "user" | "robot";
  message: {
    content: string;
    reasoning_content: string | "";
  };
  time: number;
}

// 2. 自定义 Hooks 泛型
const [sessions, setSessions] = useState<ChatSession[]>([]);

// 3. API 层泛型封装
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  return data.data;
}

// 4. 组件 Props 类型定义
interface ChatMessagesProps {
  chatMessages: ChatMessageType[];
}
```

**关键点**：
- 严格模式开启 (`strict: true`)
- 所有组件、Hooks、API 都有完整类型定义
- 避免使用 `any`，用 `unknown` 或联合类型代替

### Q3: React 函数组件的优势是什么？

**答案**：
- **简洁性**：代码更少，逻辑更清晰
- **Hooks**：可以复用状态逻辑（如 `useAuth`、`useChatSessions`）
- **性能**：没有 class 实例创建的开销
- **TypeScript 友好**：类型推导更简单
- **未来趋势**：React 团队推荐使用函数组件

---

## 2. SSE 流式通信

### Q4: 什么是 SSE？与 WebSocket 的区别是什么？

**答案**：

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| **通信方向** | 单向（服务器 → 客户端） | 双向 |
| **协议** | HTTP | 独立协议 |
| **连接** | 自动重连 | 需手动实现重连 |
| **数据格式** | 文本 | 文本/二进制 |
| **适用场景** | 实时推送、聊天回复 | 实时聊天、游戏 |

**选择 SSE 的原因**：
- 聊天场景只需服务器推送（单向）
- HTTP 协议更简单，防火墙友好
- 自动重连机制，无需额外实现

### Q5: 项目中 SSE 的实现细节？

**答案**：
```typescript
async *streamMessage(sessionId: string, params: { content: string; mode: string }) {
  const response = await fetch(`${API_BASE_URL}/...`, {
    method: 'POST',
    headers: {
      'Accept': 'text/event-stream'  // 关键：指定 SSE
    },
    body: JSON.stringify(params)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  
  let buffer = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    
    // SSE 格式：事件用 \n\n 分隔
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    
    for (const event of events) {
      // 解析 event: 和 data:
      const lines = event.split('\n');
      let data = '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          data = line.slice(5).trim();
        }
      }
      
      if (data && data !== '[DONE]') {
        yield JSON.parse(data);  // 使用 generator 流式返回
      }
    }
  }
}
```

**关键点**：
- **async generator**：使用 `async *` 和 `yield` 实现流式返回
- **缓冲区管理**：处理分块传输导致的数据不完整问题
- **解码器**：`TextDecoder` 处理 UTF-8 编码
- **事件分隔**：SSE 标准用 `\n\n` 分隔事件

### Q6: 如何实现打字机效果？

**答案**：
```typescript
// 1. 初始化空消息占位符
const aiMsgPlaceholder = {
  message: { content: 'Loading...', reasoning_content: '' },
  sender: 'robot',
  id: newAiMsgId,
  time: Date.now(),
};

// 2. 流式累加内容
let currentAiContent = "";
for await (const chunk of api.streamMessage(currentChatId, { content, mode })) {
  if (chunk.type === 'content') {
    currentAiContent += chunk.text;  // 逐字累加
  }
  
  // 3. 实时更新 UI
  setChatMessages((prev) => {
    const newMessages = [...prev];
    const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
    if (aiMsgIndex !== -1) {
      newMessages[aiMsgIndex].message.content = currentAiContent;
    }
    return newMessages;
  });
}
```

**关键点**：
- **乐观更新**：先展示 Loading，再逐步替换
- **函数式更新**：`setChatMessages(prev => ...)` 确保基于最新状态
- **实时渲染**：每次 `yield` 都触发 `setState`

---

## 3. 自定义 Hooks

### Q7: 为什么要封装自定义 Hooks？

**答案**：
- **逻辑复用**：避免在多个组件重复编写认证、会话管理逻辑
- **关注点分离**：组件只关注 UI，业务逻辑抽离到 Hooks
- **易于测试**：Hooks 可以独立测试
- **代码可读性**：`useAuth()`、`useChatSessions()` 语义清晰

### Q8: `useAuth` Hook 的实现原理？

**答案**：
```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    // 初始化时从 localStorage 读取
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证 Token 有效性
      api.verifyToken()
        .then(data => {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        })
        .catch(() => {
          // Token 无效，清除本地数据
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);
  
  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };
  
  const logout = async () => {
    await api.logout();
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };
  
  return { user, isLoading, login, logout };
}
```

**关键点**：
- **初始化优化**：`useState(() => ...)` 惰性初始化，避免重复解析
- **Token 验证**：应用启动时验证 Token 有效性
- **自动登出**：Token 失效时自动清除本地数据
- **加载状态**：`isLoading` 避免闪烁（未验证完不渲染登录页）

### Q9: `useChatSessions` 如何管理多会话？

**答案**：
```typescript
export function useChatSessions(user: { id: string } | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  
  // 监听用户变化，重新加载会话
  useEffect(() => {
    loadSessions();
  }, [user?.id]);
  
  const loadSessions = async () => {
    const data = await api.getSessions();
    setSessions(data.sessions.map(s => ({
      ...s,
      messages: []  // 消息列表按需加载
    })));
    setCurrentChatId(data.sessions[0]?.id || '');
    
    // 加载第一个会话的详情
    if (data.sessions[0]) {
      await loadSessionDetails(data.sessions[0].id);
    }
  };
  
  const switchChat = async (id: string) => {
    setCurrentChatId(id);
    const session = sessions.find(s => s.id === id);
    // 如果消息未加载，则加载
    if (session && session.messages.length === 0) {
      await loadSessionDetails(id);
    }
  };
  
  const setChatMessages = (newMessages) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === currentChatId
          ? { ...session, messages: newMessages }
          : session
      )
    );
  };
  
  return {
    sessions,
    currentChatId,
    currentMessages: sessions.find(s => s.id === currentChatId)?.messages || [],
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages
  };
}
```

**关键点**：
- **按需加载**：会话列表只加载元信息，消息列表按需加载
- **依赖追踪**：`useEffect([user?.id])` 监听用户变化
- **派生状态**：`currentMessages` 从 `sessions` 计算得出
- **不可变更新**：`map` 返回新数组，而非直接修改

---

## 4. 状态管理与数据持久化

### Q10: 为什么不使用 Redux 或 Zustand？

**答案**：
- **项目规模**：中小型项目，自定义 Hooks 足够
- **避免过度工程**：Redux 模板代码多，学习成本高
- **React 原生能力**：`useState` + `useContext` + 自定义 Hooks 已满足需求
- **TypeScript 友好**：自定义 Hooks 类型推导更简单

**如果项目变大，可以考虑**：
- **Zustand**：轻量级状态管理
- **Jotai / Recoil**：原子化状态管理

### Q11: localStorage 的使用注意事项？

**答案**：

**优点**：
- 简单易用，同步 API
- 数据持久化，刷新不丢失

**缺点和注意事项**：
- **容量限制**：通常 5-10MB
- **同步阻塞**：大量数据读写会阻塞主线程
- **仅支持字符串**：需要 `JSON.stringify/parse`
- **安全性**：不能存储敏感信息（Token 有 XSS 风险）

**项目中的使用**：
```typescript
// 存储
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));

// 读取
const savedUser = localStorage.getItem('user');
const user = savedUser ? JSON.parse(savedUser) : null;

// 删除
localStorage.removeItem('token');
```

**优化建议**：
- Token 更安全的方式：存储在 `httpOnly` Cookie
- 大量数据使用 IndexedDB
- 考虑数据加密

---

## 5. API 层封装

### Q12: 如何封装统一的 API 请求层？

**答案**：
```typescript
const API_BASE_URL = 'http://localhost:8080/api/v1';

// 1. 统一请求头
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// 2. 统一响应处理（泛型）
async function handleResponse<T>(response: Response): Promise<T> {
  // 401 自动跳转登录
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  
  const data = await response.json();
  
  // 业务状态码校验
  if (data.code !== 200) {
    throw new Error(data.message || 'Request failed');
  }
  
  return data.data;
}

// 3. API 方法封装
export const api = {
  async login(params: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse<{
      user: User;
      token: string;
    }>(response);
  },
  
  // ... 其他方法
};
```

**优点**：
- **类型安全**：泛型确保返回值类型
- **错误统一处理**：401 自动登出
- **Token 自动注入**：无需手动添加
- **代码复用**：避免重复的 fetch 调用

### Q13: JWT Token 的认证流程？

**答案**：

**流程**：
```
1. 用户登录 → 后端验证 → 返回 JWT Token
2. 前端存储 Token（localStorage）
3. 后续请求自动在 Header 中携带：Authorization: Bearer <token>
4. 后端验证 Token 有效性 → 返回数据
5. Token 过期 → 后端返回 401 → 前端清除 Token 并跳转登录
```

**项目实现**：
```typescript
// 1. 登录时存储
const data = await api.login({ email, password });
localStorage.setItem('token', data.token);

// 2. 请求时自动携带
function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
}

// 3. Token 失效处理
if (response.status === 401) {
  localStorage.removeItem('token');
  window.location.reload();
}
```

**安全建议**：
- Token 不要存储敏感信息
- 设置合理的过期时间
- 使用 HTTPS 传输
- 考虑 Refresh Token 机制

---

## 6. UI 组件库 (shadcn/ui)

### Q14: 为什么选择 shadcn/ui 而不是 Ant Design 或 Material-UI？

**答案**：

| 特性 | shadcn/ui | Ant Design | Material-UI |
|------|-----------|------------|-------------|
| **集成方式** | 复制代码到项目 | npm 依赖 | npm 依赖 |
| **定制性** | 完全控制源码 | 需要覆盖样式 | Theme 配置 |
| **包大小** | 仅包含使用的组件 | 较大 | 较大 |
| **无头组件** | Radix UI（可访问性强） | 自研 | 自研 |
| **样式方案** | TailwindCSS | Less | Emotion/styled |

**选择理由**：
- **代码所有权**：组件代码在项目中，可随意修改
- **按需引入**：只复制需要的组件，零冗余
- **现代化**：基于 Radix UI 的无头组件，可访问性强
- **TailwindCSS 集成**：与项目技术栈统一

### Q15: Radix UI 的优势是什么？

**答案**：
- **无头组件**：只提供逻辑和可访问性，样式完全自定义
- **WAI-ARIA**：符合无障碍标准（键盘导航、屏幕阅读器）
- **无样式污染**：不会引入不需要的 CSS
- **组合灵活**：`Dialog`、`Dropdown`、`Tooltip` 等组件可组合使用

**示例**：
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger>显示思考过程</CollapsibleTrigger>
  <CollapsibleContent>
    {思考内容}
  </CollapsibleContent>
</Collapsible>
```

---

## 7. TailwindCSS

### Q16: TailwindCSS 的优缺点？

**答案**：

**优点**：
- **开发效率高**：无需离开 HTML，快速编写样式
- **一致性**：设计系统内置（颜色、间距、字体）
- **响应式简单**：`sm:` `md:` `lg:` 前缀
- **Tree-shaking**：未使用的样式自动删除
- **暗色模式**：`dark:` 前缀一键切换

**缺点**：
- **类名冗长**：HTML 可能很长
- **学习曲线**：需要记忆工具类
- **可读性**：对不熟悉的人不友好

**项目中的使用**：
```tsx
<div className={cn(
  "prose prose-sm max-w-none break-words",
  "text-black dark:text-white",
  "[&_pre]:bg-zinc-900 [&_pre]:rounded-xl"
)}>
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

**`cn` 工具函数**：
```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
- `clsx`：条件类名
- `twMerge`：合并冲突的 Tailwind 类（如 `p-4 p-2` → `p-2`）

### Q17: 如何实现深色模式？

**答案**：
```typescript
// 1. ThemeProvider
<ThemeProvider defaultTheme="system" storageKey="ui-theme">
  <App />
</ThemeProvider>

// 2. 切换主题
const { theme, setTheme } = useTheme();
<Button onClick={() => setTheme("dark")}>暗色模式</Button>

// 3. 样式适配
<div className="bg-white dark:bg-zinc-900 text-black dark:text-white">
  内容
</div>
```

**原理**：
- 在 `<html>` 标签添加 `class="dark"`
- TailwindCSS 的 `dark:` 变体基于父级 `.dark` 类生效
- 主题状态存储在 localStorage

---

## 8. Vite 构建工具

### Q18: Vite 相比 Webpack 的优势？

**答案**：

| 特性 | Vite | Webpack |
|------|------|---------|
| **开发启动** | 秒级（ESM） | 慢（打包所有模块） |
| **热更新** | 快（只更新变化模块） | 较慢 |
| **配置** | 简洁 | 复杂 |
| **生产构建** | Rollup | Webpack |
| **原生 ESM** | 支持 | 需要额外配置 |

**Vite 原理**：
- **开发环境**：直接使用浏览器原生 ESM，无需打包
- **生产环境**：使用 Rollup 打包优化
- **依赖预构建**：首次启动时用 esbuild 预构建依赖

**配置示例**：
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'  // 路径别名
    }
  }
})
```

---

## 9. 性能优化

### Q19: 项目中做了哪些性能优化？

**答案**：

**1. React 层面**
```typescript
// 避免不必要的重渲染
const ChatMessage = React.memo(({ message, sender, time }) => {
  // ...
});

// 函数式更新，避免闭包陷阱
setChatMessages(prev => [...prev, newMessage]);

// 惰性初始化
const [user, setUser] = useState(() => {
  return JSON.parse(localStorage.getItem('user'));
});
```

**2. 网络层面**
```typescript
// 流式响应，首字节展示快
for await (const chunk of api.streamMessage(...)) {
  // 逐字展示，无需等待全部内容
}

// 按需加载会话消息
const switchChat = async (id: string) => {
  if (session.messages.length === 0) {
    await loadSessionDetails(id);
  }
};
```

**3. 渲染优化**
```typescript
// 虚拟滚动（如果消息量大）
import { VirtualList } from 'react-window';

// 自动滚动防抖
const scrollToBottom = useCallback(
  debounce(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 100),
  []
);
```

**4. 构建优化**
```typescript
// Tree-shaking（Vite 自动）
// 代码分割
const LazyComponent = lazy(() => import('./HeavyComponent'));
```

### Q20: 如何避免内存泄漏？

**答案**：
```typescript
// 1. 清理事件监听
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);  // 清理
  };
}, []);

// 2. 清理定时器
useEffect(() => {
  const timer = setInterval(() => {
    // ...
  }, 1000);
  
  return () => clearInterval(timer);
}, []);

// 3. 取消 fetch 请求
useEffect(() => {
  const controller = new AbortController();
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData);
  
  return () => controller.abort();
}, []);
```

---

## 10. 项目难点与亮点

### Q21: 项目最大的技术难点是什么？如何解决？

**答案**：

**难点 1：SSE 流式传输的数据分块问题**

**问题**：网络传输可能导致 JSON 被截断，如 `{"type":"con` 被分成两个 chunk

**解决方案**：
```typescript
let buffer = "";

while (true) {
  const chunk = decoder.decode(value, { stream: true });
  buffer += chunk;
  
  // SSE 事件用 \n\n 分隔
  const events = buffer.split('\n\n');
  buffer = events.pop() || '';  // 保留可能不完整的最后一个事件
  
  for (const event of events) {
    // 解析完整事件
  }
}
```

**难点 2：流式传输中的错误处理**

**问题**：浏览器可能在传输完成后报错（chunked encoding 误报）

**解决方案**：
```typescript
try {
  for await (const chunk of api.streamMessage(...)) {
    currentAiContent += chunk.text;
  }
} catch (error) {
  // 如果已经接收到内容，说明传输成功，忽略误报
  if (currentAiContent.length > 0) {
    // 保留已接收内容
  } else {
    // 真正的错误，显示错误信息
    setChatMessages(prev => [...prev, { content: "Error occurred" }]);
  }
}
```

**难点 3：会话标题的智能生成时机**

**问题**：何时更新标题？更新后如何同步到后端？

**解决方案**：
```typescript
const setChatMessages = (newMessages) => {
  setSessions(prevSessions =>
    prevSessions.map(session => {
      if (session.id === currentChatId) {
        let newTitle = session.title;
        
        // 仅在"New Chat"且有第一条用户消息时更新
        if (session.title === 'New Chat' && updatedMessages.length > 0) {
          const firstUserMsg = updatedMessages.find(m => m.sender === 'user');
          if (firstUserMsg) {
            newTitle = firstUserMsg.message.content.slice(0, 20) + '...';
            // 异步同步到后端，不阻塞 UI
            api.updateSessionTitle(currentChatId, newTitle).catch(console.error);
          }
        }
        
        return { ...session, messages: updatedMessages, title: newTitle };
      }
      return session;
    })
  );
};
```

### Q22: 项目最大的亮点是什么？

**答案**：

**亮点 1：优雅的流式响应 + 乐观更新**
- 用户发送消息后立即显示，无需等待
- AI 回复以打字机效果逐字展示，首字节响应 < 200ms
- 结合 SSE 和 React 状态管理，实现流畅的用户体验

**亮点 2：思考过程可视化**
- 支持展示 AI 的推理过程（`reasoning_content`）
- 思考时自动展开，回复完成后自动折叠
- 使用 Radix UI 的 `Collapsible` 组件实现折叠动画

**亮点 3：完善的错误处理**
- SSE 传输支持部分成功（已接收内容不丢失）
- Token 失效自动跳转登录
- 网络异常时友好的错误提示

**亮点 4：类型安全与代码质量**
- TypeScript 严格模式，无 `any` 类型
- 自定义 Hooks 实现逻辑复用
- ESLint 代码检查，代码风格统一

**亮点 5：性能优化**
- 会话消息按需加载，减少初始请求
- 函数式更新避免闭包陷阱
- Vite 构建，开发体验极佳

### Q23: 如果让你重新设计这个项目，你会怎么改进？

**答案**：

**1. 状态管理升级**
- 引入 Zustand 或 Jotai，简化跨组件状态共享
- 使用 React Query 管理服务器状态（自动缓存、重试）

**2. 安全性增强**
- Token 存储在 `httpOnly` Cookie，而非 localStorage
- 实现 Refresh Token 机制
- 添加 CSRF 防护

**3. 性能优化**
- 消息列表虚拟滚动（react-window）
- 图片懒加载
- Service Worker 缓存静态资源

**4. 功能增强**
- 文件上传（支持图片、PDF）
- 消息搜索（全文搜索）
- 消息引用回复
- 多语言国际化（i18n）

**5. 测试**
- 单元测试（Vitest）
- 组件测试（React Testing Library）
- E2E 测试（Playwright）

---

## 📚 总结

### 技术栈掌握程度

| 技术 | 掌握程度 | 说明 |
|------|----------|------|
| **React 19** | ⭐⭐⭐⭐⭐ | 熟练使用 Hooks、理解渲染原理 |
| **TypeScript** | ⭐⭐⭐⭐ | 类型定义完整，泛型使用熟练 |
| **SSE** | ⭐⭐⭐⭐ | 实现流式通信，处理分块传输 |
| **自定义 Hooks** | ⭐⭐⭐⭐⭐ | 封装复杂逻辑，实现状态复用 |
| **TailwindCSS** | ⭐⭐⭐⭐ | 熟练使用工具类，实现响应式 |
| **Vite** | ⭐⭐⭐ | 配置使用，理解构建原理 |

### 面试话术建议

**1. 项目介绍**（1分钟）
> "这是一个现代化的 AI 聊天机器人项目，我负责前端开发。技术栈使用 React 19 + TypeScript + Vite，UI 采用 shadcn/ui 组件库和 TailwindCSS。核心功能包括用户认证、多会话管理、流式响应等。最大的亮点是使用 SSE 实现了流式通信，结合乐观更新策略，用户体验非常流畅。"

**2. 技术难点**（挑 1-2 个详细讲）
> "最大的难点是 SSE 流式传输的数据分块问题。由于网络传输可能导致 JSON 被截断，我实现了一个缓冲区机制，保留不完整的数据块，等待下一次 chunk 到达后再解析。另外，针对浏览器误报的网络错误，我做了优雅降级，已接收的内容不会丢失。"

**3. 项目收获**
> "这个项目让我深入理解了 React Hooks 的底层原理、流式数据处理、以及前后端协作的最佳实践。特别是自定义 Hooks 的封装，让我认识到关注点分离和逻辑复用的重要性。"

---

**祝你面试顺利！** 🎉
