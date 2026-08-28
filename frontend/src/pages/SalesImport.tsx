import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Upload, FileText, CheckCircle, ArrowLeft, AlertCircle, RefreshCw, Trash2, Plus, Copy, ListChecks } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface SalesImportProps {
  embedded?: boolean;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  onSuccess?: () => void;
}

interface LeadRow {
  id: string;
  studentName: string;
  phone: string;
  email: string;
  collegeName: string;
  interestedDomain: string;
  isValid: boolean;
  isDuplicate: boolean;
}

export default function SalesImport({ embedded = false, targetEmployeeId, targetEmployeeName, onSuccess }: SalesImportProps = {}) {
  const navigate = useNavigate();
  
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [status, setStatus] = useState<'input' | 'preview' | 'importing' | 'success'>('input');
  const [error, setError] = useState('');
  const [successStats, setSuccessStats] = useState<any>(null);

  const createEmptyRow = (): LeadRow => ({
    id: Math.random().toString(36).substring(7),
    studentName: '',
    phone: '',
    email: '',
    collegeName: '',
    interestedDomain: '',
    isValid: false,
    isDuplicate: false
  });

  const validateRow = (row: LeadRow): LeadRow => {
    const phoneClean = row.phone.replace(/[^\d+]/g, '');
    const hasValidPhone = (phoneClean.length >= 10 && phoneClean.length <= 14);
    const hasName = row.studentName.trim().length > 0;
    
    return {
      ...row,
      phone: phoneClean,
      isValid: hasValidPhone && hasName
    };
  };

  const handleCellChange = (id: string, field: keyof LeadRow, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        return validateRow({ ...row, [field]: value });
      }
      return row;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const removeSelected = () => {
    setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  const clearAll = () => {
    setRows([]);
    setSelectedIds(new Set());
    setStatus('input');
    setRawText('');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const parseMessyData = (text: string) => {
    const KNOWN_DOMAINS = ['Python', 'Java', 'Data Science', 'Full Stack Development', 'AI', 'Machine Learning', 'Web Development', 'Full Stack', 'Fullstack', 'MERN'];
    const newRows: LeadRow[] = [];

    const extractPhoneMatch = (l: string) => {
      const clean = l.replace(/[^\d+]/g, '');
      if (clean.length >= 10 && clean.length <= 14 && /\d{10}/.test(clean)) return true;
      if (/phone|mobile/i.test(l) && /\d{10}/.test(l.replace(/[^\d]/g, ''))) return true;
      return false;
    };
    const hasPhone = (chunk: string[]) => chunk.some(extractPhoneMatch);

    let chunks: string[][] = [];
    let lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    if (text.includes('\n\n') || text.includes('\n\r\n')) {
      const blocks = text.split(/\n\s*\n/);
      chunks = blocks.map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length > 0);
    } else {
      let currentChunk: string[] = [];
      for (const line of lines) {
        if (line.includes('\t') || line.split(',').length > 3 || line.split('|').length > 3) {
           chunks.push([line]);
        } else {
           if (extractPhoneMatch(line) && hasPhone(currentChunk)) {
              chunks.push([...currentChunk]);
              currentChunk = [line];
           } else {
              currentChunk.push(line);
           }
        }
      }
      if (currentChunk.length > 0) chunks.push(currentChunk);
    }

    chunks.forEach(chunk => {
      const row = createEmptyRow();
      
      let items = [...chunk];
      if (items.length === 1) {
        const line = items[0];
        if (line.includes('\t')) items = line.split('\t').map(c => c.trim()).filter(Boolean);
        else if (line.includes('|')) items = line.split('|').map(c => c.trim()).filter(Boolean);
        else if (line.split(',').length > 3) items = line.split(',').map(c => c.trim()).filter(Boolean);
      } else {
         let newItems: string[] = [];
         items.forEach(item => {
            if (item.includes(' - ') && !/college|university|institute/i.test(item)) {
               newItems.push(...item.split(' - ').map(s => s.trim()));
            } else if (item.includes(':-')) {
               newItems.push(item);
            } else {
               newItems.push(item);
            }
         });
         items = newItems.filter(Boolean);
      }

      items.forEach(item => {
        const lowerItem = item.toLowerCase();
        
        if (/^name\s*[:-]*\s*/i.test(item)) {
          row.studentName = item.replace(/^name\s*[:-]*\s*/i, '').trim();
          return;
        }
        if (/^(phone|mobile)\s*[:-]*\s*/i.test(item)) {
          row.phone = item.replace(/^(phone|mobile)\s*[:-]*\s*/i, '').replace(/[^\d+]/g, '').trim();
          return;
        }
        if (/^(email|mail)\s*[:-]*\s*/i.test(item)) {
          row.email = item.replace(/^(email|mail)\s*[:-]*\s*/i, '').trim();
          return;
        }
        if (/^college( name)?\s*[:-]*\s*/i.test(item)) {
          row.collegeName = item.replace(/^college( name)?\s*[:-]*\s*/i, '').trim();
          return;
        }
        if (/^(domain|course)\s*[:-]*\s*/i.test(item)) {
          row.interestedDomain = item.replace(/^(domain|course)\s*[:-]*\s*/i, '').trim();
          return;
        }

        if (!row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) {
          row.email = item.toLowerCase();
          return;
        }
        
        const phoneClean = item.replace(/[^\d+]/g, '');
        if (!row.phone && phoneClean.length >= 10 && phoneClean.length <= 14 && /\d{10}/.test(phoneClean)) {
          row.phone = phoneClean;
          return;
        }
        
        if (!row.interestedDomain && KNOWN_DOMAINS.some(d => lowerItem === d.toLowerCase() || lowerItem.includes(d.toLowerCase()))) {
          row.interestedDomain = item;
          return;
        }
        
        if (!row.collegeName && /college|university|institute|tech|engineering|academy/i.test(item)) {
          row.collegeName = item;
          return;
        }
        
        if (!row.studentName && item.length > 2 && !/^\d+$/.test(item)) {
          row.studentName = item;
        }
      });
      
      if (row.studentName || row.phone || row.email || row.collegeName || row.interestedDomain) {
        newRows.push(validateRow(row));
      }
    });

    return newRows;
  };

  const handleParse = () => {
    if (!rawText.trim()) return;
    const parsed = parseMessyData(rawText);
    setRows(parsed);
    setSelectedIds(new Set());
    setStatus('preview');
  };

  const handleSaveAndAssign = async () => {
    setError('');
    
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError('There are no valid contacts to import. Please correct the highlighted errors.');
      return;
    }

    setStatus('importing');

    const contactsToImport = validRows.map(r => ({
      studentName: r.studentName,
      phone: r.phone,
      email: r.email,
      collegeName: r.collegeName,
      interestedDomain: r.interestedDomain
    }));

    try {
      const res = await api.post('/sales/employee-contacts', { 
        contacts: contactsToImport,
        targetEmployeeId 
      });
      
      setStatus('success');
      setSuccessStats({
        created: res.data.created,
        updated: res.data.updated,
        duplicates: res.data.duplicates,
        failed: res.data.failed
      });
      
      if (onSuccess) onSuccess();
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving leads');
      setStatus('preview');
    }
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.filter(r => !r.isValid).length;
  const hasSelected = selectedIds.size > 0;

  return (
    <div className={embedded ? "" : "p-6 max-w-7xl mx-auto pb-24"}>
      {!embedded && (
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button onClick={() => navigate('/sales')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BULK ADD LEADS</h1>
            <p className="text-gray-500 text-sm">Paste unstructured contacts to automatically detect and assign them.</p>
          </div>
        </div>
      )}

      {status === 'success' ? (
        <Card className={embedded ? "p-4 border-0 shadow-none text-center py-12" : "p-12 text-center"}>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Successfully added {successStats?.created + successStats?.updated} leads {targetEmployeeName ? `and assigned them to ${targetEmployeeName}` : 'and assigned them'}.
          </h2>
          <div className="flex flex-col items-center gap-2 mb-6 text-gray-600 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-4 flex-wrap">
               <span className="font-medium text-green-600">Added: {successStats?.created}</span>
               <span className="font-medium text-blue-600">Updated: {successStats?.updated}</span>
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap">
               <span className="font-medium text-orange-600">Duplicates (Skipped): {successStats?.duplicates}</span>
               {successStats?.failed > 0 && <span className="font-medium text-red-600">Failed: {successStats?.failed}</span>}
            </div>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button onClick={clearAll}>Import More</Button>
            {!embedded && <Button variant="outline" onClick={() => navigate('/sales')}>Go to Sales</Button>}
          </div>
        </Card>
      ) : (
        <Card className={embedded ? "border border-gray-200 shadow-sm" : "shadow-sm border border-gray-200"}>
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50 rounded-t-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <ListChecks className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-800 uppercase tracking-wider text-sm">BULK ADD LEADS</h3>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3 flex-wrap">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {status === 'input' && (
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste your lead data here...</label>
              <textarea 
                className="w-full min-h-[300px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono shadow-sm"
                placeholder="John Peter\n9876543210\njohn@gmail.com\nABC College\nPython\n\nPriya Kumar\n9876543211\npriya@gmail.com\nXYZ College\nData Science"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleParse} 
                  disabled={!rawText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Parse Contacts
                </Button>
              </div>
            </div>
          )}

          {(status === 'preview' || status === 'importing') && (
            <>
              <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Contacts detected: <span className="font-bold">{rows.length}</span></span>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="success">{validCount} Valid</Badge>
                    {invalidCount > 0 && <Badge variant="error">{invalidCount} Invalid</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1 h-9 flex-wrap">
                    <Plus size={16} /> Add Contact
                  </Button>
                  {hasSelected && (
                    <Button variant="outline" size="sm" onClick={removeSelected} className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50 h-9 flex-wrap">
                      <Trash2 size={16} /> Remove Selected
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={clearAll} className="flex items-center gap-1 h-9 flex-wrap">
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="overflow-x-auto w-full"><table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="w-12 px-4 py-3 text-center border-r border-gray-200">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={rows.length > 0 && selectedIds.size === rows.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Name *</th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Phone *</th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">College Name</th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Domain</th>
                      <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Status</th>
                      <th className="w-20 px-4 py-3 text-center font-medium text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-gray-500">No contacts to display.</td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50/50 group ${selectedIds.has(row.id) ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-4 py-2 text-center border-r border-gray-100">
                            <input 
                              type="checkbox"
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleSelect(row.id)}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <input 
                              type="text" 
                              value={row.studentName}
                              onChange={e => handleCellChange(row.id, 'studentName', e.target.value)}
                              placeholder="Name"
                              className={`w-full h-full min-h-[44px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent ${!row.studentName ? 'bg-red-50' : ''}`}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <input 
                              type="text" 
                              value={row.phone}
                              onChange={e => handleCellChange(row.id, 'phone', e.target.value)}
                              placeholder="Phone"
                              className={`w-full h-full min-h-[44px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent ${!row.phone.match(/^\d{10,14}$/) ? 'text-red-600 bg-red-50' : ''}`}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <input 
                              type="text" 
                              value={row.email}
                              onChange={e => handleCellChange(row.id, 'email', e.target.value)}
                              placeholder="Email"
                              className="w-full h-full min-h-[44px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <input 
                              type="text" 
                              value={row.collegeName}
                              onChange={e => handleCellChange(row.id, 'collegeName', e.target.value)}
                              placeholder="College"
                              className="w-full h-full min-h-[44px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <input 
                              type="text" 
                              value={row.interestedDomain}
                              onChange={e => handleCellChange(row.id, 'interestedDomain', e.target.value)}
                              placeholder="Domain"
                              className="w-full h-full min-h-[44px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-100">
                            {row.isValid ? (
                              <Badge variant="success">VALID</Badge>
                            ) : (
                              <Badge variant="error">
                                {!row.studentName ? 'MISSING NAME' : 'INVALID PHONE'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button 
                              onClick={() => removeRow(row.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded hover:bg-red-50 inline-flex"
                              title="Remove Contact"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table></div>
              </div>

              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-xl">
                <Button variant="outline" onClick={() => setStatus('input')}>
                  Back to Paste
                </Button>
                <div className="flex gap-3 items-center flex-wrap">
                  <Button 
                    onClick={handleSaveAndAssign} 
                    disabled={status === 'importing' || validCount === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {status === 'importing' ? 'Processing...' : 'Add Leads & Assign'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
