import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Upload, FileText, CheckCircle, ArrowRight, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

const EXPECTED_FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'college', label: 'College', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'department', label: 'Degree / Branch', required: false },
  { key: 'year', label: 'Year', required: false },
  { key: 'course', label: 'Course', required: false },
  { key: 'parentContactName', label: 'Parent / Contact Name', required: false },
  { key: 'parentContactPhone', label: 'Parent / Contact Phone', required: false }
];

export default function ImportLeads() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Parse Results
  const [rawId, setRawId] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  // Step 2: Preview Results
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Step 3: Final Results
  const [results, setResults] = useState<any>(null);

  if (!isAdmin) {
    return <div className="p-6">You do not have permission to import leads.</div>;
  }

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const guessMapping = (excelHeaders: string[]) => {
    const newMapping: Record<string, string> = {};
    excelHeaders.forEach(header => {
       const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
       
       if (clean.includes('studentname') || clean.includes('name') && !clean.includes('parent')) newMapping[header] = 'studentName';
       else if (clean.includes('phone') || clean.includes('mobile')) {
           if (clean.includes('parent')) newMapping[header] = 'parentContactPhone';
           else newMapping[header] = 'phone';
       }
       else if (clean.includes('email')) newMapping[header] = 'email';
       else if (clean.includes('college')) newMapping[header] = 'college';
       else if (clean.includes('degree') || clean.includes('branch') || clean.includes('dept') || clean.includes('department')) newMapping[header] = 'department';
       else if (clean.includes('year')) newMapping[header] = 'year';
       else if (clean.includes('course')) newMapping[header] = 'course';
       else if (clean.includes('parent') && clean.includes('name')) newMapping[header] = 'parentContactName';
       else if (clean.includes('parent')) newMapping[header] = 'parentContactName'; // fallback
    });
    return newMapping;
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/leads/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRawId(res.data.data.rawId);
      setHeaders(res.data.data.headers);
      setMapping(guessMapping(res.data.data.headers));
      setStep(2);
    } catch (err: any) {
      console.error(err);
      alert('Error during parse: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await api.post('/leads/import/preview', { rawId, mapping });
      setPreviewData(res.data.data);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      alert('Error during preview: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewData?.previewId) return;
    setLoading(true);
    
    try {
      const res = await api.post('/leads/import/confirm', { previewId: previewData.previewId });
      setResults(res.data.data);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      console.error(err);
      alert('Error during import: ' + (err.response?.data?.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-8">Import Student Leads</h1>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[var(--color-border-subtle)] -z-10 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-[var(--color-primary)] -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${(step - 1) * 33.33}%` }}></div>
        
        {[1, 2, 3, 4].map(s => (
           <div key={s} className={`flex flex-col items-center bg-[var(--color-surface-bg)] px-2 ${step >= s ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border-2 ${step >= s ? 'bg-[var(--color-primary-50)] border-[var(--color-primary)]' : 'bg-white border-[var(--color-border-subtle)]'}`}>
               {step > s ? <Check size={20} /> : s}
             </div>
             <span className="text-sm font-semibold">{['Upload', 'Map Columns', 'Verify', 'Complete'][s-1]}</span>
           </div>
        ))}
      </div>

      <Card className="p-8">
        {step === 1 && (
          <div className="text-center">
            <div className="border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-12 hover:bg-[var(--color-surface-light)] transition-colors">
              <Upload className="mx-auto text-[var(--color-text-muted)] mb-4" size={48} />
              <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">Upload CSV or XLSX file</h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">Ensure your file has headers like Student Name, Phone, College.</p>
              
              <input type="file" accept=".csv, .xlsx" id="file-upload" className="hidden" onChange={handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-sm inline-block transition-colors">
                Choose File
              </label>
              
              {file && (
                <div className="mt-6 flex items-center justify-center text-green-600 bg-green-50 p-3 rounded-lg inline-flex mx-auto border border-green-200">
                  <FileText className="mr-2" />
                  <span className="font-semibold">{file.name}</span>
                  <span className="ml-2 text-sm text-green-700/70">({Math.round(file.size / 1024)} KB)</span>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
              <Button 
                variant="primary"
                onClick={handleParse}
                disabled={!file || loading} 
                className="px-8 py-3 shadow-md"
              >
                {loading ? 'Processing...' : 'Continue'} <ArrowRight className="ml-2" size={18} />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
           <div>
             <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Map Excel Columns</h2>
             <p className="text-[var(--color-text-muted)] mb-6">We've attempted to auto-map your columns. Please verify and correct them below.</p>
             
             <TableContainer className="mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Excel Column</TableHead>
                      <TableHead>Maps To (CRM Field)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {headers.map(header => (
                        <TableRow key={header}>
                           <TableCell className="font-medium text-[var(--color-text-primary)]">{header}</TableCell>
                           <TableCell>
                              <select 
                                className="w-full p-2 border border-[var(--color-border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] bg-white"
                                value={mapping[header] || ''}
                                onChange={e => setMapping(prev => ({...prev, [header]: e.target.value}))}
                              >
                                 <option value="">-- Ignore Column --</option>
                                 {EXPECTED_FIELDS.map(f => (
                                    <option key={f.key} value={f.key}>{f.label} {f.required ? '*' : ''}</option>
                                 ))}
                              </select>
                           </TableCell>
                           <TableCell>
                              {mapping[header] ? (
                                 <Badge variant="success" className="flex w-fit items-center"><Check size={12} className="mr-1"/> Recognized</Badge>
                              ) : (
                                 <Badge variant="neutral">Ignored</Badge>
                              )}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
                </Table>
             </TableContainer>
             
             <div className="bg-[var(--color-surface-light)] p-4 rounded-xl border border-[var(--color-border-subtle)] mb-6 text-sm">
                <h4 className="font-bold mb-2">Required Fields:</h4>
                <div className="flex flex-wrap gap-2">
                   {EXPECTED_FIELDS.filter(f => f.required).map(f => {
                      const isMapped = Object.values(mapping).includes(f.key);
                      return (
                         <span key={f.key} className={`px-2 py-1 rounded-md border ${isMapped ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700 flex items-center'}`}>
                            {!isMapped && <AlertCircle size={12} className="mr-1" />}
                            {f.label}
                         </span>
                      )
                   })}
                </div>
             </div>

             <div className="flex justify-between mt-8">
               <Button variant="outline" onClick={() => setStep(1)} className="px-6 py-2">
                 <ArrowLeft className="mr-2" size={18} /> Back
               </Button>
               <Button 
                 variant="primary"
                 onClick={handlePreview}
                 disabled={loading || !EXPECTED_FIELDS.filter(f => f.required).every(f => Object.values(mapping).includes(f.key))}
                 className="px-8 py-3 shadow-md"
               >
                 {loading ? 'Validating...' : 'Validate Data'} <ArrowRight className="ml-2" size={18} />
               </Button>
             </div>
           </div>
        )}

        {step === 3 && previewData && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Validation Preview</h2>
            <div className="bg-[var(--color-surface-light)] p-6 rounded-xl border border-[var(--color-border-subtle)] mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                   <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Total Rows</p>
                   <p className="font-black text-2xl text-[var(--color-text-primary)]">{previewData.totalRows}</p>
                </div>
                <div>
                   <p className="text-xs text-green-700 uppercase tracking-wider font-semibold">Valid Leads</p>
                   <p className="font-black text-2xl text-green-600">{previewData.validRowsCount}</p>
                </div>
                <div>
                   <p className="text-xs text-orange-700 uppercase tracking-wider font-semibold">Duplicates</p>
                   <p className="font-black text-2xl text-orange-600">{previewData.duplicatesSkipped}</p>
                </div>
                <div>
                   <p className="text-xs text-red-700 uppercase tracking-wider font-semibold">Invalid</p>
                   <p className="font-black text-2xl text-red-600">{previewData.invalidRows}</p>
                </div>
              </div>
              
              {previewData.assignmentPreview && previewData.assignmentPreview.length > 0 && (
                <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]">
                  <h4 className="font-bold text-sm mb-3 uppercase text-[var(--color-text-muted)]">Proposed Auto-Assignment (Round-Robin)</h4>
                  <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {previewData.assignmentPreview.map((emp: any, i: number) => (
                        <li key={i} className="bg-white px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg text-sm flex justify-between items-center shadow-sm">
                           <span className="font-bold text-[var(--color-text-primary)]">{emp.name}</span>
                           <span className="font-mono bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-2.5 py-0.5 rounded-full text-xs font-bold">{emp.count}</span>
                        </li>
                     ))}
                  </ul>
                </div>
              )}
            </div>

            {previewData.invalidDetails && previewData.invalidDetails.length > 0 && (
               <div className="mb-6">
                  <h4 className="font-bold text-sm mb-3 text-[var(--color-text-primary)] flex items-center">
                     <AlertCircle size={16} className="text-red-600 mr-2" /> Invalid Rows Log (Top 100)
                  </h4>
                  <TableContainer className="max-h-64 overflow-y-auto">
                     <Table>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Name / Phone</TableHead>
                              <TableHead>Reason</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {previewData.invalidDetails.map((det: any, i: number) => (
                              <TableRow key={i}>
                                 <TableCell className="font-mono">{det.row}</TableCell>
                                 <TableCell>{det.data.studentName || 'N/A'} / {det.data.phone || 'N/A'}</TableCell>
                                 <TableCell className="text-red-600 text-xs font-medium">{det.reason}</TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </TableContainer>
               </div>
            )}
            
            <div className="flex justify-between mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
              <Button variant="outline" onClick={() => setStep(2)} className="px-6 py-2">
                <ArrowLeft className="mr-2" size={18} /> Back to Mapping
              </Button>
              <Button 
                variant="primary"
                onClick={handleConfirm}
                disabled={loading || previewData.validRowsCount === 0}
                className="px-8 py-3 shadow-md"
              >
                {loading ? 'Importing...' : `Import & Assign ${previewData.validRowsCount} Leads`}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && results && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto text-green-500 mb-6" size={72} />
            <h2 className="text-3xl font-black text-[var(--color-text-primary)] mb-2">Import Complete</h2>
            <p className="text-[var(--color-text-muted)]">Your leads have been successfully imported and assigned.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 mb-10 max-w-sm mx-auto">
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Successfully Imported</p>
                <p className="text-3xl font-black text-green-600 mt-1">{results.successfullyImported}</p>
              </div>
              <div className="bg-[var(--color-surface-light)] p-4 rounded-xl border border-[var(--color-border-subtle)]">
                <p className="text-xs text-[var(--color-text-muted)] font-bold uppercase tracking-wider">Batch ID</p>
                <p className="text-sm font-mono text-[var(--color-text-primary)] font-bold mt-2 truncate" title={results.importBatchId}>{results.importBatchId}</p>
              </div>
            </div>

            <Button variant="primary" onClick={() => navigate('/leads')} className="px-8 py-3 shadow-md">
              View Leads
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
