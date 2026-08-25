import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface AddCRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCRModal = ({ isOpen, onClose }: AddCRModalProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    crName: '',
    phone: '',
    college: '',
    department: '',
    year: ''
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/crs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crs'] });
      onClose();
      setFormData({ crName: '', phone: '', college: '', department: '', year: '' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New CR">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CR Name *</label>
          <Input 
            required 
            value={formData.crName}
            onChange={e => setFormData({ ...formData, crName: e.target.value })}
            placeholder="Enter CR name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <Input 
            required 
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
          <Input 
            required 
            value={formData.college}
            onChange={e => setFormData({ ...formData, college: e.target.value })}
            placeholder="Enter college name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <Input 
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. CSE"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <Input 
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: e.target.value })}
                placeholder="e.g. 3rd Year"
            />
            </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Add CR</Button>
        </div>
      </form>
    </Modal>
  );
};
