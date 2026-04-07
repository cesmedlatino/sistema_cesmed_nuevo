
import React, { useState } from 'react';
import { CalendarEvent } from './CalendarEvent';
import { TimeSlot } from './TimeSlot';
import { NewAppointmentDialog } from './NewAppointmentDialog';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
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

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAppointmentCreated?: () => void;
}

export function WeekView({ currentDate, events, onEventClick, onAppointmentCreated }: WeekViewProps) {
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 AM to 6:00 PM

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_time), day)
    );
  };

  const getEventPosition = (event: Event) => {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
    
    const top = ((startHour - 7) * 60); // 60px per hour, starting at 7 AM
    const height = (endHour - startHour) * 60;
    
    return { top: `${top}px`, height: `${height}px` };
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setShowNewAppointmentDialog(true);
  };

  const handleAppointmentCreated = () => {
    onAppointmentCreated?.();
    setShowNewAppointmentDialog(false);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header with days */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-4 border-r"></div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-4 text-center border-r">
              <div className="font-medium text-sm">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8 relative">
            {/* Time column */}
            <div className="border-r">
              {hours.map((hour) => (
                <div key={hour} className="h-[60px] p-2 text-sm text-gray-500 border-b flex items-start">
                  {hour}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="relative border-r">
                {/* Hour grid with interactive slots */}
                {hours.map((hour) => (
                  <TimeSlot
                    key={hour}
                    hour={hour}
                    date={day}
                    onSlotClick={handleSlotClick}
                    className="h-[60px]"
                  />
                ))}
                
                {/* Events for this day */}
                {getEventsForDay(day).map((event) => {
                  const position = getEventPosition(event);
                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 z-10"
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
            ))}
          </div>
        </div>
      </div>

      <NewAppointmentDialog
        open={showNewAppointmentDialog}
        onOpenChange={setShowNewAppointmentDialog}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </>
  );
}
