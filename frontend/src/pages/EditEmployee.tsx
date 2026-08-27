import React, { useState, useEffect } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Save, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import moment from 'moment-timezone';

const EditEmployee = () => {
    const { id } = useParams<{ id: string }>();
    const { getEmployeeById, updateEmployee } = useEmployees();
    const navigate = useNavigate();
    
    const { data: employee, isLoading: isFetching } = getEmployeeById(id || '');

    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        role: '', department: '', designation: '',
        joiningDate: '', gender: '', dob: '', employmentType: '', workLocation: '', googleSheetId: '',
        emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    });

    const [originalData, setOriginalData] = useState<any>({});
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    
    const [showRoleWarning, setShowRoleWarning] = useState(false);
    const [showJoinDateWarning, setShowJoinDateWarning] = useState(false);

    useEffect(() => {
        if (employee) {
            // parse name into first and last
            const parts = employee.name.split(' ');
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ');

            const initial = {
                firstName: firstName || '',
                lastName: lastName || '',
                email: employee.email || '',
                phone: employee.phone || '',
                role: employee.role || '',
                department: employee.department || '',
                designation: employee.designation || '',
                joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
                gender: employee.gender || '',
                dob: employee.dob ? employee.dob.split('T')[0] : '',
                employmentType: employee.employmentType || '',
                workLocation: employee.workLocation || '',
                googleSheetId: employee.googleSheetId || '',
                emergencyContactName: employee.emergencyContact?.name || '',
                emergencyContactPhone: employee.emergencyContact?.phone || '',
                emergencyContactRelation: employee.emergencyContact?.relationship || ''
            };
            setFormData(initial);
            setOriginalData(initial);
            
            if (employee.profilePhoto) {
                setPhotoPreview(`${import.meta.env.VITE_API_URL?.replace('/api','') || ''}${employee.profilePhoto}`);
            }
        }
    }, [employee]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) return alert('File too large. Max 5MB.');
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
            setRemovePhoto(false);
        }
    };

    const handleRemovePhoto = () => {
        setPhoto(null);
        setPhotoPreview(null);
        setRemovePhoto(true);
    };

    const getChangedFields = () => {
        const changes: Record<string, { old: string, new: string }> = {};
        Object.keys(formData).forEach(key => {
            const k = key as keyof typeof formData;
            if (formData[k] !== originalData[k]) {
                changes[k] = { old: originalData[k], new: formData[k] };
            }
        });
        return changes;
    };

    const changedFields = getChangedFields();
    const hasChanges = Object.keys(changedFields).length > 0 || photo !== null || removePhoto;

    const handleSaveInitiated = () => {
        if (formData.role !== originalData.role) {
            setShowRoleWarning(true);
            return;
        }
        if (formData.joiningDate !== originalData.joiningDate) {
            setShowJoinDateWarning(true);
            return;
        }
        executeSave();
    };

    const executeSave = async () => {
        setShowRoleWarning(false);
        setShowJoinDateWarning(false);
        
        try {
            setLoading(true);
            const data = new FormData();
            
            // Only send changed fields to avoid unnecessary updates
            Object.keys(changedFields).forEach(key => {
                const k = key as keyof typeof formData;
                data.append(k, formData[k]);
            });

            if (photo) data.append('profilePhoto', photo);
            if (removePhoto) data.append('removePhoto', 'true');

            await updateEmployee.mutateAsync({ id: id!, formData: data });
            
            setSuccessMessage('Employee details updated successfully.');
            setTimeout(() => {
                navigate(`/employees/${id}`);
            }, 2000);
            
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error updating employee');
        } finally {
            setLoading(false);
        }
    };

    if (isFetching) return <div className="p-8">Loading employee data...</div>;
    if (!employee) return <div className="p-8 text-red-500">Employee not found.</div>;

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button onClick={() => navigate(`/employees/${id}`)} className="text-gray-500 hover:text-[var(--color-primary)] mr-4">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-[var(--color-primary)]">Edit Employee</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="neutral">ID: {employee.employeeId}</Badge>
                </div>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center border border-green-200">
                    <CheckCircle className="mr-2" size={20} />
                    {successMessage}
                </div>
            )}

            <div className="space-y-6">
                {/* Personal Information */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4">Personal Information</h2>
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                        <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group shrink-0">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-400" />
                            )}
                        </div>
                        <div className="flex flex-col justify-center space-y-2">
                            <p className="font-medium text-gray-700">Profile Photo</p>
                            <div className="flex items-center gap-3">
                                <label className="bg-white border border-gray-300 px-3 py-1.5 rounded text-sm font-medium cursor-pointer hover:bg-gray-50">
                                    Change Photo
                                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                </label>
                                {(photoPreview || employee.profilePhoto) && !removePhoto && (
                                    <button type="button" onClick={handleRemovePhoto} className="text-red-500 text-sm hover:underline">
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">First Name *</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Name</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date of Birth</label>
                            <input type="date" className="w-full border p-2 rounded-lg" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <select className="w-full border p-2 rounded-lg" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                <option value="">Select</option>
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Contact Information */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Official Email *</label>
                            <input type="email" className="w-full border p-2 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone Number *</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div className="md:col-span-2 mt-4">
                            <h3 className="font-medium text-sm text-gray-700 mb-2">Emergency Contact</h3>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contact Name</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Contact Phone</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Relationship</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.emergencyContactRelation} onChange={e => setFormData({...formData, emergencyContactRelation: e.target.value})} />
                        </div>
                    </div>
                </Card>

                {/* Employment Information */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold border-b pb-2 mb-4">Employment Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-500">Employee ID (Cannot be changed)</label>
                            <input className="w-full border p-2 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" value={employee.employeeId} disabled />
                            <p className="text-xs text-gray-400 mt-1">Employee ID cannot be changed after account creation.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Role *</label>
                            <select className="w-full border p-2 rounded-lg" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="RGS">RGS</option>
                                <option value="BDE">BDE</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Department</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Designation</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Joining Date *</label>
                            <input type="date" className="w-full border p-2 rounded-lg" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Employment Type</label>
                            <select className="w-full border p-2 rounded-lg" value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})}>
                                <option value="">Select</option>
                                <option>Full Time</option><option>Part Time</option><option>Intern</option><option>Contract</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Work Location</label>
                            <input className="w-full border p-2 rounded-lg" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Google Sheet ID</label>
                            <input className="w-full border p-2 rounded-lg" placeholder="e.g., 1BxiMvs0XRYFgwnAKnZJ7... (Optional)" value={formData.googleSheetId} onChange={e => setFormData({...formData, googleSheetId: e.target.value})} />
                            <p className="text-xs text-gray-500 mt-1">If provided, this Google Sheet will be synced for this employee instead of the global sheet.</p>
                        </div>
                    </div>
                </Card>

                {/* Review Changes */}
                {hasChanges && (
                    <Card className="p-6 bg-blue-50 border-blue-200">
                        <h2 className="text-lg font-semibold text-blue-900 mb-4">Review Changes</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                            {Object.entries(changedFields).map(([key, vals]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <div className="flex items-center text-gray-600 mt-1">
                                        <span className="line-through bg-red-100 text-red-800 px-1 rounded">{vals.old || '-'}</span>
                                        <span className="mx-2">→</span>
                                        <span className="bg-green-100 text-green-800 px-1 rounded font-medium">{vals.new || '-'}</span>
                                    </div>
                                </div>
                            ))}
                            {photo && (
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Profile Photo:</span>
                                    <span className="ml-2 text-green-700 font-medium">New photo uploaded</span>
                                </div>
                            )}
                            {removePhoto && (
                                <div className="text-sm">
                                    <span className="font-medium text-gray-700">Profile Photo:</span>
                                    <span className="ml-2 text-red-700 font-medium">Photo removed</span>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => navigate(`/employees/${id}`)} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSaveInitiated} disabled={!hasChanges || loading || !formData.firstName || !formData.email || !formData.role}>
                        {loading ? 'Saving...' : 'Save Changes'} <Save size={16} className="ml-2"/>
                    </Button>
                </div>
            </div>

            {/* Warning Modals */}
            {showRoleWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center text-orange-600 mb-4">
                            <AlertTriangle size={24} className="mr-2" />
                            <h2 className="text-xl font-bold">Change Employee Role?</h2>
                        </div>
                        <p className="text-gray-600 mb-4">
                            You are changing this employee's role from <strong className="text-gray-900">{originalData.role}</strong> to <strong className="text-gray-900">{formData.role}</strong>.
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            This will change the employee's dashboard and system permissions immediately. Historical records and Employee ID will not be affected.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowRoleWarning(false)}>Cancel</Button>
                            <Button onClick={executeSave}>Confirm Change</Button>
                        </div>
                    </div>
                </div>
            )}

            {showJoinDateWarning && !showRoleWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center text-orange-600 mb-4">
                            <AlertTriangle size={24} className="mr-2" />
                            <h2 className="text-xl font-bold">Attendance History Warning</h2>
                        </div>
                        <p className="text-gray-600 mb-4">
                            You are changing the joining date. If this employee already has attendance records before the new joining date, changing this may affect attendance calculations.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowJoinDateWarning(false)}>Cancel</Button>
                            <Button onClick={executeSave}>Continue</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for Badge
const Badge = ({ children, variant = 'neutral' }: any) => {
    const colors = {
        success: 'bg-green-100 text-green-800 border-green-200',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        error: 'bg-red-100 text-red-800 border-red-200',
        neutral: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[variant as keyof typeof colors]}`}>
            {children}
        </span>
    );
};

export default EditEmployee;
