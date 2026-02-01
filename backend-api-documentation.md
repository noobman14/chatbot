# 📚 聊天机器人后端 API 文档

> **Base URL**: `http://localhost:8080/api/v1`  
> **认证方式**: Bearer Token (JWT)

---

## 📋 目录

- [统一响应格式](#统一响应格式)
- [认证接口 (Auth)](#认证接口-auth)
- [用户接口 (User)](#用户接口-user)
- [聊天会话接口 (Chat Sessions)](#聊天会话接口-chat-sessions)
- [消息接口 (Messages)](#消息接口-messages)
- [图片接口 (Images)](#图片接口-images)
- [AI 工具接口 (AI Tools)](#ai-工具接口-ai-tools)
- [管理员接口 (Admin)](#管理员接口-admin)
- [统计接口 (Statistics)](#统计接口-statistics)

---

## 统一响应格式

所有接口统一返回以下 JSON 格式：

```json
{
  "code": 200,
  "message": "成功",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | Integer | 业务状态码（200=成功，其他为错误） |
| `message` | String | 响应消息 |
| `data` | Object | 响应数据（可为 null） |

---

## 认证接口 (Auth)

### 1. 用户注册
`POST /auth/register`

**请求体：**
```json
{
  "name": "用户名",
  "email": "user@example.com",
  "password": "password123"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | String | ✅ | 用户姓名（1-50 字符） |
| `email` | String | ✅ | 邮箱地址 |
| `password` | String | ✅ | 密码（至少 6 位） |

**响应示例：**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": { ... }
  }
}
```

---

### 2. 用户登录
`POST /auth/login`

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应示例（未启用 2FA）：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": { ... }
  }
}
```

**响应示例（启用 2FA）：**
```json
{
  "code": 200,
  "message": "请输入验证码完成登录",
  "data": {
    "requires_2fa": true,
    "email": "user@example.com"
  }
}
```

---

### 3. 验证二次认证码
`POST /auth/verify-2fa`

**请求体：**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**响应：** 返回 token 和用户信息

---

### 4. 重新发送验证码
`POST /auth/resend-code`

**请求体：**
```json
{
  "email": "user@example.com"
}
```

---

### 5. 用户登出
`POST /auth/logout`

**请求头：**
```
Authorization: Bearer <token>
```

**响应：** 登出成功

---

### 6. 验证 Token
`GET /auth/verify` 🔐

**响应示例：**
```json
{
  "code": 200,
  "message": "Token 有效",
  "data": {
    "user": { ... }
  }
}
```

---

## 用户接口 (User)

> 🔐 所有接口需要 Bearer Token

### 1. 获取用户信息
`GET /user/profile`

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "user": {
      "id": "uuid",
      "name": "用户名",
      "email": "user@example.com",
      "avatar": "https://...",
      "createdAt": "2024-01-01T00:00:00"
    }
  }
}
```

---

### 2. 更新用户信息
`PATCH /user/profile`

**请求体：**
```json
{
  "name": "新用户名",
  "avatar": "https://new-avatar-url.com"
}
```

---

### 3. 修改密码
`POST /user/change-password`

**请求体：**
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

---

## 聊天会话接口 (Chat Sessions)

> 🔐 所有接口需要 Bearer Token

### 1. 获取所有会话
`GET /chat/sessions`

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `pageSize` | int | 20 | 每页数量 |

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "sessions": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 2. 创建新会话
`POST /chat/sessions`

**请求体（可选）：**
```json
{
  "title": "会话标题"
}
```

---

### 3. 获取指定会话
`GET /chat/sessions/{sessionId}`

---

### 4. 更新会话标题
`PATCH /chat/sessions/{sessionId}`

**请求体：**
```json
{
  "title": "新标题"
}
```

---

### 5. 删除会话
`DELETE /chat/sessions/{sessionId}`

---

## 消息接口 (Messages)

> 🔐 所有接口需要 Bearer Token

### 1. 发送消息
`POST /chat/sessions/{sessionId}/messages`

**请求体：**
```json
{
  "content": "消息内容",
  "mode": "disabled",
  "imageData": "base64编码图片（可选）",
  "imageMimeType": "image/jpeg（可选）",
  "messageId": "重新生成时的消息ID（可选）"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | String | ✅ | 消息内容 |
| `mode` | String | ✅ | AI 模式：`disabled`（快速）/ `enabled`（思考）/ `picture`（生图） |
| `imageData` | String | ❌ | Base64 编码图片（不含 data: 前缀） |
| `imageMimeType` | String | ❌ | 图片 MIME 类型（如 image/jpeg） |
| `messageId` | String | ❌ | 重新生成时指定的消息 ID |

---

### 2. 流式发送消息 (SSE)
`POST /chat/sessions/{sessionId}/messages/stream`

**Content-Type**: `text/event-stream`

**请求体：** 同上

**SSE 事件格式：**
```
data: {"type":"text","text":"AI回复内容..."}

data: {"type":"reasoning","text":"思考过程..."}

event: done
data: [DONE]
```

---

### 3. 获取会话消息
`GET /chat/sessions/{sessionId}/messages`

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `pageSize` | int | 50 | 每页数量 |

---

### 4. 修改消息
`PUT /chat/sessions/{sessionId}/messages/{messageId}`

**请求体：**
```json
{
  "content": "修改后的内容"
}
```

---

### 5. 删除消息
`DELETE /chat/sessions/{sessionId}/messages/{messageId}`

---

### 6. 删除消息及之后的所有消息
`DELETE /chat/sessions/{sessionId}/messages/{messageId}/after`

---

## 图片接口 (Images)

> 🔐 需要 Bearer Token

### 1. 获取用户历史图片
`GET /images`

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | int | ❌ | 限制返回数量 |

---

## AI 工具接口 (AI Tools)

> 🔐 需要 Bearer Token

### 1. 润色文本
`POST /ai/polish`

**请求体：**
```json
{
  "text": "需要润色的文本"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "润色成功",
  "data": {
    "polishedText": "润色后的文本"
  }
}
```

---

## 管理员接口 (Admin)

### 1. 管理员登录
`POST /admin/login`

**请求体：**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

---

### 2. 获取用户列表
`GET /admin/users` 🔐

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码 |
| `pageSize` | int | 20 | 每页数量 |
| `keyword` | String | - | 搜索关键词（可选） |

---

### 3. 封禁用户
`POST /admin/users/{userId}/ban` 🔐

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `days` | int | 0 | 封禁天数（0 = 永久） |

---

### 4. 解封用户
`POST /admin/users/{userId}/unban` 🔐

---

### 5. 删除用户
`DELETE /admin/users/{userId}` 🔐

---

### 6. 批量封禁用户
`POST /admin/users/batch-ban` 🔐

**请求体：**
```json
["userId1", "userId2", "userId3"]
```

---

### 7. 批量解封用户
`POST /admin/users/batch-unban` 🔐

**请求体：** 同上

---

### 8. 批量删除用户
`POST /admin/users/batch-delete` 🔐

**请求体：** 同上

---

### 9. 获取操作日志
`GET /admin/logs/operations` 🔐

**查询参数：**
| 参数 | 类型 | 默认值 |
|------|------|--------|
| `page` | int | 1 |
| `pageSize` | int | 20 |

---

### 10. 获取登录日志
`GET /admin/logs/logins` 🔐

**查询参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | - |
| `pageSize` | int | 20 | - |
| `userId` | String | - | 按用户筛选（可选） |

---

### 11. 获取用户登录历史
`GET /admin/users/{userId}/login-history` 🔐

---

### 12. 删除用户消息（管理员）
`DELETE /admin/messages/{messageId}` 🔐

---

## 统计接口 (Statistics)

> 🔐 需要管理员权限

### 1. 获取总览统计
`GET /admin/statistics/overview`

**响应示例：**
```json
{
  "code": 200,
  "data": {
    "totalUsers": 1000,
    "totalMessages": 50000,
    "totalSessions": 3000,
    "todayActiveUsers": 50
  }
}
```

---

### 2. 获取用户增长趋势
`GET /admin/statistics/user-growth`

---

### 3. 获取消息趋势
`GET /admin/statistics/message-trend`

---

### 4. 获取活跃用户排行
`GET /admin/statistics/active-ranking`

**查询参数：**
| 参数 | 类型 | 默认值 |
|------|------|--------|
| `limit` | int | 10 |

---

### 5. 获取 24 小时活动分布
`GET /admin/statistics/hourly-activity`

---

### 6. 获取用户详细统计
`GET /admin/users/{userId}/detail`

---

## 业务状态码说明

### 状态码总览

| 状态码 | 类型 | 说明 |
|--------|------|------|
| `200` | ✅ 成功 | 请求成功 |
| `400` | ❌ 客户端错误 | 请求参数错误 |
| `401` | ❌ 认证错误 | 未认证或认证失败 |
| `403` | ❌ 权限错误 | 权限不足 |
| `404` | ❌ 资源错误 | 资源不存在 |
| `500` | ❌ 服务器错误 | 服务器内部错误 |

---

### 详细说明

#### 200 - 成功
请求已成功处理。

**响应示例：**
```json
{
  "code": 200,
  "message": "成功",
  "data": { ... }
}
```

---

#### 400 - 请求参数错误
请求参数不符合要求，可能的原因：

| 触发场景 | 错误消息示例 |
|----------|-------------|
| 邮箱已被注册 | `该邮箱已被注册` |
| 字段验证失败 | `姓名不能为空`、`邮箱格式不正确`、`密码长度至少为 6 位` |
| 参数类型错误 | `参数验证失败` |
| 非法参数 | 具体错误信息 |

**响应示例：**
```json
{
  "code": 400,
  "message": "该邮箱已被注册",
  "data": null
}
```

**前端处理建议：** 显示 `message` 内容给用户，引导用户修正输入。

---

#### 401 - 未认证 / 认证失败
用户未登录或认证信息无效，可能的原因：

| 触发场景 | 错误消息示例 |
|----------|-------------|
| 邮箱或密码错误 | `邮箱或密码错误` |
| Token 无效或过期 | `认证失败` |
| 未携带 Token | `认证失败` |
| 二次认证码错误 | `验证码错误或已过期` |
| 账号被封禁 | `账号已被封禁` |

**响应示例：**
```json
{
  "code": 401,
  "message": "邮箱或密码错误",
  "data": null
}
```

**前端处理建议：**
- 密码错误：提示用户检查邮箱和密码
- Token 失效：清除本地 Token，跳转到登录页
- 账号封禁：显示封禁提示，禁止登录

---

#### 403 - 权限不足
用户已认证，但没有权限执行该操作，可能的原因：

| 触发场景 | 错误消息示例 |
|----------|-------------|
| 访问他人会话 | `无权访问该会话` |
| 访问他人消息 | `无权访问该消息` |
| 非管理员访问管理接口 | `权限不足` |

**响应示例：**
```json
{
  "code": 403,
  "message": "无权访问该会话",
  "data": null
}
```

**前端处理建议：** 显示权限不足提示，不跳转登录页。

---

#### 404 - 资源不存在
请求的资源不存在，可能的原因：

| 触发场景 | 错误消息示例 |
|----------|-------------|
| 用户不存在 | `用户不存在` |
| 会话不存在 | `会话不存在` |
| 消息不存在 | `消息不存在` |

**响应示例：**
```json
{
  "code": 404,
  "message": "会话不存在",
  "data": null
}
```

**前端处理建议：** 显示提示信息，考虑跳转到列表页或首页。

---

#### 500 - 服务器内部错误
服务器发生未知错误，可能的原因：

| 触发场景 | 错误消息示例 |
|----------|-------------|
| AI 服务调用失败 | `AI 服务暂时不可用`、`图片生成失败` |
| 数据库异常 | `服务器内部错误` |
| 未知异常 | `服务器内部错误` |

**响应示例：**
```json
{
  "code": 500,
  "message": "AI 服务暂时不可用",
  "data": null
}
```

**前端处理建议：** 显示友好的错误提示，建议用户稍后重试。

---

### 错误处理最佳实践

```javascript
// 示例：统一错误处理
async function handleApiResponse(response) {
  const data = await response.json();
  
  switch (data.code) {
    case 200:
      return data.data;
    case 400:
      // 参数错误，显示具体错误信息
      throw new Error(data.message);
    case 401:
      // 认证失败，清除 Token 并跳转登录
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error(data.message);
    case 403:
      // 权限不足
      throw new Error('您没有权限执行此操作');
    case 404:
      // 资源不存在
      throw new Error(data.message);
    case 500:
      // 服务器错误
      throw new Error('服务器繁忙，请稍后重试');
    default:
      throw new Error('未知错误');
  }
}
```

---

> 📝 **最后更新**: 2026-02-01
