import './App.css'
import { ChatInput } from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LoginPage } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { useChatSessions } from './hooks/useChatSessions';
import { useAuth } from './hooks/useAuth';
import { useAdminAuth } from './hooks/useAdminAuth';
import { ThemeProvider } from './components/theme-provider';
import { Header } from './components/Header';
import { useState, useMemo } from 'react';
import { hideMessage, hideMessages, getHiddenMessagesForSession } from './utils/hiddenMessages';
import { ImageHistory, type ImageItem } from './components/ImageHistory';
import { api } from './utils/api';

/**
 * 管理员应用
 */
function AdminApp() {
  const { admin, isLoading, login, logout } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-900">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return <AdminLoginPage onLogin={login} />;
  }

  return <AdminDashboard admin={admin} onLogout={logout} />;
}

/**
 * 用户应用
 */
function UserApp() {
  // 先获取用户信息
  const { user, isLoading: authLoading, register, login, logout, updateUser } = useAuth();

  // 使用自定义 Hooks 管理状态，传递 user 参数以监听用户变化
  const {
    sessions,
    currentChatId,
    currentMessages,
    createNewChat,
    switchChat,
    deleteChat,
    setChatMessages,
    refreshMessages
  } = useChatSessions(user);

  // 编辑状态：存储正在编辑的消息 ID 和内容
  const [editingMessage, setEditingMessage] = useState<{ id: string | number; content: string } | null>(null);

  // 用于触发重新渲染的状态
  const [hiddenUpdateTrigger, setHiddenUpdateTrigger] = useState(0);

  // 过滤掉隐藏的消息
  const visibleMessages = useMemo(() => {
    if (!currentChatId) return currentMessages;
    const hiddenIds = getHiddenMessagesForSession(currentChatId);
    return currentMessages.filter(msg => !hiddenIds.includes(msg.id.toString()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMessages, currentChatId, hiddenUpdateTrigger]);

  // 历史图片状态
  const [historyImages, setHistoryImages] = useState<ImageItem[]>([]);
  const [viewMode, setViewMode] = useState<'chat' | 'history'>('chat');

  // 加载历史图片
  const loadHistoryImages = async () => {
    try {
      const images = await api.getHistoryImages();
      setHistoryImages(images);
    } catch (error) {
      console.error('Failed to load history images:', error);
    }
  };

  const handleViewImages = () => {
    loadHistoryImages();
    setViewMode('history');
  };

  const handleBackToChat = () => {
    setViewMode('chat');
  };

  // 等待认证检查完成
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
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
            onUserUpdate={updateUser}
            historyImages={historyImages.slice(0, 3)}
            onViewImages={handleViewImages}
          />

          {/* 主内容区域 */}
          <main className="content-area">
            <Header />
            {viewMode === 'chat' ? (
              <>
                {/* 消息展示组件 */}
                <ChatMessages
                  chatMessages={visibleMessages}
                  userAvatar={user.avatar}
                  onStartEdit={(id, content) => {
                    // 点击编辑按钮时，将消息内容传递给 ChatInput
                    setEditingMessage({ id, content });
                  }}
                  onDeleteMessage={(id) => {
                    if (!currentChatId) return;
                    // 前端隐藏消息，不调用后端 API
                    hideMessage(currentChatId, id.toString());
                    // 触发重新渲染
                    setHiddenUpdateTrigger(prev => prev + 1);
                  }}
                  onBatchDelete={(ids) => {
                    if (!currentChatId) return;
                    // 批量隐藏消息
                    hideMessages(currentChatId, ids.map(id => id.toString()));
                    // 触发重新渲染
                    setHiddenUpdateTrigger(prev => prev + 1);
                  }}
                />
                {/* 输入框组件 */}
                <ChatInput
                  currentChatId={currentChatId}
                  chatMessages={currentMessages}
                  setChatMessages={setChatMessages}
                  editingMessage={editingMessage}
                  onCancelEdit={() => setEditingMessage(null)}
                  refreshMessages={refreshMessages}
                />
              </>
            ) : (
              /* 历史图片组件 */
              <ImageHistory
                images={historyImages}
                onBack={handleBackToChat}
              />
            )}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}

/**
 * 主应用入口
 * 
 * 根据 URL 路由到用户应用或管理员应用
 */
export function App() {
  // 检测是否访问管理员路由
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminApp />;
  }

  return <UserApp />;
}
