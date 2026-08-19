import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Lock } from 'lucide-react';
import api from '../../services/api';

const ForcePasswordChange = () => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            return setError('New passwords do not match');
        }
        if (newPassword.length < 8) {
            return setError('Password must be at least 8 characters long');
        }

        try {
            setLoading(true);
            await api.post('/auth/change-password', {
                currentPassword,
                newPassword
            });
            // Force re-login with new password to get fresh token and update mustChangePassword
            alert('Password changed successfully! Please log in again.');
            logout();
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error changing password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
            <Card className="w-full max-w-md p-8 shadow-xl">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-[var(--color-primary)] rounded-full flex items-center justify-center">
                        <Lock size={32} />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">Welcome to Techzon CRM</h1>
                <p className="text-center text-[var(--color-text-muted)] text-sm mb-6">
                    For security, please change your temporary password before accessing your dashboard.
                </p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input 
                            type="password" 
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <Button type="submit" className="w-full mt-6" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
                </div>
            </Card>
        </div>
    );
};

export default ForcePasswordChange;
