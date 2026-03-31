"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotificationSettings } from '../settings/NotificationSettings';
import { AccountSettings } from '../settings/AccountSettings';

// NavUser 组件：显示在侧边栏底部的用户信息区域
// 包含用户头像、姓名、邮箱，以及一个下拉菜单（用于登出、查看账户等）
export function NavUser({
  user,
  onLogout,
  onUserUpdate,
}: {
  user: {
    name: string
    email: string
    avatar: string
  },
  onLogout: () => void,
  onUserUpdate?: (user: { name: string; email: string; avatar: string }) => void
}) {
  // 获取侧边栏状态，用于判断是否为移动端布局
  const { isMobile } = useSidebar()
  const { t } = useTranslation();
  // 通知设置对话框状态
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  // 账户设置对话框状态
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  // 处理用户信息更新
  const handleUserUpdate = (updatedUser: { name: string; email: string; avatar: string }) => {
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
    // 同时更新 localStorage 中的用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      localStorage.setItem('user', JSON.stringify({
        ...parsedUser,
        ...updatedUser
      }));
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            {/* 触发区域：显示用户信息和展开图标 */}
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            {/* 下拉菜单内容 */}
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"} // 根据设备类型调整弹出方向
              align="end"
              sideOffset={4}
            >
              {/* 顶部用户信息概览 */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* 账户相关选项 */}
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setAccountDialogOpen(true)}>
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  {t('user.account')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNotificationDialogOpen(true)}>
                  <Bell className="mr-2 h-4 w-4" />
                  {t('user.notifications')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              {/* 登出按钮 */}
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('user.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* 通知设置对话框 */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('notification.title')}</DialogTitle>
          </DialogHeader>
          <NotificationSettings />
        </DialogContent>
      </Dialog>

      {/* 账户设置对话框 */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('account.title')}</DialogTitle>
          </DialogHeader>
          <AccountSettings user={user} onUserUpdate={handleUserUpdate} />
        </DialogContent>
      </Dialog>
    </>
  )
}
