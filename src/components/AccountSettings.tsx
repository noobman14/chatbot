"use client"

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from '@/utils/api';

interface AccountSettingsProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  onUserUpdate: (user: { name: string; email: string; avatar: string }) => void;
}

export function AccountSettings({ user, onUserUpdate }: AccountSettingsProps) {
  const { t } = useTranslation();

  // 用户名修改状态
  const [newName, setNewName] = useState(user.name);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  // 密码修改状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 更新用户名
  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setNameError(t('account.nameRequired'));
      return;
    }

    setNameLoading(true);
    setNameError('');
    setNameSuccess(false);

    try {
      const response = await api.updateProfile({ name: newName.trim() });
      onUserUpdate({
        ...user,
        name: response.user.name
      });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : t('account.updateFailed'));
    } finally {
      setNameLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('account.allFieldsRequired'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(t('account.passwordTooShort'));
      return;
    }

    setPasswordLoading(true);

    try {
      await api.changePassword({ oldPassword, newPassword });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : t('account.changeFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 用户名修改区域 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">{t('account.changeName')}</h4>
        <div className="space-y-2">
          <Label htmlFor="name">{t('account.newName')}</Label>
          <Input
            id="name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('account.namePlaceholder')}
          />
        </div>
        {nameError && <p className="text-sm text-red-500">{nameError}</p>}
        {nameSuccess && <p className="text-sm text-green-500">{t('account.nameUpdated')}</p>}
        <Button
          onClick={handleUpdateName}
          disabled={nameLoading || newName === user.name}
        >
          {nameLoading ? t('common.loading') : t('account.updateName')}
        </Button>
      </div>

      <hr className="border-t border-border" />

      {/* 密码修改区域 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">{t('account.changePassword')}</h4>
        <div className="space-y-2">
          <Label htmlFor="oldPassword">{t('account.oldPassword')}</Label>
          <Input
            id="oldPassword"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder={t('account.oldPasswordPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t('account.newPassword')}</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('account.newPasswordPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('account.confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('account.confirmPasswordPlaceholder')}
          />
        </div>
        {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-green-500">{t('account.passwordChanged')}</p>}
        <Button
          onClick={handleChangePassword}
          disabled={passwordLoading}
        >
          {passwordLoading ? t('common.loading') : t('account.updatePassword')}
        </Button>
      </div>
    </div>
  );
}
