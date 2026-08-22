import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { 
  Upload, FileText, CheckCircle, ArrowRight, ArrowLeft, 
  Check, AlertCircle, Database, RefreshCw, Settings, 
  Table2, Activity, Play, StopCircle, Clock, Users, Link as LinkIcon
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { 
  useGoogleSheetsSettings, 
  useUpdateGoogleSheetsSettings,
  useExecuteGoogleSheetsSync,
  useGoogleSheetsHistory,
  useGoogleSheetsConfig,
  useGoogleSheetsAuthUrl
} from '../hooks/useGoogleSheets';

export default function ImportLeads() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'csv' | 'google-sheets'>('google-sheets');

  // --- GOOGLE SHEETS STATE ---
  const { data: settingsData } = useGoogleSheetsSettings();
  const { data: historyData } = useGoogleSheetsHistory();
  const { data: configStatus, isLoading: authStatusLoading } = useGoogleSheetsConfig();
  const updateSettings = useUpdateGoogleSheetsSettings();
  const executeSync = useExecuteGoogleSheetsSync();
  const fetchAuthUrl = useGoogleSheetsAuthUrl();

  const [gsResults, setGsResults] = useState<any>(null);
  const [authError, setAuthError] = useState('');

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [assignMethod, setAssignMethod] = useState('ROUND_ROBIN');

  useEffect(() => {
    if (settingsData) {
      setAssignMethod(settingsData.assignmentStrategy || 'ROUND_ROBIN');
    }
  }, [settingsData]);

  if (!isAdmin) {
    return <div className="p-6">You do not have permission to import leads.</div>;
  }

  // --- GOOGLE SHEETS LOGIC ---
  const handleInitiateSetup = async () => {
    try {
      setAuthError('');
      const url = await fetchAuthUrl.mutateAsync();
      if (url) {
        // Open the Google consent screen in a new window/tab for the admin to copy the token
        window.open(url, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Could not generate authentication link. Check server configuration.');
    }
  };

  const handleGsConfirm = async () => {
    try {
      setAuthError('');
      const res = await executeSync.mutateAsync({ 
        spreadsheetId: 'env', // Handled entirely in backend now
        worksheetName: 'env', // Handled entirely in backend now
        mapping: {} // Pre-configured in backend
      });
      setGsResults(res);
      queryClient.invalidateQueries({ queryKey: ['googleSheetsHistory'] });
    } catch (err: any) {
      setAuthError(err.response?.data?.message || 'Failed to execute sync');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">Import Leads</h1>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">Import via CSV or synchronize directly from Google Sheets.</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
             <button 
               onClick={() => setActiveTab('csv')}
               className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'csv' ? 'bg-white shadow text-[var(--color-primary)]' : 'text-gray-500'}`}
             >
                CSV Upload
             </button>
             <button 
               onClick={() => setActiveTab('google-sheets')}
               className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'google-sheets' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
             >
                <Table2 size={16} /> Google Sheets
             </button>
          </div>
      </div>

      {activeTab === 'google-sheets' && (
         <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col min-h-[400px]">
                  <div className="bg-gradient-to-r from-green-600 to-green-800 p-6 text-white flex justify-between items-center">
                     <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><Table2 size={24} /> Google Sheets Sync</h2>
                        <p className="text-green-100 text-sm mt-1">Automatically pull new leads and assign them to your team.</p>
                     </div>
                     <Button 
                       onClick={() => setShowSettings(!showSettings)} 
                       className="bg-white/20 hover:bg-white/30 text-white border-0"
                     >
                        <Settings size={18} className="mr-2" /> Settings
                     </Button>
                  </div>

                  {showSettings ? (
                      <div className="p-6 bg-gray-50 border-b border-[var(--color-border-subtle)] animate-fade-in">
                          <h3 className="font-bold text-[var(--color-text-primary)] mb-4">Sync Settings</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Strategy</label>
                                  <select 
                                    className="input w-full"
                                    value={assignMethod}
                                    onChange={(e) => {
                                        setAssignMethod(e.target.value);
                                        updateSettings.mutate({ assignmentStrategy: e.target.value });
                                    }}
                                  >
                                      <option value="ROUND_ROBIN">Round Robin</option>
                                      <option value="LEAST_ASSIGNED">Least Assigned Leads</option>
                                      <option value="MANUAL">Manual (No Auto-assign)</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto Sync Interval</label>
                                  <select className="input w-full" disabled>
                                      <option>Manual Only (Future feature)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  ) : null}

                  <div className="p-6 flex-grow flex flex-col justify-center">
                     {authError && (
                       <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-100 shadow-sm">
                          <AlertCircle size={20} className="mr-3 flex-shrink-0" /> 
                          <span className="text-sm font-medium">{authError}</span>
                       </div>
                     )}
                     
                     {authStatusLoading ? (
                        <div className="flex justify-center items-center py-12">
                           <RefreshCw className="animate-spin text-green-600" size={32} />
                        </div>
                     ) : !configStatus?.configured ? (
                        <div className="text-center py-8">
                             <div className="mx-auto bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                                 <AlertCircle size={24} className="text-orange-600" />
                             </div>
                             <h3 className="text-xl font-bold mb-2">Google Sheets Not Configured</h3>
                             
                             <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6 max-w-lg mx-auto">
                                <h4 className="font-bold text-sm text-gray-700 mb-3">Missing Environment Variables:</h4>
                                <ul className="space-y-2">
                                    {configStatus?.missingVariables?.map((v: any, i: number) => (
                                        <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                            <span className="mt-0.5">•</span>
                                            <span><strong>{v.name}</strong>: {v.error}</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>

                             {configStatus?.canSetupOAuth && !configStatus?.authConfigured && (
                                <div className="mt-8">
                                    <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">Client ID and Secret detected! Run the one-time authorization to generate a refresh token.</p>
                                    <Button onClick={handleInitiateSetup} className="bg-[#4285F4] hover:bg-[#3367d6] text-white">
                                        Run One-Time Google Authorization
                                    </Button>
                                </div>
                             )}
                        </div>
                     ) : !gsResults ? (
                         <div className="text-center py-12">
                            <div className="mx-auto bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-2xl font-black text-[var(--color-text-primary)] mb-3">Ready to Sync</h3>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto">Google Sheets integration is fully configured and ready. Click below to synchronize your leads.</p>
                            
                            <Button 
                                onClick={handleGsConfirm} 
                                disabled={executeSync.isPending}
                                className="bg-green-600 hover:bg-green-700 shadow-md h-14 px-8 text-lg w-full max-w-xs mx-auto"
                            >
                                {executeSync.isPending ? (
                                    <><RefreshCw className="animate-spin mr-2" size={20} /> Syncing...</>
                                ) : (
                                    <><RefreshCw size={20} className="mr-2" /> Sync Google Sheet</>
                                )}
                            </Button>
                         </div>
                     ) : (
                         <div className="text-center py-4 animate-fade-in">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="text-green-600" size={32} />
                            </div>
                            <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-1">Sync Completed</h2>
                            <p className="text-gray-500 text-sm mb-6">Successfully imported and assigned leads.</p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Found</p>
                                    <p className="text-2xl font-black">{gsResults.totalRows}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <p className="text-[10px] text-green-700 font-bold uppercase mb-1">New Leads</p>
                                    <p className="text-2xl font-black text-green-600">{gsResults.newLeads}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <p className="text-[10px] text-blue-700 font-bold uppercase mb-1">Updated</p>
                                    <p className="text-2xl font-black text-blue-600">{gsResults.updatedLeads || 0}</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                    <p className="text-[10px] text-indigo-700 font-bold uppercase mb-1">Assigned</p>
                                    <p className="text-2xl font-black text-indigo-600">{gsResults.assignedLeads}</p>
                                </div>
                            </div>

                            <Button onClick={() => setGsResults(null)} variant="outline" className="w-full max-w-xs">
                                Ready for Next Sync
                            </Button>
                         </div>
                     )}
                  </div>
               </Card>

               <div className="space-y-6">
                  {/* Status Card */}
                  <Card className="p-5">
                      <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2"><Activity size={18}/> Status</h3>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                              <span className="text-sm text-gray-600">Connection</span>
                              <Badge variant={configStatus?.configured ? 'success' : 'neutral'}>
                                  {configStatus?.configured ? 'Configured' : 'Not Configured'}
                              </Badge>
                          </div>
                          <div>
                              <span className="block text-sm text-gray-600 mb-1">Last Sync</span>
                              <span className="text-sm font-semibold">
                                  {historyData && historyData.length > 0 
                                    ? new Date(historyData[0].createdAt).toLocaleString() 
                                    : 'Never'}
                              </span>
                          </div>
                      </div>
                  </Card>
               </div>
            </div>

            {/* Sync History Table */}
            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-[var(--color-border-subtle)] bg-gray-50">
                    <h3 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><Clock size={18}/> Sync History</h3>
                </div>
                <TableContainer>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Worksheet</TableHead>
                                <TableHead>Total Rows</TableHead>
                                <TableHead className="text-green-700">New</TableHead>
                                <TableHead className="text-blue-700">Updated</TableHead>
                                <TableHead className="text-orange-700">Duplicates</TableHead>
                                <TableHead className="text-red-700">Invalid</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historyData?.map((h: any) => (
                                <TableRow key={h._id}>
                                    <TableCell className="whitespace-nowrap font-medium">{new Date(h.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{h.worksheetName}</TableCell>
                                    <TableCell className="font-mono">{h.totalRows}</TableCell>
                                    <TableCell className="font-mono text-green-600 font-bold">{h.newLeads}</TableCell>
                                    <TableCell className="font-mono text-blue-600 font-bold">{h.updatedLeads || 0}</TableCell>
                                    <TableCell className="font-mono text-orange-600">{h.duplicates}</TableCell>
                                    <TableCell className="font-mono text-red-600">{h.invalidRows}</TableCell>
                                    <TableCell>
                                        <Badge variant={h.status === 'Success' ? 'success' : 'error'}>{h.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!historyData || historyData.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center p-8 text-gray-500">No sync history available.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

         </div>
      )}
    </div>
  );
}
