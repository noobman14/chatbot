import { SidebarTrigger } from "./ui/sidebar";
import { ModeToggle } from "./mode-toggle";
export function Header() {
  return (<div className='header flex items-center justify-between'>
    <SidebarTrigger className='header-trigger'></SidebarTrigger>
    <div className="mr-3">
      <ModeToggle />
    </div>
  </div>);
}