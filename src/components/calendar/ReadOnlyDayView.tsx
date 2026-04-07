
import React from 'react';
import { CalendarEvent } from './CalendarEvent';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  specialist_name: string;
  specialist_color: string;
  patient_name: string;
  status: string;
}

interface ReadOnlyDayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function ReadOnlyDayView({ currentDate, events, onEventClick }: ReadOnlyDayViewProps) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 AM to 6:00 PM

  const dayEvents = events.filter(event => 
    isSameDay(new Date(event.start_time), currentDate)
  );

  const getEventPosition = (event: Event) => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    
    const top = ((startHour - 7) * 80); // 80px per hour, starting at 7 AM
    const height = (endHour - startHour) * 80;
    
    return { top: `${top}px`, height: `${height}px` };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'EEEE, d MMMM yyyy', { locale: es })}
        </h2>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative">
          {/* Time column */}
          <div className="w-20 border-r flex-shrink-0">
            {hours.map((hour) => (
              <div key={hour} className="h-[80px] p-2 text-sm text-gray-500 border-b flex items-start">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="flex-1 relative">
            {/* Hour grid */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-[80px] border-b border-gray-100"
              />
            ))}
            
            {/* Events */}
            {dayEvents.map((event) => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 z-10"
                  style={position}
                >
                  <CalendarEvent
                    event={event}
                    onClick={() => onEventClick?.(event)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
