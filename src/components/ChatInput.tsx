//import { Chatbot } from 'supersimpledev';
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"
import { api } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { useNotification } from '@/hooks/useNotification';
import { ImagePlus, X } from 'lucide-react';

export function ChatInput({ currentChatId, setChatMessages }: any) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [Loading, setLoading] = useState(false); // 加载状态，用于禁用输入框和按钮
  const [mode, setMode] = useState('disabled');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 图片上传状态
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 通知功能
  const { sendNotification } = useNotification();

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

  // 压缩图片到指定大小（KB）
  async function compressImage(file: File, maxSizeKB: number = 50): Promise<{ base64: string; mimeType: string; preview: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 多模态模型对图片有token限制，需要较小的尺寸
          const maxDimension = 512; // 限制最大尺寸
          let { width, height } = img;

          // 缩小尺寸
          if (width > maxDimension || height > maxDimension) {
            const scale = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建Canvas上下文'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // 压缩质量循环
          const maxSize = maxSizeKB * 1024;
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          let sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;

          // 循环压缩直到满足大小要求
          while (sizeInBytes > maxSize && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;
          }

          // 如果质量压缩还不够，进一步缩小尺寸
          let currentWidth = width;
          let currentHeight = height;
          while (sizeInBytes > maxSize && currentWidth > 100) {
            currentWidth = Math.round(currentWidth * 0.7);
            currentHeight = Math.round(currentHeight * 0.7);
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            sizeInBytes = (dataUrl.split(',')[1].length * 3) / 4;
          }

          const [prefix, base64Data] = dataUrl.split(',');
          const mimeMatch = prefix.match(/data:(.*);base64/);
          if (mimeMatch && base64Data) {
            console.log(`图片压缩完成: ${Math.round(sizeInBytes / 1024)}KB, 尺寸: ${currentWidth}x${currentHeight}`);
            resolve({
              base64: base64Data,
              mimeType: mimeMatch[1],
              preview: dataUrl
            });
          } else {
            reject(new Error('无法解析压缩后的图片'));
          }
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  // 处理图片选择
  async function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件大小（限制10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert(t('chat.imageTooLarge'));
      return;
    }

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert(t('chat.invalidImageType'));
      return;
    }

    try {
      // 如果图片大于500KB，进行压缩
      if (file.size > 500 * 1024) {
        const compressed = await compressImage(file, 500);
        setImageData(compressed.base64);
        setImageMimeType(compressed.mimeType);
        setImagePreview(compressed.preview);
      } else {
        // 小于500KB，直接使用
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const [prefix, base64Data] = result.split(',');
          const mimeMatch = prefix.match(/data:(.*);base64/);
          if (mimeMatch && base64Data) {
            setImageData(base64Data);
            setImageMimeType(mimeMatch[1]);
            setImagePreview(result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('图片处理失败:', error);
      alert(t('chat.imageProcessError'));
    }

    // 重置input以便可以再次选择同一文件
    event.target.value = '';
  }

  // 移除已选择的图片
  function removeImage() {
    setImageData(null);
    setImageMimeType(null);
    setImagePreview(null);
  }

  // 点击图片上传按钮
  function handleImageButtonClick() {
    fileInputRef.current?.click();
  }

  // 发送消息的核心逻辑
  async function sendMessage() {
    // 如果没有当前会话、输入为空(且没有图片)或正在加载中，则不发送
    if (!currentChatId || (inputText === '' && !imageData) || Loading) {
      return;
    }
    setLoading(true);

    const text = inputText;
    const currentImageData = imageData;
    const currentImageMimeType = imageMimeType;
    const currentImagePreview = imagePreview;

    // 清空输入框和图片
    setInputText('');
    removeImage();

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
      imageUrl: currentImagePreview, // 添加图片预览
    };

    const aiMsgPlaceholder = {
      message: {
        content: t('common.loading'), // 初始显示 Loading
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
          imageData: currentImageData || undefined,
          imageMimeType: currentImageMimeType || undefined
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
        // 聊天模式：使用流式接口
        let firstChunk = true;

        for await (const chunk of api.streamMessage(currentChatId, {
          content: text,
          mode: mode,
          imageData: currentImageData || undefined,
          imageMimeType: currentImageMimeType || undefined
        })) {
          if (firstChunk) {
            // 收到第一个 chunk 时，清除 "Loading..."
            currentAiContent = "";
            firstChunk = false;
          }

          if (chunk.type === 'thinking') {
            currentReasoning += chunk.text;
          } else if (chunk.type === 'content') {
            currentAiContent += chunk.text;
          } else if (chunk.type === 'error') {
            // 收到服务端错误
            currentAiContent = chunk.text;
          }

          // 实时更新 AI 消息内容
          setChatMessages((prev: any[]) => {
            const newMessages = [...prev];
            const aiMsgIndex = newMessages.findIndex(msg => msg.id === newAiMsgId);
            if (aiMsgIndex !== -1) {
              newMessages[aiMsgIndex] = {
                ...newMessages[aiMsgIndex],
                message: {
                  content: currentAiContent, // 如果还在思考，content 为空字符串(非Loading)
                  reasoning_content: currentReasoning
                }
              };
            }
            return newMessages;
          });
        }
      }

      // AI 回复完成，发送通知
      sendNotification(t('notification.newMessage'), t('notification.aiReplied'));

    } catch (error) {
      console.error('Failed to send message:', error);
      // 发生错误时，更新消息显示错误
      // 如果已经接收到内容，说明流式传输成功，不显示错误（可能只是浏览器的 chunked encoding 误报）
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
                content: t('chat.error'),
                reasoning_content: ''
              }
            };
          }
        }
        return newMessages;
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className='chat-area'>
      {/* 图片预览区域 */}
      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button
            className="remove-image-btn"
            onClick={removeImage}
            title={t('chat.removeImage')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="chat-input-container">
        {/* 隐藏的文件输入框 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        {/* 图片上传按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleImageButtonClick}
          disabled={Loading}
          className="image-upload-btn shrink-0"
          title={t('chat.uploadImage')}
        >
          <ImagePlus size={20} />
        </Button>
        <Textarea
          ref={inputRef}
          placeholder={Loading ? t('common.loading') : t('chat.inputPlaceholder')}
          disabled={Loading}
          onChange={saveInputText}
          onKeyDown={(event) => {
            // 按下 Enter 键发送消息，Shift+Enter 换行
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
            // 按下 Escape 键清空输入框
            if (event.key === 'Escape') {
              setInputText('');
              removeImage();
            }
          }}
          value={inputText}
          className="chat-input min-h-0 border-0 shadow-none focus-visible:ring-0"
        />
        <NativeSelect onChange={handleSelectChange} className='shrink-0 w-max'>
          <NativeSelectOption value='disabled' className='shrink-0'>{t('chat.modeFast')}</NativeSelectOption>
          <NativeSelectOption value='enabled' className='shrink-0'>{t('chat.modeThink')}</NativeSelectOption>
          <NativeSelectOption value='picture' className='shrink-0'>{t('chat.modePicture')}</NativeSelectOption>
        </NativeSelect>
        <Button
          disabled={Loading}
          onClick={sendMessage}
          className="send-button ml-3"
        >{t('chat.send')}</Button>
      </div ></div>

  );
}
