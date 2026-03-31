//import { Chatbot } from 'supersimpledev';
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"
import { api } from '@/utils/api';
import { useTranslation } from 'react-i18next';

import { ImagePlus, X, Sparkles } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';

interface ChatInputProps {
  currentChatId: string | null;
  chatMessages?: any[];
  setChatMessages: (fn: (prev: any[]) => any[]) => void;
  editingMessage?: { id: string | number; content: string } | null;
  onCancelEdit?: () => void;
  refreshMessages?: () => Promise<void>;
}

export function ChatInput({ currentChatId, setChatMessages, editingMessage, onCancelEdit, refreshMessages }: ChatInputProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');

  // Image upload state extracted to custom hook
  const {
    imageData,
    imageMimeType,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    removeImage,
    handleImageButtonClick
  } = useImageUpload();

  const [Loading, setLoading] = useState(false); // 加载状态，用于禁用输入框和按钮
  const [mode, setMode] = useState('disabled');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 当 editingMessage 变化时，填充输入框
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // 润色状态
  const [polishing, setPolishing] = useState(false);

  // 当加载状态结束时，自动聚焦到输入框
  useEffect(() => {
    const inputEl = inputRef.current;
    if (inputEl && !Loading) {
      inputEl.focus();
    }
  }, [Loading])

  // 保存输入框的文本内容
  function saveInputText(event: ChangeEvent<HTMLTextAreaElement>) {
    setInputText(event.target.value);
  }



  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    setMode(event.target.value);
  }

  // AI 润色 prompt
  async function handlePolish() {
    if (!inputText.trim() || polishing || Loading) {
      return;
    }

    setPolishing(true);
    const originalText = inputText;

    try {
      // 调用润色API，直接获取结果
      const polishedText = await api.polishPrompt(originalText);
      setInputText(polishedText);
    } catch (error) {
      console.error('润色失败:', error);
      // 润色失败时保持原始内容不变
    } finally {
      setPolishing(false);
    }
  }
  // 发送消息的核心逻辑
  async function sendMessage() {
    // 如果没有当前会话、输入为空或正在加载中，则不发送
    if (!currentChatId || inputText === '' || Loading) {
      return;
    }
    setLoading(true);

    const text = inputText;
    // 保存图片预览，在清空前获取
    const currentImagePreview = imagePreview;

    // 清空输入框
    setInputText('');
    removeImage();

    // 如果是编辑模式，先删除该消息及之后的所有消息
    if (editingMessage) {
      try {
        // 调用后端 API 删除该消息及之后的所有消息
        await api.deleteMessagesAfter(currentChatId, editingMessage.id.toString());

        // 更新本地状态：删除该消息及之后的所有消息
        setChatMessages((prev: any[]) => {
          const index = prev.findIndex(m => m.id === editingMessage.id);
          if (index !== -1) {
            return prev.slice(0, index);
          }
          return prev;
        });

        // 清除编辑状态
        onCancelEdit?.();
      } catch (error) {
        console.error('Failed to delete messages:', error);
        setLoading(false);
        return;
      }
    }

    const newMsgId = crypto.randomUUID();
    const newAiMsgId = crypto.randomUUID();

    // 乐观更新：立即在界面上显示用户的消息和"Loading..."占位符
    const userMsg = {
      message: {
        content: text,
        reasoning_content: ''
      },
      sender: 'user',
      id: newMsgId,
      time: Date.now(),
      imageUrl: currentImagePreview || undefined, // 包含图片预览
    };

    const aiMsgPlaceholder = {
      message: {
        content: 'Loading...', // 初始显示 Loading
        reasoning_content: ''
      },
      sender: 'robot',
      id: newAiMsgId,
      time: Date.now(),
    };

    // 使用函数式更新确保基于最新状态
    setChatMessages((prevV: any[]) => [
      ...prevV,
      userMsg,
      aiMsgPlaceholder
    ]);

    // 在 try-catch 外部声明，以便在 catch 块中也能访问
    let currentAiContent = "";
    let currentReasoning = "";

    try {
      // 图片生成模式：使用非流式接口
      if (mode === 'picture') {
        const result = await api.sendMessage(currentChatId, {
          content: text,
          mode: mode,
          image_data: imageData || undefined,
          image_mime_type: imageMimeType || undefined
        });

        currentAiContent = result.aiMessage.message.content;
        currentReasoning = result.aiMessage.message.reasoning_content || '';

        // 更新 AI 消息内容
        setChatMessages((prev: any[]) => {
          const newMessages = [...prev];
          const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
          if (aiMsgIndex !== -1) {
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: currentAiContent,
                reasoning_content: currentReasoning
              }
            };
          }
          return newMessages;
        });
      } else {
        // =========================================================================
        // 【流式输出渲染优化：打字机匀速特效核心机制】
        // 传统的流式接收：后端返回什么速度、返回多少内容，前端就直接全量贴到面上。这会导致
        // 网络快时出现大段文字瞬间“闪现”，网络抖动时又突然卡住，体验非常机械生硬。
        //
        // 优化方案：引入“消费队列”分离网络接收与UI渲染
        // - 生产者（for await 循环）：负责以极度贪婪的模式快速把网络的字符“卸货”放入本地队列中，不再直接触碰界面渲染。
        // - 消费者（outputInterval 定时器）：维持约 60 帧 (15ms) 的刷新频率，如抽丝剥茧般从队列头缓慢剥取字符更新 UI。
        // =========================================================================

        let firstChunk = true;
        
        let streamingDone = false;                  // 标识服务器网络传输是否已经彻底结束
        let contentQueue: string[] = [];            // 主气泡正式答案字符排队缓冲队列
        let reasoningQueue: string[] = [];          // 深度思考折叠部分字符排队缓冲队列

        // [消费者]：匀速输出定时器，类似游戏引擎渲染的主循环
        const outputInterval = setInterval(() => {
          // 若网络传输已完毕且所有缓存字符均渲染耗尽，则自动下线该匀速定时器
          if (contentQueue.length === 0 && reasoningQueue.length === 0 && streamingDone) {
            clearInterval(outputInterval);
            return;
          }

          let updated = false;

          // 永远优先播放思考过程 (如果有缓存)，思考队列播放完毕后再接着播放正式回答
          if (reasoningQueue.length > 0) {
            // 【自适应弹性阻尼打字算法】
            // 如果仅采用纯单字输出 (即恒定 ~66字/秒)，当遭遇千字以上的模型爆发返回时会导致队列被撑爆，显示严重滞后。
            // 使用 Math.max(1, Math.floor(堆积长度 / 30)) 可以在排队过于拥挤时平滑提升字数动态提取量，
            // 做到 "短句柔和细腻打字，长篇大论不卡顿始终紧跟进度" 的沉浸式体验。
            const numChars = Math.max(1, Math.floor(reasoningQueue.length / 30));
            currentReasoning += reasoningQueue.splice(0, numChars).join('');
            updated = true;
          } else if (contentQueue.length > 0) {
            const numChars = Math.max(1, Math.floor(contentQueue.length / 30));
            currentAiContent += contentQueue.splice(0, numChars).join('');
            updated = true;
          }

          // 如果本次时钟周期成功提取了新字符，则立即在 UI 回调中呈现
          if (updated) {
            setChatMessages((prev: any[]) => {
              const newMessages = [...prev];
              const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
              if (aiMsgIndex !== -1) {
                newMessages[aiMsgIndex] = {
                  ...newMessages[aiMsgIndex],
                  message: {
                    content: currentAiContent, // 还在处于“深度思考”打字ing阶段时，content依然是空串，占位符已消除
                    reasoning_content: currentReasoning
                  }
                };
              }
              return newMessages;
            });
          }
        }, 15); // 每 15 毫秒高频刷新一帧

        try {
          // [生产者]：极速从后端拉取 SSE 流响应，并果断按字符解构成小颗粒推进队列缓冲池
          for await (const chunk of api.streamMessage(currentChatId, {
            content: text,
            mode: mode,
            image_data: imageData || undefined,
            image_mime_type: imageMimeType || undefined
          })) {
            if (firstChunk) {
              // 收到第一个真实有效的数据流包时，正式移除初始化预设的 "Loading..." 兜底提示
              currentAiContent = "";
              firstChunk = false;
            }

            // 强转为 string 防止 undefined 或者 fetch JSON 解析产生 any 对象引发后续 Array.from 异常
            const chunkText = (chunk.text as string) || '';

            if (chunk.type === 'thinking') {
              // 通过 .push(...Array.from(...)) 特性注入单字符流：
              // 这个原生特性能完美防范将复杂 Emoji 表情或变宽生僻字给错误按基础字符截断（JS特殊字符长占2个位点的问题）
              reasoningQueue.push(...Array.from(chunkText));
            } else if (chunk.type === 'content') {
              contentQueue.push(...Array.from(chunkText));
            } else if (chunk.type === 'error') {
              // 收到服务端下发的标准错误解释，也照常送入主队列展示
              contentQueue.push(...Array.from(chunkText));
            }
          }
          
          streamingDone = true; // 告知下游外部定时器：网络任务已圆满清盘
          
          // 【守护锁屏屏障】：哪怕 fetch 流结束，也必须死锁保护在这，等待上述缓存队列中最后一点残余字符被定时器悉数敲打完毕
          // 只有两路完全合并打完，才肯正式让这整个 try-catch 块进入 finally（放开 setLoading 状态机按钮）
          await new Promise<void>(resolve => {
            const checkDone = setInterval(() => {
              if (contentQueue.length === 0 && reasoningQueue.length === 0) {
                clearInterval(checkDone);
                resolve();
              }
            }, 50);
          });
        } catch (streamError) {
          streamingDone = true;
          clearInterval(outputInterval); // 网络发生严重致命意外脱轨，立即掐断虚假的匀速输出定时器
          
          // 残留补偿动作：不要浪费网络幸苦下载但堵在排队里没来得及展示的内容包
          // 直接化零为整全量暴力注入给内容变量，保证外层 catch 错误拦截组件能够渲染出这些断裂前的遗物信息
          if (reasoningQueue.length > 0) {
            currentReasoning += reasoningQueue.join('');
            reasoningQueue = [];
          }
          if (contentQueue.length > 0) {
            currentAiContent += contentQueue.join('');
            contentQueue = [];
          }
          
          throw streamError; // 再次向外抛出该错误，确保最外层的错误占位逻辑块正常执行显示
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      // 发生错误时，更新消息显示错误
      // 如果已经接收到内容，说明流式传输成功，不显示错误
      // 只有在完全没有收到内容时才显示错误
      setChatMessages((prev: any[]) => {
        const newMessages = [...prev];
        const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
        if (aiMsgIndex !== -1) {
          const hasContent = currentAiContent.length > 0;
          const hasReasoning = currentReasoning.length > 0;

          // 如果已经接收到内容或推理过程，说明传输成功，只是浏览器报错
          if (hasContent || hasReasoning) {
            // 保留已接收的内容，不显示错误警告
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: currentAiContent,
                reasoning_content: currentReasoning
              }
            };
          } else {
            // 完全没有收到内容，显示真正的错误
            newMessages[aiMsgIndex] = {
              ...newMessages[aiMsgIndex],
              message: {
                content: 'Sorry, I encountered an error while processing your request.',
                reasoning_content: ''
              }
            };
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
      // 刷新消息列表，确保本地 ID 与服务器同步
      // 延迟一小段时间，确保服务器完成保存
      if (refreshMessages) {
        setTimeout(() => {
          refreshMessages().catch(err => console.error('Failed to refresh messages:', err));
        }, 500);
      }
    }
  }
  return (
    <div className='chat-area'>
      {imagePreview && (
        <div className="px-4 pt-2 relative inline-block">
          <div className="relative group inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
              title={t('chat.removeImage')}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      <div className="chat-input-container flex-nowrap overflow-x-hidden gap-1 md:gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />

        {/* 图片上传按钮 - 在所有模式下都显示（支持多模态对话） */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleImageButtonClick}
          disabled={Loading}
          className="shrink-0 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          title={t('chat.uploadImage')}
        >
          <ImagePlus size={20} />
        </Button>

        <Textarea
          ref={inputRef}
          placeholder={Loading ? t('common.loading') : (editingMessage ? t("chat.editingMessage") : t("chat.inputPlaceholder"))}
          disabled={Loading}
          onChange={saveInputText}
          onKeyDown={(event) => {
            // 按下 Enter 键发送消息，Shift+Enter 换行
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
            // 按下 Escape 键取消编辑或清空输入框
            if (event.key === 'Escape') {
              if (editingMessage) {
                setInputText('');
                onCancelEdit?.();
              } else {
                setInputText('');
              }
            }
          }}
          value={inputText}
          className="chat-input flex-1 min-w-0 min-h-0 border-0 shadow-none focus-visible:ring-0 mr-1"
        />
        {editingMessage && (
          <Button
            onClick={() => { setInputText(''); onCancelEdit?.(); }}
            variant="ghost"
            className="text-red-500 hover:text-red-700 shrink-0 px-2"
          >Cancel</Button>
        )}

        {/* AI 润色按钮 - 只在图片模式下显示 */}
        {mode === 'picture' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePolish}
            disabled={Loading || polishing || !inputText.trim()}
            className="polish-btn shrink-0"
            title={t('chat.polish')}
          >
            <Sparkles size={16} className="mr-1 hidden md:inline-block" />
            <span className="hidden md:inline-block">{polishing ? t('chat.polishing') : t('chat.polish')}</span>
            <span className="inline-block md:hidden">✨</span>
          </Button>
        )}
        <NativeSelect onChange={handleSelectChange} className='shrink-0 w-24 md:w-max max-w-28'>
          <NativeSelectOption value='disabled' className='shrink-0'>{t('mode.fast')}</NativeSelectOption>
          <NativeSelectOption value='enabled' className='shrink-0'>{t('mode.think')}</NativeSelectOption>
          <NativeSelectOption value='picture' className='shrink-0'>{t('mode.picture')}</NativeSelectOption>
        </NativeSelect>
        <Button
          disabled={Loading}
          onClick={sendMessage}
          className="send-button shrink-0 px-3 md:px-4"
        >{editingMessage ? t('chat.resend') : t('chat.send')}</Button>
      </div></div>

  );
}

