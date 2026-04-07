
import React from 'react';
import { CalendarEvent } from './CalendarEvent';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
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
  duration_minutes?: number;
}

interface ReadOnlyWeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function ReadOnlyWeekView({ currentDate, events, onEventClick }: ReadOnlyWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 AM to 6:00 PM

  console.log('ReadOnlyWeekView - Events recibidos:', events);
  console.log('ReadOnlyWeekView - Rango de semana:', { 
    weekStart: format(weekStart, 'yyyy-MM-dd'), 
    weekEnd: format(addDays(weekStart, 6), 'yyyy-MM-dd') 
  });

  const getEventsForDay = (day: Date) => {
    const dayEvents = events.filter(event => {
      try {
        // Parseamos la fecha del evento
        const eventDate = parseISO(event.start_time);
        const isSame = isSameDay(eventDate, day);
        
        console.log(`Comparando evento para ${format(day, 'yyyy-MM-dd')}:`, {
          eventId: event.id,
          eventStartTime: event.start_time,
          eventDate: format(eventDate, 'yyyy-MM-dd'),
          dayToCheck: format(day, 'yyyy-MM-dd'),
          isSameDay: isSame
        });
        
        return isSame;
      } catch (error) {
        console.error('Error parseando fecha del evento:', event.start_time, error);
        return false;
      }
    });
    
    console.log(`Eventos encontrados para ${format(day, 'yyyy-MM-dd')}:`, dayEvents.length, dayEvents);
    return dayEvents;
  };

  const getEventPosition = (event: Event) => {
    try {
      const startTime = parseISO(event.start_time);
      const duration = event.duration_minutes || 30;
      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
      const endHour = startHour + (duration / 60);
      
      // Calculamos la posición basada en el horario de 7 AM a 6 PM
      const top = ((startHour - 7) * 60); // 60px por hora, empezando en 7 AM
      const height = (endHour - startHour) * 60;
      
      console.log(`Posición calculada para evento ${event.id}:`, {
        startTime: format(startTime, 'HH:mm'),
        startHour,
        endHour,
        top: `${Math.max(top, 0)}px`,
        height: `${Math.max(height, 30)}px`
      });
      
      return { top: `${Math.max(top, 0)}px`, height: `${Math.max(height, 30)}px` };
    } catch (error) {
      console.error('Error calculando posición del evento:', event.start_time, error);
      return { top: '0px', height: '30px' };
    }
  };

  const formatEventTime = (startTime: string) => {
    try {
      const date = parseISO(startTime);
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formateando hora:', startTime, error);
      return '';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'bg-green-600 text-white';
      case 'Programada':
        return 'bg-blue-600 text-white';
      case 'Sin Programar':
        return 'bg-orange-600 text-white';
      case 'En Proceso':
        return 'bg-purple-600 text-white';
      case 'Anulada':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Función para obtener solo las primeras 3 letras del apellido
  const getShortPatientName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      // Tomar el primer nombre y las primeras 3 letras del apellido
      const firstName = parts[0];
      const lastName = parts[parts.length - 1]; // Último elemento como apellido
      return `${firstName} ${lastName.substring(0, 3)}.`;
    }
    return fullName.substring(0, 8); // Fallback si no hay espacios
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-20">
        <div className="p-4 border-r bg-white">
          <div className="text-xs text-gray-500">Hora</div>
        </div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-4 text-center border-r">
            <div className="font-medium text-sm text-gray-700">
              {format(day, 'EEE', { locale: es })}
            </div>
            <div className={`text-lg font-semibold ${
              isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {format(day, 'd')}
            </div>
            <div className="text-xs text-gray-500">
              {format(day, 'MMM', { locale: es })}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8 relative">
          {/* Time column */}
          <div className="border-r bg-gray-50 sticky left-0 z-10">
            {hours.map((hour) => (
              <div key={hour} className="h-[60px] p-2 text-sm text-gray-500 border-b flex items-start justify-end pr-3">
                <span className="bg-white px-2 py-1 rounded text-xs font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div key={day.toISOString()} className="relative border-r min-h-[720px]">
                {/* Hour grid background */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  />
                ))}
                
                {/* Events for this day */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayEvents.map((event, eventIndex) => {
                    const position = getEventPosition(event);
                    const statusBadgeColor = getStatusBadgeColor(event.status);
                    const shortPatientName = getShortPatientName(event.patient_name);
                    
                    console.log('Renderizando evento:', {
                      id: event.id,
                      title: event.title,
                      position,
                      specialist_color: event.specialist_color,
                      patient_name: event.patient_name,
                      shortPatientName
                    });
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute pointer-events-auto cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-30 rounded-lg border border-white/30 shadow-sm"
                        style={{
                          ...position,
                          backgroundColor: event.specialist_color || '#5c1c8c',
                          left: `${4 + eventIndex * 2}px`,
                          right: `${4 + (dayEvents.length - eventIndex - 1) * 2}px`,
                          zIndex: 10 + eventIndex
                        }}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="p-2 text-white h-full overflow-hidden flex flex-col justify-between">
                          {/* Time */}
                          <div className="text-xs font-bold bg-black/20 rounded px-1 inline-block mb-1 w-fit">
                            {formatEventTime(event.start_time)}
                          </div>
                          
                          {/* Patient name (shortened) */}
                          <div className="font-semibold text-sm leading-tight mb-1">
                            {shortPatientName}
                          </div>
                          
                          {/* Reason/Title (truncated) */}
                          <div className="text-xs leading-tight mb-1 opacity-90 flex-1 overflow-hidden">
                            <div className="line-clamp-2">
                              {event.title}
                            </div>
                          </div>
                          
                          {/* Status badge - only show if there's space */}
                          <div className="text-xs mt-auto">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${statusBadgeColor}`}>
                              {event.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Empty state for days with no events */}
                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                    Sin citas
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
