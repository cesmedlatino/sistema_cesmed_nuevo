
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';

interface CalendarEventProps {
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    specialist_name: string;
    specialist_color: string;
    patient_name: string;
    status: string;
  };
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function CalendarEvent({ event, style, onClick }: CalendarEventProps) {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div
      className="rounded-md p-2 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        backgroundColor: event.specialist_color,
        ...style
      }}
      onClick={onClick}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="flex items-center gap-1 mt-1">
        <Clock className="h-3 w-3" />
        <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <User className="h-3 w-3" />
        <span className="truncate">{event.patient_name}</span>
      </div>
      <div className="mt-1">
        <Badge 
          variant={event.status === 'Completada' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {event.status}
        </Badge>
      </div>
    </div>
  );
}
