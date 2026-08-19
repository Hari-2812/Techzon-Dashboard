import React, { useState, useEffect } from 'react';
import { useHolidays } from '../../hooks/useHolidays';
import { Modal } from './Modal';
import { Button } from './Button';
import socket from '../../services/socket';
import { useAuthStore } from '../../store/authStore';

export const HolidayPopup = () => {
  const { user } = useAuthStore();
  const { tomorrowHoliday, submitResponse, myResponses } = useHolidays();
  
  const [isOpen, setIsOpen] = useState(false);
  const [holiday, setHoliday] = useState<any>(null);
  
  const [step, setStep] = useState<'INITIAL' | 'LEAVE_FORM' | 'WORK_FORM'>('INITIAL');
  const [comment, setComment] = useState('');

  // Determine if employee already responded
  const hasResponded = myResponses?.some((r: any) => r.holidayId?._id === holiday?._id || r.holidayId === holiday?._id);

  useEffect(() => {
    // 1. Initial check on mount
    if (tomorrowHoliday?.isPast7PM && tomorrowHoliday?.data && !hasResponded) {
       setHoliday(tomorrowHoliday.data);
       setIsOpen(true);
    }
  }, [tomorrowHoliday, hasResponded]);

  useEffect(() => {
    // 2. Real-time socket trigger
    socket.on('holiday:tomorrow-alert', (data) => {
       if (!hasResponded) {
          setHoliday(data.holiday);
          setIsOpen(true);
          setStep('INITIAL');
       }
    });
    
    // Fallback for specific employee reminder
    socket.on(`holiday:reminder:${user?.id}`, (data) => {
       if (!hasResponded) {
          setHoliday(data.holiday);
          setIsOpen(true);
          setStep('INITIAL');
       }
    });

    return () => {
       socket.off('holiday:tomorrow-alert');
       socket.off(`holiday:reminder:${user?.id}`);
    };
  }, [hasResponded, user?.id]);

  const handleClose = () => {
     setIsOpen(false);
     setStep('INITIAL');
     setComment('');
  };

  const handleSubmit = async (responseType: 'TAKE_LEAVE' | 'WILL_WORK') => {
      try {
         await submitResponse.mutateAsync({
             holidayId: holiday._id,
             response: responseType,
             comment
         });
         handleClose();
      } catch (e: any) {
         alert(e.response?.data?.message || 'Error submitting response');
      }
  };

  if (hasResponded || !holiday) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Government Holiday Notice">
      <div className="text-center space-y-4">
        {step === 'INITIAL' && (
          <>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
               <p className="text-sm font-semibold text-blue-800 tracking-wide uppercase">Tomorrow is a Government Holiday</p>
               <h2 className="text-2xl font-bold text-blue-900 mt-2">{holiday.name}</h2>
               <p className="text-sm text-blue-700 mt-1">{new Date(holiday.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            
            <p className="text-[var(--color-text-secondary)]">The company would like to know whether you would like to avail the holiday.</p>
            <p className="font-semibold text-[var(--color-text-primary)]">Would you like to take leave tomorrow?</p>
            
            <div className="flex flex-col gap-3 mt-6">
              <Button onClick={() => setStep('LEAVE_FORM')} variant="primary" className="py-3 shadow-md">
                 Yes, Take Leave
              </Button>
              <Button onClick={() => setStep('WORK_FORM')} variant="outline" className="py-3">
                 No, I Will Work
              </Button>
            </div>
          </>
        )}

        {step === 'LEAVE_FORM' && (
          <div className="text-left space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Confirm Leave</h3>
            <p className="text-sm text-gray-600">You are requesting leave for <strong>{holiday.name}</strong> on {new Date(holiday.date).toLocaleDateString()}.</p>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Optional Comment</label>
               <textarea 
                  className="w-full border p-2 rounded-lg" 
                  placeholder="e.g., Personal work"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
               />
            </div>
            <div className="flex justify-end gap-3 mt-6">
               <Button variant="outline" onClick={() => setStep('INITIAL')}>Back</Button>
               <Button onClick={() => handleSubmit('TAKE_LEAVE')}>Confirm Leave</Button>
            </div>
          </div>
        )}

        {step === 'WORK_FORM' && (
          <div className="text-left space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Confirm Work</h3>
            <p className="text-sm text-gray-600">You have chosen to work on <strong>{holiday.name}</strong> on {new Date(holiday.date).toLocaleDateString()}.</p>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Optional Comment</label>
               <textarea 
                  className="w-full border p-2 rounded-lg" 
                  placeholder="e.g., Pending student follow-ups"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
               />
            </div>
            <div className="flex justify-end gap-3 mt-6">
               <Button variant="outline" onClick={() => setStep('INITIAL')}>Back</Button>
               <Button onClick={() => handleSubmit('WILL_WORK')}>Confirm Work</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
