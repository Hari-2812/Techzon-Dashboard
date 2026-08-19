import React, { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight, UserPlus, Image as ImageIcon, CheckCircle } from 'lucide-react';

const CreateEmployee = () => {
    const { createEmployee } = useEmployees();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', phone: '',
        role: 'RGS', department: 'Revenue Growth', designation: 'Revenue Growth Specialist',
        joiningDate: new Date().toISOString().split('T')[0],
        gender: 'Male', dob: '', employmentType: 'Full Time', workLocation: 'Office',
        emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
        passwordMode: 'AUTO', manualPassword: ''
    });

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) return alert('File too large. Max 5MB.');
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const data = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                data.append(key, val);
            });
            if (photo) data.append('profilePhoto', photo);

            const res = await createEmployee.mutateAsync(data);
            setSuccessData(res.data);
            setStep(4); // Success screen
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error creating employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate('/employees')} className="text-gray-500 hover:text-[var(--color-primary)] mr-4">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-[var(--color-primary)]">Create Employee</h1>
            </div>

            {/* Stepper Header */}
            {step < 4 && (
                <div className="flex justify-between items-center mb-8 px-4 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
                    <div className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -z-10 transform -translate-y-1/2 transition-all duration-300" style={{ width: `${((step-1)/2)*100}%`}}></div>
                    
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {s}
                        </div>
                    ))}
                </div>
            )}

            <Card className="p-8">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-lg font-semibold border-b pb-2">1. Personal & Contact Information</h2>
                        
                        <div className="flex gap-6 items-center">
                            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-gray-400" />
                                )}
                                <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <div className="text-sm text-gray-500">
                                <p className="font-semibold text-gray-700">Profile Photo (Optional)</p>
                                <p>JPG, PNG, WebP up to 5MB</p>
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
                                <label className="block text-sm font-medium mb-1">Official Email *</label>
                                <input type="email" className="w-full border p-2 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                                <input className="w-full border p-2 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                                <input type="date" className="w-full border p-2 rounded-lg" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Gender</label>
                                <select className="w-full border p-2 rounded-lg" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={nextStep} disabled={!formData.firstName || !formData.email || !formData.phone}>Next <ArrowRight size={16} className="ml-2"/></Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-lg font-semibold border-b pb-2">2. Employment Information</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <option>Full Time</option><option>Part Time</option><option>Intern</option><option>Contract</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Work Location</label>
                                <input className="w-full border p-2 rounded-lg" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={prevStep}><ArrowLeft size={16} className="mr-2"/> Back</Button>
                            <Button onClick={nextStep} disabled={!formData.role || !formData.joiningDate}>Next <ArrowRight size={16} className="ml-2"/></Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in">
                        <h2 className="text-lg font-semibold border-b pb-2">3. Account & Security</h2>
                        
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="text-sm font-semibold text-orange-800 mb-2">Initial Password Setup</p>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={formData.passwordMode === 'AUTO'} onChange={() => setFormData({...formData, passwordMode: 'AUTO'})} />
                                    <span className="text-sm text-gray-700">Generate Securely (Recommended)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={formData.passwordMode === 'MANUAL'} onChange={() => setFormData({...formData, passwordMode: 'MANUAL'})} />
                                    <span className="text-sm text-gray-700">Set Manually</span>
                                </label>
                            </div>
                            {formData.passwordMode === 'MANUAL' && (
                                <input 
                                    type="text" 
                                    className="mt-3 w-full border p-2 rounded-lg border-orange-300" 
                                    placeholder="Enter temporary password" 
                                    value={formData.manualPassword} 
                                    onChange={e => setFormData({...formData, manualPassword: e.target.value})} 
                                />
                            )}
                            <p className="text-xs text-orange-600 mt-2">
                                Note: An email will be sent with these credentials. The user will be forced to change this password on their first login.
                            </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
                            <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">Review Details</h3>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{formData.firstName} {formData.lastName}</span>
                                <span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{formData.email}</span>
                                <span className="text-gray-500">Role:</span> <span className="font-medium text-gray-900">{formData.role}</span>
                                <span className="text-gray-500">Department:</span> <span className="font-medium text-gray-900">{formData.department}</span>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={prevStep} disabled={loading}><ArrowLeft size={16} className="mr-2"/> Back</Button>
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Employee'} <UserPlus size={16} className="ml-2"/>
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && successData && (
                    <div className="text-center space-y-4 animate-in fade-in py-8">
                        <CheckCircle className="mx-auto text-green-500" size={64} />
                        <h2 className="text-2xl font-bold text-gray-800">Employee Created Successfully</h2>
                        <div className="inline-block bg-green-50 border border-green-200 rounded-xl p-6 text-left w-full max-w-sm mt-4">
                            <div className="flex justify-between border-b border-green-200 pb-2 mb-2">
                                <span className="text-green-800 font-semibold">Employee ID:</span>
                                <span className="font-mono font-bold text-green-900">{successData.employeeId}</span>
                            </div>
                            <div className="flex justify-between pb-2 mb-2 border-b border-green-200">
                                <span className="text-green-800 font-semibold">Name:</span>
                                <span className="font-medium text-green-900">{successData.name}</span>
                            </div>
                            <div className="flex justify-between pb-2 mb-2 border-b border-green-200">
                                <span className="text-green-800 font-semibold">Email:</span>
                                <span className="font-medium text-green-900">{successData.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-green-800 font-semibold">Status:</span>
                                <span className="font-medium text-green-900">Invitation Sent</span>
                            </div>
                        </div>
                        <div className="flex justify-center gap-4 mt-8">
                            <Button variant="outline" onClick={() => navigate('/employees')}>Return to Directory</Button>
                            <Button onClick={() => { setStep(1); setSuccessData(null); setPhoto(null); setPhotoPreview(null); }}>Create Another Employee</Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CreateEmployee;
