import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';

// Pages
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));
const SalesDetail = lazy(() => import('./pages/SalesDetail'));
const DailyUpdates = lazy(() => import('./pages/DailyUpdates'));
const CRManagement = lazy(() => import('./pages/CRManagement'));
const CRDetail = lazy(() => import('./pages/CRDetail'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const WhatsAppGroups = lazy(() => import('./pages/WhatsAppGroups'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AttendanceManagement = lazy(() => import('./pages/AttendanceManagement'));
const EmployeeAttendanceHistory = lazy(() => import('./pages/EmployeeAttendanceHistory'));
const EmployeeCallAnalytics = lazy(() => import('./pages/EmployeeCallAnalytics'));
const MyPerformance = lazy(() => import('./pages/MyPerformance'));
const TeamPerformance = lazy(() => import('./pages/TeamPerformance'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ImportLeads = lazy(() => import('./pages/ImportLeads'));
const SalesImport = lazy(() => import('./pages/SalesImport'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const Team = lazy(() => import('./pages/Team'));
const SalaryAttendance = lazy(() => import('./pages/SalaryAttendance'));
const HolidayManagement = lazy(() => import('./pages/HolidayManagement'));
const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'));
const CreateEmployee = lazy(() => import('./pages/CreateEmployee'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const EditEmployee = lazy(() => import('./pages/EditEmployee'));
const LeadAssignment = lazy(() => import('./pages/LeadAssignment'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

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
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-[var(--color-primary)]">Loading application...</div>}>
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
              <Route path="/attendance-management/employee/:employeeId" element={<EmployeeAttendanceHistory />} />
              <Route path="/admin/call-analytics/:employeeId" element={<EmployeeCallAnalytics />} />
              <Route path="/performance" element={<TeamPerformance />} />
              <Route path="/holiday-management" element={<HolidayManagement />} />
              <Route path="/employees" element={<EmployeeManagement />} />
              <Route path="/employees/create" element={<CreateEmployee />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/employees/:id/edit" element={<EditEmployee />} />
              <Route path="/employees/:employeeId/import-leads" element={<ImportLeads />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/lead-assignment" element={<LeadAssignment />} />
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
      </Suspense>
    </Router>
  );
}

export default App;
