import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Upload, FileText, CheckCircle, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function SalesImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'preview' | 'importing' | 'success'>('idle');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'paste' | 'csv'>('paste');
  const [pasteText, setPasteText] = useState('');
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [duplicateAction, setDuplicateAction] = useState('merge');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      let finalFile = file;
      if (activeTab === 'paste') {
          if (!pasteText.trim()) {
              setError('Please paste some contacts first');
              setStatus('idle');
              return;
          }
          
          const text = pasteText.trim();
          let csvContent = "Name,Phone,Email,InterestedDomain,College,Department,Year\n";
          
          if (/name\s*[:-]/i.test(text) || /phone\s*[:-]/i.test(text)) {
              // Handle Key-Value unstructured data (e.g. NAME :- John)
              const blocks = text.split(/\n\s*\n/);
              for (const block of blocks) {
                  if (!block.trim()) continue;
                  let name = '', phone = '', email = '', domain = '', college = '', department = '', year = '';
                  const lines = block.split('\n');
                  for (const line of lines) {
                      let match = line.match(/^(.*?)(?:\s*[:-]+\s*)(.*)$/);
                      if (!match) match = line.match(/^(.*?)(?:\s*[-]+\s*)(.*)$/);
                      if (match) {
                          const key = match[1].toLowerCase();
                          const val = match[2].trim().replace(/,/g, '');
                          if (key.includes('name')) name = val;
                          else if (key.includes('phone') || key.includes('mobile')) phone = val;
                          else if (key.includes('mail') || key.includes('email')) email = val;
                          else if (key.includes('domain') || key.includes('course')) domain = val;
                          else if (key.includes('college')) college = val;
                          else if (key.includes('department') || key.includes('dept')) department = val;
                          else if (key.includes('year')) year = val;
                      }
                  }
                  if (name || phone) {
                      csvContent += `${name},${phone},${email},${domain},${college},${department},${year}\n`;
                  }
              }
          } else {
              // Handle Tabular Data (TSV/CSV)
              const lines = text.split('\n');
              for (const line of lines) {
                  const cleaned = line.trim();
                  if (!cleaned || (cleaned.toLowerCase().includes('name') && cleaned.toLowerCase().includes('phone'))) continue;
                  
                  let parts = cleaned.split('\t');
                  if (parts.length < 2) parts = cleaned.split(',');
                  if (parts.length < 2) parts = cleaned.split(/\s{2,}/);
                  
                  const name = parts[0] ? parts[0].trim().replace(/,/g, '') : '';
                  const phone = parts[1] ? parts[1].trim().replace(/,/g, '') : '';
                  const email = parts[2] && parts[2].includes('@') ? parts[2].trim().replace(/,/g, '') : '';
                  let domain = '';
                  // If email was matched to parts[2], domain is parts[3], else domain could be parts[2]
                  if (email) {
                      domain = parts[3] ? parts[3].trim().replace(/,/g, '') : '';
                  } else {
                      domain = parts[2] ? parts[2].trim().replace(/,/g, '') : '';
                  }
                  
                  csvContent += `${name},${phone},${email},${domain},,, \n`;
              }
          }
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          finalFile = new File([blob], "pasted_contacts.csv", { type: "text/csv" });
      } else if (!finalFile) {
          setError('Please select a file');
          setStatus('idle');
          return;
      }

      const formData = new FormData();
      formData.append('file', finalFile);

      // Step 1: Parse
      const parseRes = await api.post('/leads/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Step 2: Auto-Preview with standard mapping
      const mapping = {
          studentName: 'studentName',
          phone: 'phone',
          email: 'email',
          college: 'college',
          department: 'department',
          year: 'year',
          interestedDomain: 'interestedDomain',
          salesStatus: 'salesStatus',
          studentResponse: 'studentResponse'
      };

      const previewRes = await api.post('/leads/import/preview', {
          rawId: parseRes.data.data.rawId,
          mapping
      });

      setPreviewData(previewRes.data.data);
      setStatus('preview');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error processing file');
      setStatus('idle');
    }
  };

  const handleConfirm = async () => {
    setStatus('importing');
    try {
      const res = await api.post('/leads/import/confirm', {
        previewId: previewData.previewId,
        duplicateAction
      });
      setStatus('success');
      setPreviewData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error importing data');
      setStatus('preview');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/sales')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Sales Contacts</h1>
          <p className="text-gray-500 text-sm">Upload a CSV file to add new contacts or update existing ones.</p>
        </div>
      </div>

      <Card className="p-6">
        {status === 'idle' || status === 'uploading' ? (
          <div>
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto mb-6 max-w-sm mx-auto">
                <button 
                onClick={() => setActiveTab('paste')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'paste' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                >
                Paste Contacts
                </button>
                <button 
                onClick={() => setActiveTab('csv')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'csv' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                >
                Upload CSV
                </button>
            </div>

            {activeTab === 'paste' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Paste contact data (Name, Phone, Domain)</label>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-4 min-h-[250px] font-mono text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder={`Rahul\t9876543210\tPython\nPriya\t9876543211\tAI`}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-2">Supports tab-separated (from Excel/WhatsApp), comma-separated, or multiple spaces.</p>
                </div>
            ) : (
                <div className="text-center">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:bg-gray-50 transition-colors">
                    <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 mb-2">Drag and drop your CSV file here, or click to browse</p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <span className="cursor-pointer bg-primary text-white inline-flex items-center justify-center px-4 py-2 rounded-md font-medium">Select File</span>
                    </label>
                    {file && <p className="mt-4 font-medium text-green-700 flex items-center justify-center gap-2"><FileText size={18}/> {file.name}</p>}
                    </div>
                </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center justify-center gap-2">
                <AlertCircle size={20} /> {error}
              </div>
            )}

            <div className="mt-6">
              <Button onClick={handleUpload} disabled={status === 'uploading'} className="w-full bg-green-600 hover:bg-green-700">
                {status === 'uploading' ? <RefreshCw className="animate-spin mr-2" /> : null}
                {status === 'uploading' ? 'Processing...' : 'Preview Contacts'}
              </Button>
            </div>
          </div>
        ) : status === 'preview' || status === 'importing' ? (
          <div>
             <h3 className="text-lg font-bold mb-4">Preview & Configuration</h3>
             
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
                   <p className="text-sm text-gray-500 font-bold uppercase mb-1">Total Rows</p>
                   <p className="text-2xl font-black">{previewData.totalRows}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                   <p className="text-sm text-green-700 font-bold uppercase mb-1">Valid Rows</p>
                   <p className="text-2xl font-black text-green-700">{previewData.validRowsCount}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                   <p className="text-sm text-orange-700 font-bold uppercase mb-1">Duplicates</p>
                   <p className="text-2xl font-black text-orange-700">{previewData.duplicatesSkipped}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                   <p className="text-sm text-red-700 font-bold uppercase mb-1">Invalid</p>
                   <p className="text-2xl font-black text-red-700">{previewData.invalidRows}</p>
                </div>
             </div>

             <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                 <label className="block text-sm font-bold text-gray-700 mb-2">How should we handle duplicates?</label>
                 <select 
                    value={duplicateAction} 
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                 >
                     <option value="merge">Merge (Update missing info only)</option>
                     <option value="overwrite">Overwrite (Replace all existing info with CSV data)</option>
                     <option value="skip">Skip (Do not update existing contacts)</option>
                 </select>
                 <p className="text-xs text-gray-500 mt-2">Duplicates are identified by phone number.</p>
             </div>

             {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                <AlertCircle size={20} /> {error}
              </div>
             )}

             <div className="flex gap-4">
                 <Button variant="outline" onClick={() => setStatus('idle')} className="flex-1">Cancel</Button>
                 <Button onClick={handleConfirm} disabled={status === 'importing'} className="flex-1 bg-green-600 hover:bg-green-700">
                    {status === 'importing' ? <RefreshCw className="animate-spin mr-2" /> : null}
                    Confirm Import
                 </Button>
             </div>
          </div>
        ) : (
          <div className="text-center py-8">
             <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                 <CheckCircle className="text-green-600" size={40} />
             </div>
             <h2 className="text-2xl font-black text-gray-900 mb-2">Import Successful!</h2>
             <p className="text-gray-600 mb-6">Your sales contacts have been imported and updated.</p>

             <div className="flex justify-center gap-6 mb-8">
                <div>
                   <p className="text-sm text-gray-500 uppercase font-bold">New Contacts</p>
                   <p className="text-3xl font-black text-green-600">{previewData.successfullyImported || 0}</p>
                </div>
                <div>
                   <p className="text-sm text-gray-500 uppercase font-bold">Updated</p>
                   <p className="text-3xl font-black text-blue-600">{previewData.successfullyUpdated || 0}</p>
                </div>
             </div>

             <Button onClick={() => navigate('/sales')} className="w-full sm:w-auto bg-primary text-white">Go to Sales Pipeline</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
