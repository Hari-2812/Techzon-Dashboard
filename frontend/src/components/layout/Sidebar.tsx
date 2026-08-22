import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  CalendarClock,
  Calendar,
  MessageCircle,
  Clock,
  LineChart,
  BarChart3,
  UploadCloud,
  Bell,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  ClipboardList
} from 'lucide-react';
import clsx from 'clsx';

import logo from '../../assets/logo.jpeg';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isMobileOpen = false, setIsMobileOpen }) => {
  const { user, logout } = useAuthStore();

  const commonNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: Users },
    { name: 'Daily Updates', path: '/daily-updates', icon: ClipboardList },
    { name: 'CR Management', path: '/crs', icon: UserSquare2 },
    { name: 'Follow-ups', path: '/follow-ups', icon: CalendarClock },
  ];

  const employeeOnlyItems = [
    { name: 'WhatsApp Groups', path: '/groups', icon: MessageCircle },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'My Performance', path: '/my-performance', icon: LineChart },
  ];

  const adminOnlyItems = [
    { name: 'Employee Mgmt', path: '/employees', icon: Users },
    { name: 'Lead Assignment', path: '/lead-assignment', icon: Users },
    { name: 'Attendance Mgmt', path: '/attendance-management', icon: Clock },
    { name: 'Employee Performance', path: '/performance', icon: BarChart3 },
    { name: 'Holiday Management', path: '/holiday-management', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'Import Leads', path: '/import-leads', icon: UploadCloud },
    { name: 'Audit Logs', path: '/audit-logs', icon: History },
  ];

  const bottomCommonItems = [
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const navItems = user?.role === 'ADMIN' 
    ? [...commonNavItems, ...adminOnlyItems, ...bottomCommonItems] 
    : [...commonNavItems, ...employeeOnlyItems, ...bottomCommonItems];

  const closeMobileMenu = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside 
        className={clsx(
          "flex flex-col bg-[var(--color-primary)] text-white transition-transform md:transition-all duration-300 ease-in-out h-full shrink-0 fixed md:relative z-50 md:z-auto",
          isOpen ? "md:w-[var(--spacing-sidebar)]" : "md:w-[var(--spacing-sidebar-collapsed)]",
          isMobileOpen ? "translate-x-0 w-[var(--spacing-sidebar)]" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-center flex-1 h-full max-h-full">
              <div className={clsx("bg-white rounded p-1 flex items-center justify-center", (isOpen || isMobileOpen) ? "w-full max-w-[140px] h-10" : "w-8 h-8 md:flex hidden")}>
                  <img src={logo} alt="Techzon Logo" className="w-full h-full object-contain" />
              </div>
          </div>
          {(isOpen || isMobileOpen) && (
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  closeMobileMenu();
                } else {
                  setIsOpen(false);
                }
              }}
              className="p-1 rounded-md hover:bg-white/10 text-white/80 transition-colors ml-2"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {!isOpen && (
             <button 
               onClick={() => setIsOpen(true)}
               className="hidden md:flex absolute -right-3 top-5 p-1 rounded-full bg-white text-[var(--color-primary)] shadow-md hover:bg-gray-100 z-10"
             >
               <ChevronRight size={14} />
             </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={({ isActive }) => clsx(
                    "flex items-center rounded-lg px-3 py-2.5 transition-colors group relative",
                    isActive 
                      ? "bg-[var(--color-primary-container)] text-white" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                  title={(!isOpen && !isMobileOpen) ? item.name : undefined}
                >
                  <item.icon size={20} className="min-w-[20px]" />
                  {(isOpen || isMobileOpen) && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">
                      {item.name}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Bottom User Area */}
        <div className="p-4 border-t border-white/10 flex flex-col space-y-4 safe-area-bottom">
          <div className={clsx("flex items-center", (!isOpen && !isMobileOpen) && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold uppercase shadow-sm">
              {user?.name.charAt(0) || 'U'}
            </div>
            {(isOpen || isMobileOpen) && (
              <div className="ml-3 truncate">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-white/70">{user?.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => { closeMobileMenu(); logout(); }} 
            className={clsx(
              "flex items-center text-white/70 hover:text-white transition-colors w-full",
              (!isOpen && !isMobileOpen) && "justify-center"
            )}
            title={(!isOpen && !isMobileOpen) ? "Logout" : undefined}
          >
            <LogOut size={20} className={clsx((isOpen || isMobileOpen) && "mr-2")}/>
            {(isOpen || isMobileOpen) && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
