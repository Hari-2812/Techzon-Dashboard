import React, { useState } from 'react';
import { useMyAttendancePerformance } from '../hooks/usePerformance';
import moment from 'moment-timezone';
import { ChevronLeft, ChevronRight, Clock, CalendarCheck, AlertCircle, Briefcase, Activity } from 'lucide-react';

const MyPerformance = () => {
  const [monthCursor, setMonthCursor] = useState(moment().startOf('month'));
  
  const month = monthCursor.format('MM');
  const year = monthCursor.format('YYYY');

  const { data: perfData, isLoading, isError, refetch } = useMyAttendancePerformance(month, year);

  const handlePrevMonth = () => setMonthCursor(prev => prev.clone().subtract(1, 'month'));
  const handleNextMonth = () => setMonthCursor(prev => prev.clone().add(1, 'month'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Performance</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Track your attendance and working hours</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-[var(--color-border-subtle)] shadow-sm">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold min-w-[120px] text-center">{monthCursor.format('MMMM YYYY')}</span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500">Loading performance data...</div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center border border-red-100">
          <AlertCircle className="mx-auto mb-2" size={32} />
          <p className="font-semibold mb-2">Unable to load performance data.</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-700 transition">
            Retry
          </button>
        </div>
      ) : perfData ? (
        <div className="animate-fade-in space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Attendance Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{perfData.attendanceRate}%</p>
               </div>
               <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <Activity size={24} />
               </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">On-Time</p>
                  <p className="text-3xl font-bold text-[var(--color-primary)] mt-1">{perfData.onTimePercentage}%</p>
               </div>
               <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[var(--color-primary)]">
                  <CalendarCheck size={24} />
               </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Total Worked</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">{perfData.totalWorkedHours} <span className="text-lg text-gray-500 font-medium">hrs</span></p>
               </div>
               <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <Clock size={24} />
               </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Avg Daily Work</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{perfData.averageWorkedHours} <span className="text-lg text-gray-500 font-medium">hrs</span></p>
               </div>
               <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                  <Briefcase size={24} />
               </div>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="bg-white p-6 rounded-lg border border-[var(--color-border-subtle)] shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Attendance Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
               <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-gray-500 text-sm font-semibold mb-1">Working Days</div>
                  <div className="text-2xl font-bold text-gray-800">{perfData.workingDays}</div>
               </div>
               <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-green-600 text-sm font-semibold mb-1">Present</div>
                  <div className="text-2xl font-bold text-green-700">{perfData.present}</div>
               </div>
               <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="text-yellow-600 text-sm font-semibold mb-1">Late</div>
                  <div className="text-2xl font-bold text-yellow-700">{perfData.late}</div>
                  <div className="text-xs text-yellow-600 mt-1">{perfData.latePercentage}%</div>
               </div>
               <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="text-red-600 text-sm font-semibold mb-1">Absent</div>
                  <div className="text-2xl font-bold text-red-700">{perfData.absent}</div>
               </div>
               <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-purple-600 text-sm font-semibold mb-1">Leave</div>
                  <div className="text-2xl font-bold text-purple-700">{perfData.leave}</div>
               </div>
               <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-blue-600 text-sm font-semibold mb-1">Week Off</div>
                  <div className="text-2xl font-bold text-blue-700">{perfData.weekOff}</div>
               </div>
            </div>
          </div>
          
        </div>
      ) : null}
    </div>
  );
};

export default MyPerformance;
