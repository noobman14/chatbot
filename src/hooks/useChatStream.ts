/**
 * useChatStream.ts
 *
 * 自定义 Hook：封装聊天消息的流式收发核心逻辑。
 *
 * 职责：
 *  - 构造乐观更新的用户消息与 AI 占位消息
 *  - 通过 SSE 从后端拉取流式响应（生产者）
 *  - 维护"打字机匀速特效"缓冲队列（消费者定时器）
 *  - 处理编辑模式下的消息删除与重发
 *  - 流结束后刷新消息列表（同步本地 ID 与服务器 ID）
 *
 * ChatInput 组件只需调用 sendMessage(text, imageData, imageMimeType, imagePreview)
 * 即可触发完整流程，彻底解耦业务逻辑与 UI 表现层。
 */
import { useState } from 'react';
import { api } from '@/utils/api';
import { useChatStore } from '@/store/chatStore';

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

interface ChatMessage {
  id: string | number;
  message: {
    content: string;
    reasoning_content: string;
  };
  sender: string;
  time: number;
  imageUrl?: string;
}

interface UseChatStreamOptions {
  /** 当前正在编辑的消息（可选） */
  editingMessage?: { id: string | number; content: string } | null;
  /** 取消编辑状态的回调（可选） */
  onCancelEdit?: () => void;
}

// ─────────────────────────────────────────────
// Hook 实现
// ─────────────────────────────────────────────

