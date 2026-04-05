import { SidebarTrigger } from "../ui/sidebar";
import { ModeToggle } from "../mode-toggle";
import { LanguageSwitcher } from "../settings/LanguageSwitcher";
import { Button } from "../ui/button";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

type HeaderProps = {
  showSidebarTrigger?: boolean;
};

export function Header({ showSidebarTrigger = true }: HeaderProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isCodePage = pathname.startsWith('/code');

  return (<div className='header flex items-center justify-between'>
    {showSidebarTrigger ? <SidebarTrigger className='header-trigger'></SidebarTrigger> : <div />}
    <div className="flex items-center gap-2 mr-3">
      <Button asChild variant="outline" size="sm">
        <Link to={isCodePage ? '/' : '/code'}>
          {isCodePage ? t('code.backToChat') : t('code.openSandbox')}
        </Link>
      </Button>
      <LanguageSwitcher />
      <ModeToggle />
    </div>
  </div>);
}
