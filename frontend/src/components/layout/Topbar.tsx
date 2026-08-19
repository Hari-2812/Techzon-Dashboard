import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAttendance } from '../../hooks/useAttendance';
import { AttendanceControls } from '../ui/AttendanceControls';

interface TopbarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const attendance = useAttendance();

  const { isWorking, isOnBreak, isCompleted: isClockedOut, isTestSession, getLiveTimer, isLoading } = attendance;

  return (
    <header className="bg-white border-b border-[var(--color-border-subtle)] h-16 flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
      
      <div className="flex items-center flex-1 gap-4">
        {/* Mobile menu toggle - only show on small screens */}
        <button 
          className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md"
          onClick={toggleSidebar}
        >
          <Menu size={20} />
        </button>

        {/* Global Search */}
        <div className="max-w-md w-full relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm transition-colors" 
            placeholder="Search leads, CRs, groups..." 
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Attendance Quick Status */}
        {!isAdmin && !isLoading && attendance.data && (
          <div className="hidden sm:flex items-center gap-4">
             <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border ${isTestSession ? 'border-orange-300 bg-orange-50' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-light)]'}`}>
               <div className="flex items-center gap-1.5">
                 <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-green-500' : isOnBreak ? 'bg-orange-500' : isClockedOut ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                 <span className={`text-sm font-medium ${isTestSession ? 'text-orange-700' : 'text-[var(--color-text-secondary)]'}`}>
                   {isWorking ? 'Working' : isOnBreak ? 'On Break' : isClockedOut ? 'Completed' : 'Not Clocked In'}
                   {isTestSession && ' (TEST)'}
                 </span>
               </div>
               {(isWorking || isOnBreak || isClockedOut) && (
                 <>
                   <span className="text-xs text-gray-400">|</span>
                   <span className={`text-sm font-mono font-medium ${isTestSession ? 'text-orange-800' : 'text-[var(--color-text-primary)]'}`}>
                      {getLiveTimer(new Date().getTime())}
                   </span>
                 </>
               )}
             </div>
             
             {/* Action Buttons via shared controls */}
             <AttendanceControls layout="topbar" />
          </div>
        )}
        
        {isAdmin && (
           <div className="hidden sm:flex items-center gap-3 bg-[var(--color-surface-light)] px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] text-sm font-medium text-gray-600">
             Admin Mode
           </div>
        )}

        {/* Notifications */}
        <button className="p-2 relative text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 block w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-white"></span>
        </button>

      </div>
    </header>
  );
};

export default Topbar;
