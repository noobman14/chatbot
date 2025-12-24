import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react"
import type { ChatSession } from "../hooks/useChatSessions"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenuAction,
} from "@/components/ui/sidebar"
import { useTranslation } from 'react-i18next';
import { ImageThumbnails, type ImageItem } from "./ImageThumbnails";

// 定义组件属性接口
interface AppSidebarProps {
  sessions: ChatSession[]; // 聊天会话列表
  currentChatId: string; // 当前选中的会话ID
  onNewChat: () => void; // 创建新会话的回调
  onSwitchChat: (id: string) => void; // 切换会话的回调
  onDeleteChat: (id: string, e: React.MouseEvent) => void; // 删除会话的回调
  user: { name: string; email: string; avatar: string }; // 用户信息
  onLogout: () => void; // 登出回调
  onUserUpdate?: (user: { name: string; email: string; avatar: string }) => void; // 用户信息更新回调
  historyImages?: ImageItem[]; // 历史图片列表
  onViewImages?: () => void; // 查看所有图片的回调
}

export function AppSidebar({
  sessions,
  currentChatId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  user,
  onLogout,
  onUserUpdate,
  historyImages = [],
  onViewImages
}: AppSidebarProps) {
  const { t } = useTranslation();

  // 菜单项配置 - 移动到组件内部以使用 t 函数
  const items = [
    {
      title: t('sidebar.newChat'),
      url: "#",
      icon: MessageSquarePlus,
      action: "new_chat"
    },
  ];

  return (
    <Sidebar collapsible="icon" >
      <SidebarHeader className="flex flex-row justify-end">
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup >
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    onClick={(e) => {
                      e.preventDefault();
                      // 处理新建聊天动作
                      if (item.action === 'new_chat') {
                        onNewChat();
                      }
                    }}
                  >
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {/* 历史图片缩略图 */}
            {onViewImages && (
              <ImageThumbnails
                images={historyImages}
                onViewAll={onViewImages}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.recentChats')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 渲染历史会话列表 */}
              {sessions.map((session) => (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    title={session.title}
                    isActive={currentChatId === session.id} // 高亮当前会话
                    onClick={() => onSwitchChat(session.id)} // 点击切换会话
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span className="truncate">{session.title}</span>
                  </SidebarMenuButton>
                  {/* 删除会话按钮，悬停时显示 */}
                  <SidebarMenuAction
                    showOnHover
                    onClick={(e) => onDeleteChat(session.id, e)}
                    title={t('sidebar.deleteChat')}
                  >
                    <Trash2 />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
      </SidebarFooter>

    </Sidebar>
  )
}
