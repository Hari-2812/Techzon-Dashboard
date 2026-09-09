import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Phone, Edit, CalendarClock } from 'lucide-react';
import moment from 'moment-timezone';

const PIPELINE_STAGES = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested'];
// Mappings for older string versions if they exist
const normalizeStage = (status: string) => {
    if (!status) return 'New';
    const s = status.toLowerCase();
    if (s.includes('not contacted') || s === 'new') return 'New';
    if (s.includes('converted')) return 'Converted';
    if (s.includes('interested') && !s.includes('not')) return 'Interested';
    if (s.includes('not interested') || s.includes('closed')) return 'Not Interested';
    if (s.includes('follow-up')) return 'Follow-up';
    return 'Contacted';
};

interface SalesKanbanProps {
    sales: any[];
    onUpdate: (sale: any) => void;
    onCall: (sale: any) => void;
}

export const SalesKanban = ({ sales, onUpdate, onCall }: SalesKanbanProps) => {
    const queryClient = useQueryClient();
    const [columns, setColumns] = useState<Record<string, any[]>>({});

    useEffect(() => {
        const initialCols: Record<string, any[]> = {};
        PIPELINE_STAGES.forEach(s => initialCols[s] = []);
        
        if (sales && sales.length > 0) {
            sales.forEach(sale => {
                const stage = normalizeStage(sale.salesStatus);
                if (initialCols[stage]) {
                    initialCols[stage].push(sale);
                } else {
                    initialCols['New'].push(sale);
                }
            });
        }
        setColumns(initialCols);
    }, [sales]);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const canonicalStatus = status === 'New' ? 'Not Contacted' : status;
            await api.patch(`/sales/${id}/status`, { salesStatus: canonicalStatus });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
        }
    });

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = [...columns[source.droppableId]];
        const destCol = source.droppableId === destination.droppableId ? sourceCol : [...columns[destination.droppableId]];
        
        const [movedItem] = sourceCol.splice(source.index, 1);
        movedItem.salesStatus = destination.droppableId === 'New' ? 'Not Contacted' : destination.droppableId;
        destCol.splice(destination.index, 0, movedItem);

        setColumns(prev => ({
            ...prev,
            [source.droppableId]: sourceCol,
            [destination.droppableId]: destCol
        }));

        if (source.droppableId !== destination.droppableId) {
            updateStatusMutation.mutate({ id: draggableId, status: destination.droppableId });
        }
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-4 min-h-[600px]">
            <DragDropContext onDragEnd={onDragEnd}>
                {PIPELINE_STAGES.map(stage => (
                    <div key={stage} className="flex-none w-80 bg-gray-50/80 rounded-xl border border-gray-200 flex flex-col max-h-[800px]">
                        <div className="p-3 border-b border-gray-200 bg-gray-100/50 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">{stage}</h3>
                            <Badge className="bg-white text-gray-600">{columns[stage]?.length || 0}</Badge>
                        </div>
                        
                        <Droppable droppableId={stage}>
                            {(provided) => (
                                <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="flex-1 overflow-y-auto p-2 space-y-2"
                                >
                                    {columns[stage]?.map((sale, index) => (
                                        <Draggable key={sale._id} draggableId={sale._id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`bg-white p-3 rounded-lg border shadow-sm transition-shadow ${snapshot.isDragging ? 'shadow-md border-indigo-400' : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <div className="font-bold text-gray-900 mb-1">{sale.studentName}</div>
                                                    <div className="text-xs text-indigo-600 font-mono mb-2">{sale.phone}</div>
                                                    
                                                    {sale.interestedDomain && (
                                                        <div className="text-xs text-gray-500 mb-2 truncate bg-gray-50 p-1 rounded">
                                                            Domain: <span className="font-medium text-gray-700">{sale.interestedDomain}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {sale.studentResponse && (
                                                        <div className="text-xs text-gray-600 italic mb-2 line-clamp-2" title={sale.studentResponse}>
                                                            "{sale.studentResponse}"
                                                        </div>
                                                    )}
                                                    
                                                    {sale.nextFollowUp && (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-3 bg-blue-50/50 p-1 rounded text-blue-700">
                                                            <CalendarClock className="w-3 h-3" />
                                                            {moment(sale.nextFollowUp).format('DD MMM, hh:mm A')}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                                        <Button size="sm" variant="outline" className="flex-1 py-1 h-auto text-xs border-green-200 text-green-700 hover:bg-green-50" onClick={() => onCall(sale)}>
                                                            <Phone className="w-3 h-3 mr-1" /> Call
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="flex-1 py-1 h-auto text-xs" onClick={() => onUpdate(sale)}>
                                                            <Edit className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                    </div>
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
            </DragDropContext>
        </div>
    );
};
