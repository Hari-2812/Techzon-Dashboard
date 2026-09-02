import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { User, Bell, Settings as SettingsIcon, Shield, Clock } from 'lucide-react';
import ChangePassword from './ChangePassword';

const Settings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('profile');

  // Queries
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    }
  });

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['attendanceSettings'],
    queryFn: async () => {
      const res = await api.get('/attendance/settings');
      return res.data.data;
    },
    enabled: isAdmin
  });

  // Mutations
  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/auth/profile', payload);
      return res.data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['profile'], updatedUser);
      alert('Profile updated successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Error updating profile');
    }
  });

  const updateAttendanceSettings = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/attendance/settings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings'] });
      alert('Attendance settings updated successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Error updating settings');
    }
  });

  // States
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });

  const [notificationForm, setNotificationForm] = useState({
    attendanceReminders: true,
    leaveUpdates: true,
    leadAssignment: true,
    systemNotifications: true
  });

  const [crmForm, setCrmForm] = useState({
    defaultView: 'dashboard',
    timezone: 'Asia/Kolkata',
    itemsPerPage: 20
  });

  const [attendanceForm, setAttendanceForm] = useState({
    officeStartTime: '11:30 AM',
    officeEndTime: '06:30 PM',
    gracePeriodMinutes: 10,
    requiredWorkingHours: 8,
    breakDurationMinutes: 45,
    halfDayThresholdHours: 4,
    attendanceVerificationMode: 'GPS_ONLY',
    officeLatitude: 0,
    officeLongitude: 0,
    allowedRadiusMeters: 100,
    requireLocationForClockOut: true
  });

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        name: profileData.name || '',
        phone: profileData.phone || '',
        emergencyContact: {
          name: profileData.emergencyContact?.name || '',
          phone: profileData.emergencyContact?.phone || '',
          relationship: profileData.emergencyContact?.relationship || ''
        }
      });
      if (profileData.preferences) {
        if (profileData.preferences.notifications) setNotificationForm(profileData.preferences.notifications);
        if (profileData.preferences.crm) setCrmForm(profileData.preferences.crm);
      }
    }
  }, [profileData]);

  useEffect(() => {
    if (attendanceData && isAdmin) {
      setAttendanceForm({
        officeStartTime: attendanceData.officeStartTime || '11:30 AM',
        officeEndTime: attendanceData.officeEndTime || '06:30 PM',
        gracePeriodMinutes: attendanceData.gracePeriodMinutes || 10,
        requiredWorkingHours: attendanceData.requiredWorkingHours || 8,
        breakDurationMinutes: attendanceData.breakDurationMinutes || 45,
        halfDayThresholdHours: attendanceData.halfDayThresholdHours || 4,
        attendanceVerificationMode: attendanceData.attendanceVerificationMode || 'GPS_ONLY',
        officeLatitude: attendanceData.officeLatitude || 0,
        officeLongitude: attendanceData.officeLongitude || 0,
        allowedRadiusMeters: attendanceData.allowedRadiusMeters || 100,
        requireLocationForClockOut: attendanceData.requireLocationForClockOut ?? true
      });
    }
  }, [attendanceData, isAdmin]);

  const handleProfileChange = (e: any) => {
    const { name, value } = e.target;
    if (name.startsWith('ec_')) {
      const field = name.replace('ec_', '');
      setProfileForm(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [field]: value } }));
    } else {
      setProfileForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNotificationChange = (e: any) => {
    const { name, checked } = e.target;
    setNotificationForm(prev => ({ ...prev, [name]: checked }));
  };

  const handleCrmChange = (e: any) => {
    const { name, value } = e.target;
    setCrmForm(prev => ({ ...prev, [name]: name === 'itemsPerPage' ? Number(value) : value }));
  };

  const handleAttendanceChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setAttendanceForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      ...profileForm,
      preferences: {
        notifications: notificationForm,
        crm: crmForm
      }
    });
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return alert('Not supported');
    navigator.geolocation.getCurrentPosition((pos) => {
      setAttendanceForm(prev => ({
        ...prev,
        officeLatitude: pos.coords.latitude,
        officeLongitude: pos.coords.longitude
      }));
    });
  };

  if (isProfileLoading || (isAdmin && isAttendanceLoading)) {
    return <div className="p-8">Loading settings...</div>;
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'CRM Preferences', icon: SettingsIcon },
    ...(isAdmin ? [{ id: 'attendance', label: 'Attendance', icon: Clock }] : []),
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 md:border-b-0 md:border-l-2 border-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-b-2 md:border-b-0 md:border-l-2 border-transparent'
                }`}
              >
                <tab.icon size={18} className="mr-3 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Profile Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="text" value={profileData?.email || ''} readOnly className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" name="phone" value={profileForm.phone} onChange={handleProfileChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input type="text" value={profileData?.role || ''} readOnly className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input type="text" value={profileData?.employeeId || ''} readOnly className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={profileData?.department || ''} readOnly className="w-full border rounded-lg p-2 bg-gray-50 text-gray-500 cursor-not-allowed" />
                </div>
              </div>

              <h3 className="text-md font-semibold mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" name="ec_name" value={profileForm.emergencyContact.name} onChange={handleProfileChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input type="text" name="ec_phone" value={profileForm.emergencyContact.phone} onChange={handleProfileChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input type="text" name="ec_relationship" value={profileForm.emergencyContact.relationship} onChange={handleProfileChange} className="w-full border rounded-lg p-2" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save Profile'}</Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Notification Preferences</h2>
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" name="attendanceReminders" checked={notificationForm.attendanceReminders} onChange={handleNotificationChange} className="w-4 h-4 text-indigo-600 rounded" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">Attendance Reminders</div>
                    <div className="text-xs text-gray-500">Receive reminders for clock-in and clock-out</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" name="leadAssignment" checked={notificationForm.leadAssignment} onChange={handleNotificationChange} className="w-4 h-4 text-indigo-600 rounded" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">Lead Assignments</div>
                    <div className="text-xs text-gray-500">Get notified when new leads are assigned to you</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" name="leaveUpdates" checked={notificationForm.leaveUpdates} onChange={handleNotificationChange} className="w-4 h-4 text-indigo-600 rounded" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">Leave/Permission Updates</div>
                    <div className="text-xs text-gray-500">Updates regarding your leave requests</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" name="systemNotifications" checked={notificationForm.systemNotifications} onChange={handleNotificationChange} className="w-4 h-4 text-indigo-600 rounded" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">System Notifications</div>
                    <div className="text-xs text-gray-500">General system announcements and alerts</div>
                  </div>
                </label>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save Preferences'}</Button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">CRM Preferences</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <select name="timezone" value={crmForm.timezone} onChange={handleCrmChange} className="w-full border rounded-lg p-2 bg-white">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default View</label>
                  <select name="defaultView" value={crmForm.defaultView} onChange={handleCrmChange} className="w-full border rounded-lg p-2 bg-white">
                    <option value="dashboard">Dashboard</option>
                    <option value="leads">My Leads</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                  <select name="itemsPerPage" value={crmForm.itemsPerPage} onChange={handleCrmChange} className="w-full border rounded-lg p-2 bg-white">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save Preferences'}</Button>
              </div>
            </div>
          )}

          {isAdmin && activeTab === 'attendance' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Admin Attendance Configuration</h2>
              
              <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg text-sm mb-6">
                <strong>Current Active Schedule:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Monday: Week Off</li>
                  <li>Tuesday - Sunday: Working Days</li>
                  <li>Automated Reminder: 11:30 AM (IST)</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Login Time</label>
                  <input type="text" name="officeStartTime" value={attendanceForm.officeStartTime} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Logout Time</label>
                  <input type="text" name="officeEndTime" value={attendanceForm.officeEndTime} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Login Threshold (Minutes)</label>
                  <input type="number" name="gracePeriodMinutes" value={attendanceForm.gracePeriodMinutes} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Working Hours</label>
                  <input type="number" step="0.5" name="requiredWorkingHours" value={attendanceForm.requiredWorkingHours} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                </div>
              </div>

              <h3 className="text-md font-semibold mb-3 mt-6 border-b pb-2">Office Verification Rules</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Mode</label>
                  <select name="attendanceVerificationMode" value={attendanceForm.attendanceVerificationMode} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2 bg-white">
                    <option value="GPS_ONLY">GPS Only (Require physical location)</option>
                    <option value="NETWORK_ONLY">Network Only (Require Office IP)</option>
                    <option value="NETWORK_PLUS_GPS">Network OR GPS</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Latitude</label>
                    <input type="number" step="any" name="officeLatitude" value={attendanceForm.officeLatitude} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Longitude</label>
                    <input type="number" step="any" name="officeLongitude" value={attendanceForm.officeLongitude} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                  </div>
                </div>
                
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={handleGetMyLocation}>Set to My Current Location</Button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (Meters)</label>
                  <input type="number" name="allowedRadiusMeters" value={attendanceForm.allowedRadiusMeters} onChange={handleAttendanceChange} className="w-full border rounded-lg p-2" />
                  <p className="text-xs text-gray-500 mt-1">Employees must be within this distance to clock in.</p>
                </div>
                
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <input type="checkbox" name="requireLocationForClockOut" checked={attendanceForm.requireLocationForClockOut} onChange={handleAttendanceChange} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Require office location for Clock Out</span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => updateAttendanceSettings.mutate(attendanceForm)} disabled={updateAttendanceSettings.isPending}>
                  {updateAttendanceSettings.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Change Password</h2>
              <div className="max-w-md">
                <ChangePassword embedded={true} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
