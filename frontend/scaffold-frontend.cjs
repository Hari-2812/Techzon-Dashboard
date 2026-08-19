const fs = require('fs');
const path = require('path');

const pages = [
  'Login', 'NotFound', 'Leads', 'LeadDetail', 'CRManagement', 'CRDetail',
  'FollowUps', 'WhatsAppGroups', 'GroupDetail', 'Attendance', 'AttendanceManagement',
  'MyPerformance', 'TeamPerformance', 'Analytics', 'ImportLeads', 'Notifications',
  'AuditLogs', 'Settings', 'Team', 'SalaryAttendance'
];

const pagesDir = path.join(__dirname, 'src', 'pages');

if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

pages.forEach(page => {
  const content = `import React from 'react';

const ${page} = () => {
  return (
    <div className="bg-white p-6 radius-card shadow-flat border border-[var(--color-border-subtle)]">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">${page}</h1>
      <p className="text-[var(--color-text-muted)] mt-2">This page is under construction but connected to routing.</p>
    </div>
  );
};

export default ${page};
`;
  const filePath = path.join(pagesDir, `${page}.tsx`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
  }
});

const appContent = `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
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
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import Team from './pages/Team';
import SalaryAttendance from './pages/SalaryAttendance';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="crs" element={<CRManagement />} />
          <Route path="crs/:id" element={<CRDetail />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="groups" element={<WhatsAppGroups />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendance-management" element={<AttendanceManagement />} />
          <Route path="my-performance" element={<MyPerformance />} />
          <Route path="team-performance" element={<TeamPerformance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="import" element={<ImportLeads />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="team" element={<Team />} />
          <Route path="salary-attendance" element={<SalaryAttendance />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'App.tsx'), appContent);
console.log('Frontend pages scaffolded successfully.');
