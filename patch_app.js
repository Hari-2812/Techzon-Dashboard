const fs = require('fs');
const content = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const updated = content
  .replace("import { useEffect } from 'react';", "import { useEffect, Suspense, lazy } from 'react';")
  .replace(/import Dashboard from '\.\/pages\/Dashboard';\r?\nimport Login from '\.\/pages\/Login';\r?\n([\s\S]*?)import ChangePassword from '\.\/pages\/ChangePassword';/,
  "import Login from './pages/Login';\r\n" +
  "const Dashboard = lazy(() => import('./pages/Dashboard'));\r\n" +
  "const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));\r\n" +
  "const ResetPassword = lazy(() => import('./pages/ResetPassword'));\r\n" +
  "const NotFound = lazy(() => import('./pages/NotFound'));\r\n" +
  "const Leads = lazy(() => import('./pages/Leads'));\r\n" +
  "const LeadDetail = lazy(() => import('./pages/LeadDetail'));\r\n" +
  "const SalesDashboard = lazy(() => import('./pages/SalesDashboard'));\r\n" +
  "const SalesDetail = lazy(() => import('./pages/SalesDetail'));\r\n" +
  "const DailyUpdates = lazy(() => import('./pages/DailyUpdates'));\r\n" +
  "const CRManagement = lazy(() => import('./pages/CRManagement'));\r\n" +
  "const CRDetail = lazy(() => import('./pages/CRDetail'));\r\n" +
  "const FollowUps = lazy(() => import('./pages/FollowUps'));\r\n" +
  "const WhatsAppGroups = lazy(() => import('./pages/WhatsAppGroups'));\r\n" +
  "const GroupDetail = lazy(() => import('./pages/GroupDetail'));\r\n" +
  "const Attendance = lazy(() => import('./pages/Attendance'));\r\n" +
  "const AttendanceManagement = lazy(() => import('./pages/AttendanceManagement'));\r\n" +
  "const EmployeeAttendanceHistory = lazy(() => import('./pages/EmployeeAttendanceHistory'));\r\n" +
  "const EmployeeCallAnalytics = lazy(() => import('./pages/EmployeeCallAnalytics'));\r\n" +
  "const MyPerformance = lazy(() => import('./pages/MyPerformance'));\r\n" +
  "const TeamPerformance = lazy(() => import('./pages/TeamPerformance'));\r\n" +
  "const Analytics = lazy(() => import('./pages/Analytics'));\r\n" +
  "const ImportLeads = lazy(() => import('./pages/ImportLeads'));\r\n" +
  "const SalesImport = lazy(() => import('./pages/SalesImport'));\r\n" +
  "const Notifications = lazy(() => import('./pages/Notifications'));\r\n" +
  "const AuditLogs = lazy(() => import('./pages/AuditLogs'));\r\n" +
  "const Settings = lazy(() => import('./pages/Settings'));\r\n" +
  "const Team = lazy(() => import('./pages/Team'));\r\n" +
  "const SalaryAttendance = lazy(() => import('./pages/SalaryAttendance'));\r\n" +
  "const HolidayManagement = lazy(() => import('./pages/HolidayManagement'));\r\n" +
  "const EmployeeManagement = lazy(() => import('./pages/EmployeeManagement'));\r\n" +
  "const CreateEmployee = lazy(() => import('./pages/CreateEmployee'));\r\n" +
  "const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));\r\n" +
  "const EditEmployee = lazy(() => import('./pages/EditEmployee'));\r\n" +
  "const LeadAssignment = lazy(() => import('./pages/LeadAssignment'));\r\n" +
  "const ChangePassword = lazy(() => import('./pages/ChangePassword'));"
  )
  .replace("<Routes>", <Suspense fallback={<div className="h-screen flex items-center justify-center text-[var(--color-primary)]">Loading application...</div>}>\r\n        <Routes>)
  .replace("</Routes>", "</Routes>\r\n      </Suspense>");

fs.writeFileSync('frontend/src/App.tsx', updated);
console.log('App.tsx patched successfully');