export function useChatStream({
  editingMessage,
  onCancelEdit,
}: UseChatStreamOptions = {}) {
  const { currentChatId, setChatMessages } = useChatStore();
  /** 是否正在请求/流式输出中（用于禁用输入框和发送按钮） */
  const [loading, setLoading] = useState(false);

  /**
   * 核心发送函数。
   *
   * @param text           用户输入的文本内容
   * @param imageData      Base64 编码的图片数据（可选）
   * @param imageMimeType  图片 MIME 类型（可选）
   * @param imagePreview   图片预览 URL，用于乐观更新展示（可选）
   * @param mode           对话模式：'disabled' | 'enabled' | 'picture'
   */
  async function sendMessage(
    text: string,
    imageData: string | null,
    imageMimeType: string | null,
    imagePreview: string | null,
    mode: string
  ) {
    // 前置校验：无会话、空输入或当前正在加载时，直接拒绝
    if (!currentChatId || !text.trim() || loading) return;

    setLoading(true);

    // ── 编辑模式：先删除该消息及其之后所有消息 ──────────────────────
    if (editingMessage) {
      try {
        await api.deleteMessagesAfter(currentChatId, editingMessage.id.toString());
        // 本地同步删除
        setChatMessages((prev: ChatMessage[]) => {
          const index = prev.findIndex((m) => m.id === editingMessage.id);
          return index !== -1 ? prev.slice(0, index) : prev;
        });
        onCancelEdit?.();
      } catch (error) {
        console.error('[useChatStream] 删除消息失败:', error);
        setLoading(false);
        return;
      }
    }

    // ── 乐观更新：立即往列表末尾追加用户消息和 AI 占位消息 ──────────
    const newMsgId = crypto.randomUUID();
    const newAiMsgId = crypto.randomUUID();

    const userMsg: ChatMessage = {
      id: newMsgId,
      sender: 'user',
      time: Date.now(),
      message: { content: text, reasoning_content: '' },
      imageUrl: imagePreview || undefined,
    };

    const aiMsgPlaceholder: ChatMessage = {
      id: newAiMsgId,
      sender: 'robot',
      time: Date.now(),
      message: { content: 'Loading...', reasoning_content: '' },
    };

    setChatMessages((prev: ChatMessage[]) => [...prev, userMsg, aiMsgPlaceholder]);

    // ── 流式核心变量 ─────────────────────────────────────────────────
    // 注意：这些变量不放在 state 中，是为了避免 setInterval 回调形成闭包
    // 捕获旧 state 值。直接使用普通变量并通过 setChatMessages 函数式更新即可。
    let currentAiContent = '';
    let currentReasoning = '';

    try {
      // ============================================================
      // 图片生成模式：使用非流式接口，直接获取完整结果
      // ============================================================
      if (mode === 'picture') {
        const result = await api.sendMessage(currentChatId, {
          content: text,
          mode,
          image_data: imageData || undefined,
          image_mime_type: imageMimeType || undefined,
        });

        currentAiContent = result.aiMessage.message.content;
        currentReasoning = result.aiMessage.message.reasoning_content || '';

        // 直接覆盖 AI 占位消息
        setChatMessages((prev: ChatMessage[]) => {
          const newMessages = [...prev];
          const idx = newMessages.findIndex((m) => m.id === newAiMsgId);
          if (idx !== -1) {
            newMessages[idx] = {
              ...newMessages[idx],
              message: { content: currentAiContent, reasoning_content: currentReasoning },
            };
          }
          return newMessages;
        });
      } else {
        // ============================================================
        // 【流式输出渲染优化：打字机匀速特效核心机制】
        //
        // 生产者（for await 循环）：贪婪地从网络"卸货"字符到本地队列
        // 消费者（outputInterval 定时器）：以 ~60fps 匀速从队列头取字符更新 UI
        //
        // 优势：网络突发时不会"闪现"大段文字；网络抖动时也不会突然卡顿
        // ============================================================

        let firstChunk = true;
        let streamingDone = false;

        // 生产者填充队列；消费者定时从队列头消费
        let contentQueue: string[] = [];
        let reasoningQueue: string[] = [];

        // ─── 消费者：以固定帧率匀速渲染 UI ─────────────────────────
        const outputInterval = setInterval(() => {
          // 队列耗尽且网络传输完毕 → 退出定时器
          if (contentQueue.length === 0 && reasoningQueue.length === 0 && streamingDone) {
            clearInterval(outputInterval);
            return;
          }

          let updated = false;

          // 永远优先播放"思考过程"，思考队列耗尽后再播放"正式回答"
          if (reasoningQueue.length > 0) {
            // 【自适应弹性阻尼算法】：队列越长每帧多吐几个字符，避免严重滞后
            const numChars = Math.max(1, Math.floor(reasoningQueue.length / 30));
            currentReasoning += reasoningQueue.splice(0, numChars).join('');
            updated = true;
          } else if (contentQueue.length > 0) {
            const numChars = Math.max(1, Math.floor(contentQueue.length / 30));
            currentAiContent += contentQueue.splice(0, numChars).join('');
            updated = true;
          }

          // 本帧有新字符 → 刷新 UI
          if (updated) {
            setChatMessages((prev: ChatMessage[]) => {
              const newMessages = [...prev];
              const idx = newMessages.findIndex((m) => m.id === newAiMsgId);
              if (idx !== -1) {
                newMessages[idx] = {
                  ...newMessages[idx],
                  message: { content: currentAiContent, reasoning_content: currentReasoning },
                };
              }
              return newMessages;
            });
          }
        }, 15); // 每 15ms 高频刷新一帧（约 66fps）

        try {
          // ─── 生产者：从后端极速拉取 SSE 流 ───────────────────────
          for await (const chunk of api.streamMessage(currentChatId, {
            content: text,
            mode,
            image_data: imageData || undefined,
            image_mime_type: imageMimeType || undefined,
          })) {
            if (firstChunk) {
              // 收到第一个真实数据包时，清除 "Loading..." 占位字符串
              currentAiContent = '';
              firstChunk = false;
            }

            // 强转为 string，防止 Array.from 处理 undefined 或 any 对象时异常
            const chunkText = (chunk.text as string) || '';

            // 通过 Array.from 切割字符，可正确处理宽字符（如 Emoji 占 2 个 code unit 的情况）
            if (chunk.type === 'thinking') {
              reasoningQueue.push(...Array.from(chunkText));
            } else if (chunk.type === 'content' || chunk.type === 'error') {
              contentQueue.push(...Array.from(chunkText));
            }
          }

          // 网络传输完毕
          streamingDone = true;

          // 【守护屏障】：等待缓冲队列中最后一批字符被消费者全部渲染完毕，
          // 才允许进入 finally 解锁加载状态
          await new Promise<void>((resolve) => {
            const checkDone = setInterval(() => {
              if (contentQueue.length === 0 && reasoningQueue.length === 0) {
                clearInterval(checkDone);
                resolve();
              }
            }, 50);
          });
        } catch (streamError) {
          // 网络异常：立即掐断定时器，将队列里未显示的内容强制倾倒
          streamingDone = true;
          clearInterval(outputInterval);

          if (reasoningQueue.length > 0) {
            currentReasoning += reasoningQueue.join('');
            reasoningQueue = [];
          }
          if (contentQueue.length > 0) {
            currentAiContent += contentQueue.join('');
            contentQueue = [];
          }

          // 向外层 catch 重新抛出，确保错误兜底逻辑正确执行
          throw streamError;
        }
      }
    } catch (error) {
      console.error('[useChatStream] 发送消息失败:', error);

      // 错误兜底：根据已接收的内容量决定显示策略
      setChatMessages((prev: ChatMessage[]) => {
        const newMessages = [...prev];
        const idx = newMessages.findIndex((m) => m.id === newAiMsgId);
        if (idx !== -1) {
          const hasContent = currentAiContent.length > 0;
          const hasReasoning = currentReasoning.length > 0;

          // 有内容说明传输基本成功，保留已收到的内容
          if (hasContent || hasReasoning) {
            newMessages[idx] = {
              ...newMessages[idx],
              message: { content: currentAiContent, reasoning_content: currentReasoning },
            };
          } else {
            // 完全没收到内容，显示错误提示
            newMessages[idx] = {
              ...newMessages[idx],
              message: {
                content: 'Sorry, I encountered an error while processing your request.',
                reasoning_content: '',
              },
            };
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);

      // 流结束后延迟刷新，确保服务器完成持久化保存后再同步 ID
      setTimeout(() => {
        const cid = useChatStore.getState().currentChatId;
        if (!cid) return;
        api.getSession(cid).then((data: any) => {
          useChatStore.getState().setSessions((prev: any[]) => prev.map((s: any) => s.id === cid ? data.session : s));
        }).catch((err: any) => {
          console.error('[useChatStream] 刷新消息列表失败:', err);
        });
      }, 500);
    }
  }

  return { loading, sendMessage };
}
