import { useEffect } from 'react'
import './App.css'
import { ChatInput } from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import { Chatbot } from 'supersimpledev';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoginPage } from './components/LoginPage';
import { useChatSessions } from './hooks/useChatSessions';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './components/theme-provider';
import { Header } from './components/Header';

export function App() {
  // 使用自定义 Hooks 管理状态
  const {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages
  } = useChatSessions();

  const { user, login, logout } = useAuth();

  // 设置 Chatbot 的预定义回复（示例用途）
  useEffect(() => {
    Chatbot.addResponses({
      "tell me your name": `Hello ,im chatbot!`
    });
  }, []);

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <ThemeProvider>
      <SidebarProvider className='h-screen'>
        <div className="flex min-h-screen w-full app-container">
          {/* 左侧侧边栏组件，传递会话列表和操作函数 */}
          <AppSidebar
            sessions={sessions}
            currentChatId={currentChatId}
            onNewChat={createNewChat}
            onSwitchChat={switchChat}
            onDeleteChat={deleteChat}
            user={user}
            onLogout={logout}
          />

          {/* 主内容区域 */}
          <main className="content-area">
            <Header />
            {/* 消息展示组件 */}
            <ChatMessages chatMessages={currentMessages} />
            {/* 输入框组件 */}
            <ChatInput
              chatMessages={currentMessages}
              setChatMessages={setChatMessages}
            />

          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>

  );
}
