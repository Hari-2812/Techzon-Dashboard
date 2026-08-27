import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import SalesDashboard from './pages/SalesDashboard';
import SalesDetail from './pages/SalesDetail';
import DailyUpdates from './pages/DailyUpdates';
import CRManagement from './pages/CRManagement';
import CRDetail from './pages/CRDetail';
import FollowUps from './pages/FollowUps';
import WhatsAppGroups from './pages/WhatsAppGroups';
import GroupDetail from './pages/GroupDetail';
import Attendance from './pages/Attendance';
import AttendanceManagement from './pages/AttendanceManagement';
import MyPerformance from './pages/MyPerformance';
import TeamPerformance from './pages/TeamPerformance';
import Analytics from './pages/Analytics';
import ImportLeads from './pages/ImportLeads';
import SalesImport from './pages/SalesImport';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Team from './pages/Team';
import SalaryAttendance from './pages/SalaryAttendance';
import HolidayManagement from './pages/HolidayManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import CreateEmployee from './pages/CreateEmployee';
import EmployeeProfile from './pages/EmployeeProfile';
import EditEmployee from './pages/EditEmployee';
import ChangePassword from './pages/ChangePassword';

const DynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'Techzon CRM Dashboard';

    if (path.startsWith('/dashboard')) title = 'Techzon CRM Dashboard';
    else if (path.startsWith('/leads')) title = 'Leads | Techzon CRM Dashboard';
    else if (path.startsWith('/crs')) title = 'CR Management | Techzon CRM Dashboard';
    else if (path.startsWith('/follow-ups')) title = 'Follow-ups | Techzon CRM Dashboard';
    else if (path.startsWith('/attendance-management')) title = 'Attendance Management | Techzon CRM Dashboard';
    else if (path.startsWith('/attendance')) title = 'Attendance | Techzon CRM Dashboard';
    else if (path.startsWith('/performance')) title = 'Team Performance | Techzon CRM Dashboard';
    else if (path.startsWith('/my-performance')) title = 'My Performance | Techzon CRM Dashboard';
    else if (path.startsWith('/employees')) title = 'Employees | Techzon CRM Dashboard';
    else if (path.startsWith('/groups')) title = 'WhatsApp Groups | Techzon CRM Dashboard';
    else if (path.startsWith('/settings')) title = 'Settings | Techzon CRM Dashboard';
    else if (path.startsWith('/login')) title = 'Login | Techzon CRM Dashboard';
    else if (path.startsWith('/forgot-password')) title = 'Forgot Password | Techzon CRM Dashboard';
    else if (path.startsWith('/reset-password')) title = 'Reset Password | Techzon CRM Dashboard';
    else if (path.startsWith('/notifications')) title = 'Notifications | Techzon CRM Dashboard';
    else if (path.startsWith('/holiday-management')) title = 'Holiday Management | Techzon CRM Dashboard';
    else if (path.startsWith('/audit-logs')) title = 'Audit Logs | Techzon CRM Dashboard';
    else if (path.startsWith('/analytics')) title = 'Analytics | Techzon CRM Dashboard';

    document.title = title;
  }, [location]);

  return null;
};

function App() {
  return (
    <Router>
      <DynamicTitle />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Common Routes */}
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="sales" element={<SalesDashboard />} />
            <Route path="sales/:id" element={<SalesDetail />} />
            <Route path="sales-import" element={<SalesImport />} />
            <Route path="daily-updates" element={<DailyUpdates />} />
            <Route path="crs" element={<CRManagement />} />
            <Route path="crs/:id" element={<CRDetail />} />
            <Route path="follow-ups" element={<FollowUps />} />
            <Route path="groups" element={<WhatsAppGroups />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="my-performance" element={<MyPerformance />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />

            {/* Admin Only Routes */}
            <Route element={<RoleRoute roles={['ADMIN']} />}>
              <Route path="/attendance-management" element={<AttendanceManagement />} />
              <Route path="/performance" element={<TeamPerformance />} />
              <Route path="/holiday-management" element={<HolidayManagement />} />
              <Route path="/employees" element={<EmployeeManagement />} />
              <Route path="/employees/create" element={<CreateEmployee />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/employees/:id/edit" element={<EditEmployee />} />
              <Route path="/employees/:employeeId/import-leads" element={<ImportLeads />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="team" element={<Team />} />
              <Route path="salary-attendance" element={<SalaryAttendance />} />
            </Route>

            {/* Accessible by anyone (Role logic handled inside component) */}
            <Route path="import-leads" element={<ImportLeads />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
