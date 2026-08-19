import React, { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Play, Pause, Square } from 'lucide-react';
import { useAttendance } from '../../hooks/useAttendance';
import moment from 'moment-timezone';

const REASON_OPTIONS = [
  'Lunch', 'Tea / Coffee', 'Personal Work', 'Client Discussion', 
  'Internal Meeting', 'Technical Issue', 'Training', 'Official Work', 'Other'
];

interface AttendanceControlsProps {
  layout?: 'dashboard' | 'topbar' | 'full';
}

export const AttendanceControls: React.FC<AttendanceControlsProps> = ({ layout = 'full' }) => {
  const attendance = useAttendance();

  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakReason, setBreakReason] = useState(REASON_OPTIONS[0]);
  const [breakComment, setBreakComment] = useState('');
  
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeComment, setResumeComment] = useState('');

  // Protect against no user/admin
  if (attendance.isLoading || !attendance.data) return null;

  const { isClockedIn, isOnBreak, activeBreak, isCompleted } = attendance;

  const handleStartBreak = async () => {
    if (breakReason === 'Other' && !breakComment.trim()) {
      alert("Comment is mandatory when reason is 'Other'");
      return;
    }
    await attendance.startBreak.mutateAsync({ reason: breakReason, comment: breakComment }).catch(e => alert(e.response?.data?.message || 'Error'));
    setIsBreakModalOpen(false);
    setBreakReason(REASON_OPTIONS[0]);
    setBreakComment('');
  };

  const handleResumeWork = async () => {
    await attendance.endBreak.mutateAsync({ resumeComment }).catch(e => alert(e.response?.data?.message || 'Error'));
    setIsResumeModalOpen(false);
    setResumeComment('');
  };

  const isPending = attendance.clockIn.isPending || attendance.clockOut.isPending || attendance.startBreak.isPending || attendance.endBreak.isPending;

  // Render logic based on layout
  const renderButtons = () => {
    if (!isClockedIn && !isCompleted) {
      return (
        <Button 
          fullWidth={layout === 'dashboard' || layout === 'full'} 
          size={layout === 'topbar' ? 'sm' : 'md'}
          variant="primary" 
          onClick={() => attendance.clockIn.mutateAsync(false).catch(e => alert(e.response?.data?.message || 'Error'))} 
          disabled={isPending}
          className={layout !== 'topbar' ? "py-3 shadow-md" : ""}
        >
          <Play className="mr-2" size={layout === 'topbar' ? 14 : 18} /> {isPending ? 'Processing...' : 'CLOCK IN'}
        </Button>
      );
    }

    if (isCompleted) {
       return null; // Don't show action buttons if completed
    }

    if (layout === 'topbar') {
      return (
        <div className="flex gap-2">
           <Button size="sm" variant={isOnBreak ? 'primary' : 'outline'} onClick={() => isOnBreak ? setIsResumeModalOpen(true) : setIsBreakModalOpen(true)} disabled={isPending}>
             {isOnBreak ? 'Resume Work' : 'Take Break'}
           </Button>
           <Button size="sm" variant="danger" onClick={() => {
              if (isOnBreak) { alert("You are currently on a break. Please resume work before clocking out."); return; }
              if (window.confirm("Are you sure you want to end your work session?")) {
                attendance.clockOut.mutateAsync().catch(e => alert(e.response?.data?.message || 'Error'));
              }
           }} disabled={isPending}>
             Clock Out
           </Button>
        </div>
      )
    }

    return (
      <div className={`space-y-3 ${layout === 'dashboard' ? 'flex flex-col sm:flex-row sm:space-y-0 sm:gap-3' : 'w-full'}`}>
        {layout !== 'dashboard' && (
          <Button 
            fullWidth 
            variant="outline" 
            className="py-3 border-2 border-red-600 text-red-600 hover:bg-red-50" 
            disabled={isPending}
            onClick={() => {
              if (isOnBreak) {
                  alert("You are currently on a break. Please resume work before clocking out.");
                  return;
              }
              if (window.confirm("Are you sure you want to end your work session?")) {
                attendance.clockOut.mutateAsync().catch(e => alert(e.response?.data?.message || 'Error'));
              }
            }}
          >
            <Square className="mr-2" size={18} /> {isPending ? 'Processing...' : 'CLOCK OUT'}
          </Button>
        )}
        
        <Button 
          fullWidth={layout !== 'dashboard'} 
          variant={layout === 'dashboard' && !isOnBreak ? 'outline' : 'primary'}
          className={layout === 'dashboard' ? "px-6 py-2.5" : "py-3 shadow-md"}
          disabled={isPending}
          onClick={() => {
              if (isOnBreak) setIsResumeModalOpen(true);
              else setIsBreakModalOpen(true);
          }}
        >
          {isOnBreak ? <><Play className="mr-2" size={18} /> {isPending ? 'Processing...' : 'RESUME WORK'}</> : <><Pause className="mr-2" size={18} /> {isPending ? 'Processing...' : 'TAKE BREAK'}</>}
        </Button>
        
        {layout === 'dashboard' && (
           <Button 
             variant="danger" 
             className="px-6 py-2.5" 
             disabled={isPending}
             onClick={() => {
               if (isOnBreak) {
                   alert("You are currently on a break. Please resume work before clocking out.");
                   return;
               }
               if (window.confirm("Are you sure you want to end your work session?")) {
                  attendance.clockOut.mutateAsync().catch(e => alert(e.response?.data?.message || 'Error'));
               }
             }}
           >
             {isPending ? 'Processing...' : 'CLOCK OUT'}
           </Button>
        )}
      </div>
    );
  };

  let activeBreakDuration = '0m';
  if (activeBreak) {
    const diff = moment().diff(moment(activeBreak.startAt), 'minutes');
    activeBreakDuration = `${diff}m`;
  }

  return (
    <>
      {renderButtons()}

      {/* Break Modal */}
      <Modal isOpen={isBreakModalOpen} onClose={() => !isPending && setIsBreakModalOpen(false)} title="Take a Break">
        <div className="space-y-4 text-left">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Purpose</label>
                <select 
                    value={breakReason}
                    onChange={(e) => setBreakReason(e.target.value)}
                    disabled={isPending}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                >
                    {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment {breakReason === 'Other' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                    value={breakComment}
                    onChange={(e) => setBreakComment(e.target.value)}
                    placeholder="Explain the reason for this break..."
                    disabled={isPending}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                />
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsBreakModalOpen(false)} disabled={isPending}>Cancel</Button>
                <Button variant="primary" onClick={handleStartBreak} disabled={isPending}>{isPending ? 'Processing...' : 'Confirm Break'}</Button>
            </div>
        </div>
      </Modal>

      {/* Resume Modal */}
      <Modal isOpen={isResumeModalOpen} onClose={() => !isPending && setIsResumeModalOpen(false)} title="Resume Work">
        {activeBreak && (
            <div className="space-y-4 text-left">
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg space-y-2 mb-4 text-sm text-orange-900">
                    <div><strong>Break Reason:</strong> {activeBreak.reason}</div>
                    <div><strong>Break Duration:</strong> {activeBreakDuration}</div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resume Comment (Optional)</label>
                    <textarea
                        value={resumeComment}
                        onChange={(e) => setResumeComment(e.target.value)}
                        placeholder="e.g. Client discussion completed."
                        disabled={isPending}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none"
                    />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsResumeModalOpen(false)} disabled={isPending}>Cancel</Button>
                    <Button variant="primary" onClick={handleResumeWork} disabled={isPending}>{isPending ? 'Processing...' : 'Resume Work'}</Button>
                </div>
            </div>
        )}
      </Modal>
    </>
  );
};
