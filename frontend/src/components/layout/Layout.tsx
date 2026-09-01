import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import socket from '../../services/socket';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['crs'] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['performance'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    };

    const handleNotificationUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('cr:updated', handleUpdate);
    socket.on('followup:created', handleUpdate);
    socket.on('followup:updated', handleUpdate);
    socket.on('followup:completed', handleUpdate);
    socket.on('group:created', handleUpdate);
    socket.on('group:updated', handleUpdate);
    socket.on('lead:created', handleUpdate);
    socket.on('lead:updated', handleUpdate);
    socket.on('lead:completed', handleUpdate);
    socket.on('sale:created', handleUpdate);
    socket.on('sale:updated', handleUpdate);
    socket.on('sale:converted', handleUpdate);
    socket.on('leads:employee-sales-imported', handleUpdate);
    socket.on('notification:new', handleNotificationUpdate);
    socket.on('notification:refresh', handleNotificationUpdate);

    return () => {
      socket.off('cr:updated', handleUpdate);
      socket.off('followup:created', handleUpdate);
      socket.off('followup:updated', handleUpdate);
      socket.off('followup:completed', handleUpdate);
      socket.off('group:created', handleUpdate);
      socket.off('group:updated', handleUpdate);
      socket.off('lead:created', handleUpdate);
      socket.off('lead:updated', handleUpdate);
      socket.off('lead:completed', handleUpdate);
      socket.off('sale:created', handleUpdate);
      socket.off('sale:updated', handleUpdate);
      socket.off('sale:converted', handleUpdate);
      socket.off('leads:employee-sales-imported', handleUpdate);
      socket.off('notification:new', handleNotificationUpdate);
      socket.off('notification:refresh', handleNotificationUpdate);
    };
  }, [queryClient]);

  return (
    <div className="flex h-screen bg-[var(--color-surface-bg)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar 
          isSidebarOpen={isSidebarOpen} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
