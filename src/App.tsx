import './App.css'
import { ChatInput } from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoginPage } from './components/LoginPage';
import { useChatSessions } from './hooks/useChatSessions';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './components/theme-provider';
import { Header } from './components/Header';
import { useTranslation } from 'react-i18next';

export function App() {
  const { t } = useTranslation();

  // 先获取用户信息
  const { user, isLoading: authLoading, register, login, logout } = useAuth();

  // 使用自定义 Hooks 管理状态，传递 user 参数以监听用户变化
  const {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages
  } = useChatSessions(user);

  // 等待认证检查完成
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />;
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
              currentChatId={currentChatId}
              chatMessages={currentMessages}
              setChatMessages={setChatMessages}
            />

          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>

  );
}
