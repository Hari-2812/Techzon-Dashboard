import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import logo from '../../assets/logo.jpeg';
import NotificationBell from './NotificationBell';

interface TopbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileMenu?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ isSidebarOpen, toggleSidebar, toggleMobileMenu }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="bg-white border-b border-[var(--color-border-subtle)] h-16 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
      
      <div className="flex items-center flex-1 gap-4">
        {/* Mobile menu toggle - only show on small screens */}
        <button 
          className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md"
          onClick={toggleMobileMenu}
        >
          <Menu size={20} />
        </button>

        {/* Mobile Logo - Center on small screens */}
        <div className="md:hidden flex flex-1 justify-center -ml-6">
           <img src={logo} alt="Techzon Logo" className="h-8 object-contain" />
        </div>

        {/* Global Search */}
        <div className="max-w-xl w-full relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-11 pr-4 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 sm:text-sm transition-all duration-200" 
            placeholder="Search leads, CRs, groups..." 
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile Search Icon */}
        <button className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Search size={20} />
        </button>


        
        {isAdmin && (
           <div className="hidden md:flex items-center justify-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-sm font-semibold text-indigo-700 shadow-sm">
             Admin Mode
           </div>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Mobile Profile Avatar */}
        <div className="md:hidden w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white shadow-sm">
          {user?.name.charAt(0) || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
