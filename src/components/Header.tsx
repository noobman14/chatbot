import { SidebarTrigger } from "./ui/sidebar";
import { ModeToggle } from "./mode-toggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  return (<div className='header flex items-center justify-between'>
    <SidebarTrigger className='header-trigger'></SidebarTrigger>
    <div className="flex items-center gap-2 mr-3">
      <LanguageSwitcher />
      <ModeToggle />
    </div>
  </div>);
}
