/**
 * ChatInput.tsx
 *
 * 职责（重构后）：
 *  - 仅负责 UI 展示：输入框、图片上传按钮、模式选择器、发送/取消按钮
 *  - 所有流式发送逻辑已提取至 useChatStream Hook，本组件只做简单的事件转发
 *
 * 重构前 sendMessage 函数长达 270+ 行，且直接耦合了：
 *   乐观更新、SSE 流处理、打字机缓冲队列、setChatMessages 数组拼装
 * 重构后本文件仅约 130 行，可读性和可维护性大幅提升。
 */
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"
import { api } from '@/utils/api';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X, Sparkles } from 'lucide-react';

import { useImageUpload } from '../../hooks/useImageUpload';
// 流式发送逻辑已全部下沉到 useChatStream Hook
import { useChatStream } from '../../hooks/useChatStream';

// ─────────────────────────────────────────────
// Props 类型定义
// ─────────────────────────────────────────────
interface ChatInputProps {
  editingMessage?: { id: string | number; content: string } | null;
  onCancelEdit?: () => void;
}

// ─────────────────────────────────────────────
// 组件
// ─────────────────────────────────────────────
export function ChatInput({
  editingMessage,
  onCancelEdit,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState('disabled');
  const [model, setModel] = useState('');
  const [polishing, setPolishing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 图片上传状态：提取到独立 Hook，保持本组件简洁
  const {
    imageData,
    imageMimeType,
    imagePreview,
    fileInputRef,
    handleImageSelect,
    removeImage,
    handleImageButtonClick,
  } = useImageUpload();

  // 流式发送逻辑：全部委托给 useChatStream Hook
  const { loading: Loading, sendMessage: sendStream } = useChatStream({
    editingMessage,
    onCancelEdit,
  });

  // 当 editingMessage 变化时，将原始内容填充到输入框并聚焦
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // 加载完成后自动聚焦，方便连续对话
  useEffect(() => {
    if (inputRef.current && !Loading) {
      inputRef.current.focus();
    }
  }, [Loading]);

  /** 同步更新输入框文本 */
  function saveInputText(event: ChangeEvent<HTMLTextAreaElement>) {
    setInputText(event.target.value);
  }

  /** 切换对话模式（fast / think / picture） */
  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    setMode(event.target.value);
  }

  /**
   * AI 润色：仅在 picture 模式下显示，调用后端对 prompt 进行重写优化
   */
  async function handlePolish() {
    if (!inputText.trim() || polishing || Loading) return;

    setPolishing(true);
    try {
      const polishedText = await api.polishPrompt(inputText);
      setInputText(polishedText);
    } catch (error) {
      console.error('[ChatInput] 润色失败:', error);
      // 润色失败时保持原始内容不变
    } finally {
      setPolishing(false);
    }
  }

  /**
   * 触发发送：清空输入框和图片预览，然后将参数传给 useChatStream
   */
  async function handleSend() {
    if (!inputText.trim() || Loading) return;

    const text = inputText;
    const currentImagePreview = imagePreview;

    // 先清空输入框，再触发网络请求——让 UI 立即响应
    setInputText('');
    removeImage();

    await sendStream(text, imageData, imageMimeType, currentImagePreview, mode, model);
  }

  return (
    <div className='chat-area'>
      {/* 图片预览区域：选择图片后在输入框上方展示缩略图 */}
      {imagePreview && (
        <div className="px-4 pt-2 relative inline-block">
          <div className="relative group inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-auto rounded-lg border border-zinc-200 dark:border-zinc-700 object-cover"
            />
            {/* 悬浮时显示的删除按钮 */}
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
        {/* 隐藏的文件选择器，由图片上传按钮触发 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />

        {/* 图片上传按钮 */}
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

        {/* 主输入框 */}
        <Textarea
          ref={inputRef}
          placeholder={
            Loading
              ? t('common.loading')
              : editingMessage
                ? t('chat.editingMessage')
                : t('chat.inputPlaceholder')
          }
          disabled={Loading}
          onChange={saveInputText}
          onKeyDown={(event) => {
            // Enter 发送，Shift+Enter 换行
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
            // Escape 取消编辑或清空输入
            if (event.key === 'Escape') {
              setInputText('');
              onCancelEdit?.();
            }
          }}
          value={inputText}
          className="chat-input flex-1 min-w-0 min-h-0 border-0 shadow-none focus-visible:ring-0 mr-1"
        />

        {/* 编辑模式下的取消按钮 */}
        {editingMessage && (
          <Button
            onClick={() => { setInputText(''); onCancelEdit?.(); }}
            variant="ghost"
            className="text-red-500 hover:text-red-700 shrink-0 px-2"
          >
            Cancel
          </Button>
        )}

        {/* AI 润色按钮：仅在图片模式下出现 */}
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
            <span className="hidden md:inline-block">
              {polishing ? t('chat.polishing') : t('chat.polish')}
            </span>
            <span className="inline-block md:hidden">✨</span>
          </Button>
        )}

        {/* 模式选择器 */}
        <NativeSelect onChange={handleSelectChange} className='shrink-0 w-24 md:w-max max-w-28'>
          <NativeSelectOption value='disabled' className='shrink-0'>{t('mode.fast')}</NativeSelectOption>
          <NativeSelectOption value='enabled' className='shrink-0'>{t('mode.think')}</NativeSelectOption>
          <NativeSelectOption value='picture' className='shrink-0'>{t('mode.picture')}</NativeSelectOption>
        </NativeSelect>

        {/* 模型选择器 */}
        <NativeSelect
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className='shrink-0 w-32 md:w-max max-w-40'
          title="选择 AI 模型"
        >
          <NativeSelectOption value='' className='shrink-0'>默认模型</NativeSelectOption>
          <NativeSelectOption value='doubao-seed-1-6-lite-251015' className='shrink-0'>豆包 Lite</NativeSelectOption>
          <NativeSelectOption value='doubao-seed-2-0-pro-260215' className='shrink-0'>豆包 Pro</NativeSelectOption>
          <NativeSelectOption value='doubao-seed-1-8-251228' className='shrink-0'>豆包 1.8</NativeSelectOption>
        </NativeSelect>

        {/* 发送按钮 */}
        <Button
          disabled={Loading}
          onClick={handleSend}
          className="send-button shrink-0 px-3 md:px-4"
        >
          {editingMessage ? t('chat.resend') : t('chat.send')}
        </Button>
      </div>
    </div>
  );
}
