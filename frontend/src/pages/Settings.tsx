import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Button } from '../components/ui/Button';

const Settings = () => {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceSettings'],
    queryFn: async () => {
      const res = await api.get('/attendance/settings');
      return res.data.data;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/attendance/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings'] });
      alert('Settings updated successfully');
    }
  });

  const [formData, setFormData] = useState({
    officeLatitude: 0,
    officeLongitude: 0,
    allowedRadiusMeters: 100,
    attendanceVerificationMode: 'GPS_ONLY',
    requireLocationForClockOut: true
  });

  useEffect(() => {
    if (data) {
      setFormData({
        officeLatitude: data.officeLatitude || 0,
        officeLongitude: data.officeLongitude || 0,
        allowedRadiusMeters: data.allowedRadiusMeters || 100,
        attendanceVerificationMode: data.attendanceVerificationMode || 'GPS_ONLY',
        requireLocationForClockOut: data.requireLocationForClockOut ?? true
      });
    }
  }, [data]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return alert('Not supported');
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData(prev => ({
        ...prev,
        officeLatitude: pos.coords.latitude,
        officeLongitude: pos.coords.longitude
      }));
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 radius-card shadow-flat border border-[var(--color-border-subtle)] max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">System Settings</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold border-b pb-2 mb-4">Office Attendance Verification</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Mode</label>
              <select name="attendanceVerificationMode" value={formData.attendanceVerificationMode} onChange={handleChange} className="w-full border rounded p-2">
                <option value="GPS_ONLY">GPS Only (Require physical location)</option>
                <option value="NETWORK_ONLY">Network Only (Require Office IP)</option>
                <option value="NETWORK_PLUS_GPS">Network OR GPS</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Latitude</label>
                  <input type="number" step="any" name="officeLatitude" value={formData.officeLatitude} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Office Longitude</label>
                  <input type="number" step="any" name="officeLongitude" value={formData.officeLongitude} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
            </div>
            
            <div>
               <Button type="button" variant="outline" size="sm" onClick={handleGetMyLocation}>Set to My Current Location</Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (Meters)</label>
              <input type="number" name="allowedRadiusMeters" value={formData.allowedRadiusMeters} onChange={handleChange} className="w-full border rounded p-2" />
              <p className="text-xs text-gray-500 mt-1">Employees must be within this distance to clock in.</p>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="requireLocationForClockOut" checked={formData.requireLocationForClockOut} onChange={handleChange} />
                <span className="text-sm font-medium text-gray-700">Require office location for Clock Out</span>
              </label>
            </div>
          </div>
        </div>

        <Button onClick={() => updateSettings.mutate(formData)} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
