import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Upload, FileText, CheckCircle, ArrowLeft, AlertCircle, RefreshCw, Trash2, Plus, Copy } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableContainer } from '../components/ui/Table';

interface SalesImportProps {
  embedded?: boolean;
  targetEmployeeId?: string;
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

export default function SalesImport({ embedded = false, targetEmployeeId, onSuccess }: SalesImportProps = {}) {
  const navigate = useNavigate();
  
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'importing' | 'success'>('idle');
  const [error, setError] = useState('');
  const [successStats, setSuccessStats] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize with empty rows
  useEffect(() => {
    if (rows.length === 0 && status === 'idle') {
      const initialRows = Array.from({ length: 5 }, () => createEmptyRow());
      setRows(initialRows);
    }
  }, []);

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
      phone: phoneClean, // normalize
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

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const clearEmptyRows = () => {
    setRows(prev => prev.filter(r => r.studentName.trim() || r.phone.trim() || r.email.trim() || r.collegeName.trim() || r.interestedDomain.trim()));
  };

  const parseMessyData = (text: string) => {
    const KNOWN_DOMAINS = ['Python', 'Java', 'Data Science', 'Full Stack Development', 'AI', 'Machine Learning', 'Web Development', 'Full Stack', 'Fullstack', 'MERN'];
    const newRows: LeadRow[] = [];

    // Helper to determine if a string looks like a phone number
    const extractPhoneMatch = (l: string) => {
      const clean = l.replace(/[^\d+]/g, '');
      if (clean.length >= 10 && clean.length <= 14 && /\d{10}/.test(clean)) return true;
      if (/phone|mobile/i.test(l) && /\d{10}/.test(l.replace(/[^\d]/g, ''))) return true;
      return false;
    };
    const hasPhone = (chunk: string[]) => chunk.some(extractPhoneMatch);

    let chunks: string[][] = [];
    let lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Chunking strategy
    if (text.includes('\n\n') || text.includes('\n\r\n')) {
      // If there are blank lines, use them as clear separators
      const blocks = text.split(/\n\s*\n/);
      chunks = blocks.map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length > 0);
    } else {
      // No blank lines, fallback to heuristic grouping based on phone numbers or single line formats
      let currentChunk: string[] = [];
      for (const line of lines) {
        if (line.includes('\t') || line.split(',').length > 3 || line.split('|').length > 3) {
           chunks.push([line]); // Single line contact
        } else {
           if (extractPhoneMatch(line) && hasPhone(currentChunk)) {
              // Found a new phone number while already having one -> start new contact
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
      // Expand single-line delimited formats
      if (items.length === 1) {
        const line = items[0];
        if (line.includes('\t')) items = line.split('\t').map(c => c.trim()).filter(Boolean);
        else if (line.includes('|')) items = line.split('|').map(c => c.trim()).filter(Boolean);
        else if (line.split(',').length > 3) items = line.split(',').map(c => c.trim()).filter(Boolean);
      } else {
         // Split items that are like "Name - 9876543210" 
         let newItems: string[] = [];
         items.forEach(item => {
            // Only split if it looks like a separator and not a hyphenated name or college
            if (item.includes(' - ') && !/college|university|institute/i.test(item)) {
               newItems.push(...item.split(' - ').map(s => s.trim()));
            } else if (item.includes(':-')) {
               // Handles "NAME :- John" if they weren't split properly
               newItems.push(item);
            } else {
               newItems.push(item);
            }
         });
         items = newItems.filter(Boolean);
      }

      items.forEach(item => {
        const lowerItem = item.toLowerCase();
        
        // 1. Explicit Labels
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

        // 2. Implicit Matching (Unlabeled)
        
        // Email
        if (!row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) {
          row.email = item.toLowerCase();
          return;
        }
        
        // Phone
        const phoneClean = item.replace(/[^\d+]/g, '');
        if (!row.phone && phoneClean.length >= 10 && phoneClean.length <= 14 && /\d{10}/.test(phoneClean)) {
          row.phone = phoneClean;
          return;
        }
        
        // Domain
        if (!row.interestedDomain && KNOWN_DOMAINS.some(d => lowerItem === d.toLowerCase() || lowerItem.includes(d.toLowerCase()))) {
          row.interestedDomain = item;
          return;
        }
        
        // College
        if (!row.collegeName && /college|university|institute|tech|engineering|academy/i.test(item)) {
          row.collegeName = item;
          return;
        }
        
        // Name (Fallback) - Assign the first remaining non-empty string that looks like a name
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.includes('\n') || text.includes('\t')) {
      e.preventDefault();
      const parsed = parseMessyData(text);
      if (parsed.length > 0) {
        setRows(prev => {
          const cleaned = prev.filter(r => r.studentName.trim() || r.phone.trim() || r.email.trim() || r.collegeName.trim() || r.interestedDomain.trim());
          return [...cleaned, ...parsed];
        });
      }
    }
  };

  const handleSaveAndAssign = async () => {
    setError('');
    
    const filledRows = rows.filter(r => r.studentName.trim() || r.phone.trim() || r.email.trim() || r.collegeName.trim() || r.interestedDomain.trim());
    
    if (filledRows.length === 0) {
      setError('The sheet is empty.');
      return;
    }

    const invalidCount = filledRows.filter(r => !r.isValid).length;
    if (invalidCount > 0) {
      setError(`There are ${invalidCount} invalid rows. Please ensure all leads have at least a Name and a valid Phone number.`);
      return;
    }

    setStatus('importing');

    const contactsToImport = filledRows.map(r => ({
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
      setStatus('idle');
    }
  };

  const handleReset = () => {
    setRows(Array.from({ length: 5 }, () => createEmptyRow()));
    setStatus('idle');
    setSuccessStats(null);
    setError('');
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.filter(r => (r.studentName || r.phone) && !r.isValid).length;

  return (
    <div className={embedded ? "" : "p-6 max-w-7xl mx-auto pb-24"}>
      {!embedded && (
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/sales')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Sheet</h1>
            <p className="text-gray-500 text-sm">Paste unordered contacts to automatically organize and assign them.</p>
          </div>
        </div>
      )}

      {status === 'success' ? (
        <Card className={embedded ? "p-4 border-0 shadow-none text-center py-12" : "p-12 text-center"}>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Leads Assigned Successfully!</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {successStats?.created} newly created, {successStats?.updated} updated, and {successStats?.duplicates} duplicates skipped.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleReset}>Import More</Button>
            {!embedded && <Button variant="outline" onClick={() => navigate('/sales')}>Go to Sales</Button>}
          </div>
        </Card>
      ) : (
        <Card className={embedded ? "border border-gray-200 shadow-sm" : "shadow-sm border border-gray-200"}>
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-800">Spreadsheet Importer</h3>
            </div>
            <div className="flex gap-2">
              <Badge variant="success">{validCount} Valid</Badge>
              {invalidCount > 0 && <Badge variant="error">{invalidCount} Invalid</Badge>}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div 
            className="overflow-x-auto" 
            ref={containerRef}
            onPaste={handlePaste}
          >
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="w-10 px-4 py-3 text-center text-gray-400 font-medium border-r border-gray-200">#</th>
                  <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Name *</th>
                  <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Phone *</th>
                  <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">College Name</th>
                  <th className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">Domain</th>
                  <th className="w-16 px-4 py-3 text-center font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 group">
                    <td className="px-2 py-2 text-center text-gray-400 border-r border-gray-100">{index + 1}</td>
                    <td className="p-0 border-r border-gray-100 relative">
                      <input 
                        type="text" 
                        value={row.studentName}
                        onChange={e => handleCellChange(row.id, 'studentName', e.target.value)}
                        placeholder="Name"
                        className="w-full h-full min-h-[40px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100 relative">
                      <input 
                        type="text" 
                        value={row.phone}
                        onChange={e => handleCellChange(row.id, 'phone', e.target.value)}
                        placeholder="Phone Number"
                        className={`w-full h-full min-h-[40px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent ${row.phone && !validateRow(row).phone.match(/^\d{10,14}$/) ? 'text-red-600 bg-red-50' : ''}`}
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100 relative">
                      <input 
                        type="text" 
                        value={row.email}
                        onChange={e => handleCellChange(row.id, 'email', e.target.value)}
                        placeholder="Email"
                        className="w-full h-full min-h-[40px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100 relative">
                      <input 
                        type="text" 
                        value={row.collegeName}
                        onChange={e => handleCellChange(row.id, 'collegeName', e.target.value)}
                        placeholder="College Name"
                        className="w-full h-full min-h-[40px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100 relative">
                      <input 
                        type="text" 
                        value={row.interestedDomain}
                        onChange={e => handleCellChange(row.id, 'interestedDomain', e.target.value)}
                        placeholder="Domain"
                        className="w-full h-full min-h-[40px] px-4 py-2 border-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-transparent"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button 
                        onClick={() => deleteRow(row.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100"
                        title="Delete Row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-xl">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addRow} className="flex items-center gap-1">
                <Plus size={16} /> Add Row
              </Button>
              <Button variant="outline" size="sm" onClick={clearEmptyRows} className="flex items-center gap-1">
                Clear Empty
              </Button>
            </div>
            
            <div className="flex gap-3 items-center">
              <span className="text-xs text-gray-500 mr-2 flex items-center gap-1 hidden sm:flex">
                <Copy size={14} /> You can paste data anywhere in the table
              </span>
              <Button 
                onClick={handleSaveAndAssign} 
                disabled={status === 'importing'}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {status === 'importing' ? 'Saving...' : 'Save & Assign Leads'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
