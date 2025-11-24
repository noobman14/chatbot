//import { Chatbot } from 'supersimpledev';
import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import './ChatInput.css';
import { GetAiRespond } from './AiRespond';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect, NativeSelectOption, } from "@/components/ui/native-select"

export function ChatInput({ chatMessages, setChatMessages }: any) {
  const [inputText, setInputText] = useState('');
  const [Loading, setLoading] = useState(false); // 加载状态，用于禁用输入框和按钮
  const [mode, setMode] = useState('disabled');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // 发送消息的核心逻辑
  async function sendMessage() {
    // 如果输入为空或正在加载中，则不发送
    if (inputText === '' || Loading) {
      return;
    }
    setLoading(true);

    const text = inputText;

    // 清空输入框
    setInputText('');

    // 乐观更新：立即在界面上显示用户的消息和"Loading..."占位符
    const loadingMessages = [
      ...chatMessages,
      {
        message: {
          content: text
        },
        sender: 'user',
        id: crypto.randomUUID(),
        time: Date.now(),
      },
      {
        message: {
          content:
            'Loading...'
        },
        sender: 'robot',
        id: crypto.randomUUID(),
      }
    ];

    setChatMessages(loadingMessages);

    // 准备发送给 AI 的消息历史（去掉最后的 Loading 占位符）
    const msg = loadingMessages.slice(0, -1);
    const myMsg = msg.map((msg: any) => {
      return {
        role: msg.sender === 'robot' ? 'assistant' : msg.sender,
        content: msg.message.content,
      }
    })

    // 调用 AI 接口获取响应
    const rawResponse = await GetAiRespond(myMsg, mode);
    const response = rawResponse;

    // 如果获取到响应，更新消息列表，用真实响应替换 Loading 占位符
    if (response) {
      setChatMessages([
        ...chatMessages,
        {
          message: {
            content: text
          },
          sender: 'user',
          id: crypto.randomUUID(),
          time: Date.now(),
        },
        {
          message: response,
          sender: 'robot',
          id: crypto.randomUUID(),
          time: Date.now(),
        }
      ]);
    }
    setLoading(false);
  }
  return (
    <div className='chat-area'>
      <div className="chat-input-container">
        <Textarea
          ref={inputRef}
          placeholder={Loading ? "Loading..." : "Send a message to Chatbot"}
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
            }
          }}
          value={inputText}
          className="chat-input min-h-0 border-0 shadow-none focus-visible:ring-0"
        />
        <NativeSelect onChange={handleSelectChange}>
          <NativeSelectOption value='disabled'>Fast</NativeSelectOption>
          <NativeSelectOption value='enabled'>Think</NativeSelectOption>
        </NativeSelect>
        <Button
          disabled={Loading}
          onClick={sendMessage}
          className="send-button ml-3"
        >Send</Button>
      </div ></div>

  );
}
