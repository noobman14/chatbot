# Chatbot 后端 API 接口文档

## 概述

本文档为 Chatbot AI 聊天应用的后端接口文档，定义了前端与后端交互所需的全部 RESTful API 接口。

**基础信息：**
- 基础URL：`http://localhost:8080/api/v1`
- 数据格式：JSON
- 字符编码：UTF-8
- 认证方式：Bearer Token (JWT)

---

## 目录

1. [用户认证模块](#1-用户认证模块)
2. [聊天会话管理模块](#2-聊天会话管理模块)
3. [AI对话模块](#3-ai对话模块)
4. [用户信息管理模块](#4-用户信息管理模块)
5. [通用数据结构](#5-通用数据结构)
6. [错误码说明](#6-错误码说明)

---

## 1. 用户认证模块

### 1.1 用户注册

**接口说明：** 创建新用户账户

**请求方式：** `POST`

**请求路径：** `/api/v1/auth/register`

**是否需要认证：** 否

**请求参数（Body）：**

```json
{
  "name": "string",      // 用户姓名，必填，长度 1-50
  "email": "string",     // 邮箱地址，必填，需符合邮箱格式
  "password": "string"   // 密码，必填，最小长度 6
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "string",           // 用户唯一标识
      "name": "string",         // 用户姓名
      "email": "string",        // 邮箱地址
      "avatar": "string",       // 头像URL
      "createdAt": "number"     // 创建时间戳（毫秒）
    },
    "token": "string"          // JWT Token
  }
}
```

**错误响应：**

```json
{
  "code": 400,
  "message": "邮箱已被注册"
}
```

---

### 1.2 用户登录

**接口说明：** 用户登录获取访问令牌

**请求方式：** `POST`

**请求路径：** `/api/v1/auth/login`

**是否需要认证：** 否

**请求参数（Body）：**

```json
{
  "email": "string",     // 邮箱地址，必填
  "password": "string"   // 密码，必填
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar": "string",
      "createdAt": "number"
    },
    "token": "string"
  }
}
```

**错误响应：**

```json
{
  "code": 401,
  "message": "邮箱或密码错误"
}
```

---

### 1.3 用户登出

**接口说明：** 用户登出（可选实现，用于服务端token失效）

**请求方式：** `POST`

**请求路径：** `/api/v1/auth/logout`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**成功响应：**

```json
{
  "code": 200,
  "message": "登出成功"
}
```

---

### 1.4 验证 Token

**接口说明：** 验证当前 Token 是否有效

**请求方式：** `GET`

**请求路径：** `/api/v1/auth/verify`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**成功响应：**

```json
{
  "code": 200,
  "message": "Token 有效",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar": "string",
      "createdAt": "number"
    }
  }
}
```

---

## 2. 聊天会话管理模块

### 2.1 获取所有聊天会话

**接口说明：** 获取当前用户的所有聊天会话列表

**请求方式：** `GET`

**请求路径：** `/api/v1/chat/sessions`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**查询参数（可选）：**

```
page: number      // 页码，默认 1
pageSize: number  // 每页数量，默认 20
```

**成功响应：**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "sessions": [
      {
        "id": "string",           // 会话唯一标识
        "title": "string",        // 会话标题
        "createdAt": "number",    // 创建时间戳
        "updatedAt": "number",    // 最后更新时间戳
        "messageCount": "number"  // 消息数量
      }
    ],
    "total": "number",           // 总会话数
    "page": "number",            // 当前页码
    "pageSize": "number"         // 每页数量
  }
}
```

---

### 2.2 创建新聊天会话

**接口说明：** 创建一个新的聊天会话

**请求方式：** `POST`

**请求路径：** `/api/v1/chat/sessions`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**请求参数（Body）：**

```json
{
  "title": "string"  // 会话标题，可选，默认 "New Chat"
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "session": {
      "id": "string",
      "title": "string",
      "messages": [],
      "createdAt": "number",
      "updatedAt": "number"
    }
  }
}
```

---

### 2.3 获取指定会话详情

**接口说明：** 获取指定会话的详细信息及消息列表

**请求方式：** `GET`

**请求路径：** `/api/v1/chat/sessions/:sessionId`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**成功响应：**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "session": {
      "id": "string",
      "title": "string",
      "messages": [
        {
          "id": "string",              // 消息唯一标识
          "sender": "string",          // 发送者类型："user" | "robot"
          "message": {
            "content": "string",              // 消息内容
            "reasoning_content": "string"     // AI 推理过程（仅机器人消息）
          },
          "time": "number"             // 消息时间戳
        }
      ],
      "createdAt": "number",
      "updatedAt": "number"
    }
  }
}
```

---

### 2.4 更新会话标题

**接口说明：** 更新指定会话的标题

**请求方式：** `PATCH`

**请求路径：** `/api/v1/chat/sessions/:sessionId`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**请求参数（Body）：**

```json
{
  "title": "string"  // 新标题，必填
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "session": {
      "id": "string",
      "title": "string",
      "updatedAt": "number"
    }
  }
}
```

---

### 2.5 删除会话

**接口说明：** 删除指定的聊天会话

**请求方式：** `DELETE`

**请求路径：** `/api/v1/chat/sessions/:sessionId`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**成功响应：**

```json
{
  "code": 200,
  "message": "删除成功"
}
```

**错误响应：**

```json
{
  "code": 403,
  "message": "无法删除最后一个空会话"
}
```

---

## 3. AI对话模块

### 3.1 发送消息并获取AI回复

**接口说明：** 向指定会话发送消息并获取AI的回复

**请求方式：** `POST`

**请求路径：** `/api/v1/chat/sessions/:sessionId/messages`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**请求参数（Body）：**

```json
{
  "content": "string",     // 用户消息内容，必填
  "mode": "string"         // AI 模式："disabled"（快速）| "enabled"（思考模式），必填
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "发送成功",
  "data": {
    "userMessage": {
      "id": "string",
      "sender": "user",
      "message": {
        "content": "string",
        "reasoning_content": ""
      },
      "time": "number"
    },
    "aiMessage": {
      "id": "string",
      "sender": "robot",
      "message": {
        "content": "string",                // AI 回复内容
        "reasoning_content": "string"       // AI 推理过程（仅在 mode="enabled" 时有值）
      },
      "time": "number"
    }
  }
}
```

**错误响应：**

```json
{
  "code": 500,
  "message": "AI 服务暂时不可用"
}
```

```json
{
  "code": 408,
  "message": "请求超时，请稍后重试"
}
```

---

### 3.2 获取指定会话的所有消息

**接口说明：** 获取指定会话的历史消息列表（分页）

**请求方式：** `GET`

**请求路径：** `/api/v1/chat/sessions/:sessionId/messages`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**查询参数（可选）：**

```
page: number        // 页码，默认 1
pageSize: number    // 每页消息数，默认 50
```

**成功响应：**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "messages": [
      {
        "id": "string",
        "sender": "string",
        "message": {
          "content": "string",
          "reasoning_content": "string"
        },
        "time": "number"
      }
    ],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}
```


---

### 3.3 流式发送消息并获取AI回复

**接口说明：** 向指定会话发送消息，并以流式方式获取AI的回复（支持打字机效果）

**请求方式：** `POST`

**请求路径：** `/api/v1/chat/sessions/:sessionId/messages/stream`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
Accept: text/event-stream
```

**路径参数：**

```
sessionId: string  // 会话ID
```

**请求参数（Body）：**

```json
{
  "content": "string",     // 用户消息内容，必填
  "mode": "string"         // AI 模式："disabled"（快速）| "enabled"（思考模式），必填
}
```

**成功响应（Stream）：**

响应数据为 SSE (Server-Sent Events) 格式，每条数据为一个 JSON 字符串。

**数据块示例：**

1. 思考过程（仅 enabled 模式）：
```json
{"type": "thinking", "text": "AI"}
{"type": "thinking", "text": "正在"}
{"type": "thinking", "text": "思考..."}
```

2. 内容输出：
```json
{"type": "content", "text": "你好"}
{"type": "content", "text": "，"}
{"type": "content", "text": "世界"}
```

---


## 4. 用户信息管理模块

### 4.1 获取用户信息

**接口说明：** 获取当前登录用户的详细信息

**请求方式：** `GET`

**请求路径：** `/api/v1/user/profile`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**成功响应：**

```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar": "string",
      "createdAt": "number"
    }
  }
}
```

---

### 4.2 更新用户信息

**接口说明：** 更新用户资料（姓名、头像）

**请求方式：** `PATCH`

**请求路径：** `/api/v1/user/profile`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**请求参数（Body）：**

```json
{
  "name": "string",    // 用户姓名，可选
  "avatar": "string"   // 头像URL，可选
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatar": "string",
      "createdAt": "number"
    }
  }
}
```

---

### 4.3 修改密码

**接口说明：** 修改用户密码

**请求方式：** `POST`

**请求路径：** `/api/v1/user/change-password`

**是否需要认证：** 是

**请求头：**

```
Authorization: Bearer <token>
```

**请求参数（Body）：**

```json
{
  "oldPassword": "string",   // 旧密码，必填
  "newPassword": "string"    // 新密码，必填，最小长度 6
}
```

**成功响应：**

```json
{
  "code": 200,
  "message": "密码修改成功"
}
```

**错误响应：**

```json
{
  "code": 401,
  "message": "旧密码错误"
}
```

---

## 5. 通用数据结构

### 5.1 用户对象（User）

```typescript
interface User {
  id: string;           // 用户唯一标识
  name: string;         // 用户姓名
  email: string;        // 邮箱地址
  avatar: string;       // 头像URL
  createdAt: number;    // 创建时间戳（毫秒）
}
```

---

### 5.2 会话对象（ChatSession）

```typescript
interface ChatSession {
  id: string;              // 会话唯一标识
  title: string;           // 会话标题
  messages: Message[];     // 消息列表
  createdAt: number;       // 创建时间戳
  updatedAt: number;       // 最后更新时间戳
}
```

---

### 5.3 消息对象（Message）

```typescript
interface Message {
  id: string;                       // 消息唯一标识
  sender: "user" | "robot";         // 发送者类型
  message: {
    content: string;                  // 消息内容
    reasoning_content: string | "";   // AI 推理过程（仅机器人消息，思考模式下有值）
  };
  time: number;                     // 消息时间戳
}
```

---

## 6. 错误码说明

### 6.1 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（Token 无效或过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 408 | 请求超时 |
| 500 | 服务器内部错误 |

### 6.2 业务错误码

业务错误码在响应体的 `code` 字段中返回：

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 认证失败 |
| 403 | 操作被拒绝 |
| 404 | 资源不存在 |
| 408 | 请求超时 |
| 409 | 资源冲突（如邮箱已存在） |
| 500 | 服务器错误 |

---

## 7. 认证说明

### 7.1 Token 获取

用户通过 `/api/v1/auth/login` 或 `/api/v1/auth/register` 接口登录或注册成功后，服务端会返回一个 JWT Token。

### 7.2 Token 使用

前端需要在所有需要认证的接口请求头中携带此 Token：

```
Authorization: Bearer <your_token_here>
```

### 7.3 Token 过期处理

- Token 默认有效期建议为 7 天
- Token 过期后，前端应引导用户重新登录
- 可以实现 Token 刷新机制（可选）

---

## 8. AI 模型集成说明

### 8.1 AI 服务端点

后端需要集成 AI 对话服务（如 OpenAI、字节跳动豆包等）。当前前端使用的是：

- **服务商：** 字节跳动豆包
- **端点：** `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- **模型：** `doubao-seed-1-6-lite-251015`

### 8.2 两种对话模式

1. **快速模式（mode="disabled"）：** 
   - 不返回推理过程
   - `reasoning_content` 为空字符串

2. **思考模式（mode="enabled"）：**
   - 返回 AI 的推理过程
   - `reasoning_content` 包含详细的思考步骤

### 8.3 系统提示词

建议后端使用以下系统提示词：

```
你是一个智能助手，名为AI助手。你的任务是帮助用户解决问题、提供信息、给出建议，并保持友好和礼貌。你应遵守以下原则：
1. 积极、耐心、乐于助人，尽量用清晰、易理解的语言回答用户问题。
2. 优先提供准确、有条理的信息，必要时解释背景或给出步骤。
3. 避免发表歧视、攻击或不当内容，不生成敏感或违法信息。
4. 当用户提出技术、学习或计算问题时，展示详细步骤和思考过程。
5. 适度使用例子、列表或表格辅助说明，让回答更直观易懂。
6. 根据用户需求调整语气和风格，可以适当幽默或轻松，但保持专业。
7. 当信息不确定时，要明确说明，并建议用户查证。
```

---

## 9. 安全性建议

### 9.1 密码存储

- 使用 bcrypt 或 argon2 等安全哈希算法存储密码
- 不要明文存储密码

### 9.2 API 限流

建议对以下接口进行限流：

- 登录接口：防止暴力破解（如：5次/分钟）
- 注册接口：防止恶意注册（如：3次/小时）
- AI 对话接口：防止滥用（如：30次/分钟）

### 9.3 输入验证

- 对所有用户输入进行验证和清理
- 防止 SQL 注入、XSS 攻击

### 9.4 CORS 设置

- 合理配置 CORS 策略
- 仅允许信任的域名访问

---

## 10. 环境配置建议

### 10.1 环境变量

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
DATABASE_URL=your_database_url
DATABASE_NAME=chatbot_db

# JWT 配置
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# AI 服务配置
AI_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
AI_API_KEY=your_api_key
AI_MODEL=doubao-seed-1-6-lite-251015
AI_TIMEOUT=30000

# 头像服务
AVATAR_SERVICE_URL=https://api.dicebear.com/7.x/avataaars/svg
```

---

## 11. 数据库设计建议

### 11.1 用户表（users）

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
```

### 11.2 会话表（chat_sessions）

```sql
CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_sessions_updated_at ON chat_sessions(updated_at);
```

### 11.3 消息表（messages）

```sql
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  sender ENUM('user', 'robot') NOT NULL,
  content TEXT NOT NULL,
  reasoning_content TEXT,
  time BIGINT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_time ON messages(time);
```

---

## 12. 接口调用示例

### 12.1 用户注册示例（JavaScript）

```javascript
async function register(name, email, password) {
  try {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (data.code === 200) {
      // 保存 token
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}
```

### 12.2 发送消息示例（JavaScript）

```javascript
async function sendMessage(sessionId, content, mode) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, mode })
    });
    
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
}
```

---

## 13. 前端集成提示

### 13.1 当前前端实现方式

当前前端使用 `localStorage` 进行数据持久化，包括：

- `chat_user`: 用户信息
- `chat_users_db`: 模拟的用户数据库
- `chat_sessions`: 所有聊天会话
- `current_chat_id`: 当前选中的会话 ID

### 13.2 迁移到后端的建议

1. **替换 `useAuth` Hook**：
   - 将注册和登录逻辑改为调用后端 API
   - 从响应中获取并存储 Token

2. **替换 `useChatSessions` Hook**：
   - 从后端 API 加载会话列表，而不是 localStorage
   - 创建、删除、更新会话时调用对应的后端接口

3. **修改 `ChatInput` 组件**：
   - 将 `GetAiRespond` 函数改为调用后端的消息接口
   - 不再直接调用豆包 API

4. **添加 Token 过期处理**：
   - 在全局请求拦截器中检测 401 错误
   - 自动跳转到登录页面

---

## 14. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-11-24 | 初始版本，定义完整的 API 接口 |

---

## 15. 联系方式与支持

如有疑问或需要技术支持，请联系：

- **项目文档**：README.md
- **前端仓库**：d:/dev/frontend/react-course/chatbot

---

**文档结束**
