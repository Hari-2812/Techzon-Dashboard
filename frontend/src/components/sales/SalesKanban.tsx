import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Badge } from '../ui/Badge';
import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
    'New Lead', 'Contacted', 'Interested', 'Follow-up', 'Counseling', 'Course Discussion', 'Payment Pending'
]; 
const ALL_STAGES = [...PIPELINE_STAGES, 'Converted', 'Lost'];

export const SalesKanban = ({ leads }: { leads: any[] }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Group leads by stage
    const [columns, setColumns] = useState<Record<string, any[]>>({});

    useEffect(() => {
        const newCols: Record<string, any[]> = {};
        ALL_STAGES.forEach(stage => {
            newCols[stage] = leads?.filter(l => l.salesStatus === stage) || [];
        });
        
        // Group remaining leads into 'New Lead' if they have an old status
        leads?.forEach(l => {
            if (!ALL_STAGES.includes(l.salesStatus)) {
                newCols['New Lead'] = [...(newCols['New Lead'] || []), l];
            }
        });
        setColumns(newCols);
    }, [leads]);

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, stage }: { id: string, stage: string }) => {
            await api.patch(`/sales/${id}/stage`, { salesStatus: stage });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });
        }
    });

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId) return; // Same column

        // Optimistic UI update
        const sourceCol = [...(columns[source.droppableId] || [])];
        const destCol = [...(columns[destination.droppableId] || [])];
        const [movedItem] = sourceCol.splice(source.index, 1);
        movedItem.salesStatus = destination.droppableId;
        destCol.splice(destination.index, 0, movedItem);

        setColumns({
            ...columns,
            [source.droppableId]: sourceCol,
            [destination.droppableId]: destCol
        });

        updateStageMutation.mutate({ id: draggableId, stage: destination.droppableId });
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4 overflow-x-auto pb-4 min-h-[600px] select-none">
                {PIPELINE_STAGES.map((stage) => (
                    <div key={stage} className="bg-gray-100 rounded-lg w-80 flex-shrink-0 flex flex-col max-h-full">
                        <div className="p-3 bg-gray-200 font-bold text-gray-700 rounded-t-lg flex justify-between items-center">
                            <span>{stage}</span>
                            <Badge variant="neutral">{columns[stage]?.length || 0}</Badge>
                        </div>
                        <Droppable droppableId={stage}>
                            {(provided) => (
                                <div 
                                    {...provided.droppableProps} 
                                    ref={provided.innerRef}
                                    className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[150px]"
                                >
                                    {columns[stage]?.map((lead, index) => (
                                        <Draggable key={lead._id} draggableId={lead._id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab ${snapshot.isDragging ? 'shadow-lg border-primary ring-2 ring-primary ring-opacity-50 z-50' : 'hover:border-primary-300'}`}
                                                    onClick={(e) => {
                                                        // Prevent navigation if we are dragging
                                                        if (e.defaultPrevented) return;
                                                        navigate(`/sales/${lead._id}`);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-800 truncate pr-2">{lead.studentName}</h4>
                                                        <Badge variant={lead.priority === 'HIGH' ? 'error' : lead.priority === 'MEDIUM' ? 'warning' : 'neutral'}>{lead.priority}</Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-2 truncate">{lead.interestedDomain || lead.department || 'N/A'}</p>
                                                    
                                                    {lead.nextFollowUp && (
                                                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                                                            <span>Follow-up:</span>
                                                            <span className={new Date(lead.nextFollowUp) < new Date() ? 'text-red-500 font-bold' : ''}>
                                                                {new Date(lead.nextFollowUp).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
};
