import React, { useEffect, useRef } from 'react';
import Calendar from '@toast-ui/calendar';
import '@toast-ui/calendar/dist/toastui-calendar.min.css';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  specialist_name: string;
  specialist_color: string;
  patient_name: string;
  status: string;
  reason: string;
  duration_minutes: number;
}

interface TuiCalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: any) => void;
  onAppointmentCreated?: () => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

export function TuiCalendar({ events, onEventClick, onAppointmentCreated, onDateRangeChange }: TuiCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstance = useRef<Calendar | null>(null);

  useEffect(() => {
    if (calendarRef.current && !calendarInstance.current) {
      // Initialize TUI Calendar
      calendarInstance.current = new Calendar(calendarRef.current, {
        defaultView: 'week',
        useCreationPopup: true,
        useDetailPopup: true,
        isReadOnly: false,
        week: {
          startDayOfWeek: 1, // Monday
          dayNames: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
          hourStart: 7,
          hourEnd: 20,
        },
        month: {
          dayNames: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        },
        day: {
          hourStart: 7,
          hourEnd: 20,
        },
        calendars: [
          {
            id: 'appointments',
            name: 'Citas Médicas',
            backgroundColor: '#5c1c8c',
            borderColor: '#5c1c8c',
            color: '#ffffff',
          },
        ],
        template: {
          milestone: function(event: any) {
            return `<span style="color: red;">${event.title}</span>`;
          },
          milestoneTitle: function() {
            return 'Milestone';
          },
          task: function(event: any) {
            return `&nbsp;&nbsp;#${event.title}`;
          },
          taskTitle: function() {
            return '<label><input type="checkbox" />Task</label>';
          },
          allday: function(event: any) {
            return `${event.title}`;
          },
          alldayTitle: function() {
            return 'All Day';
          },
          time: function(event: any) {
            return `
              <div class="tui-full-calendar-left-content">
                <span class="tui-full-calendar-title">${event.title}</span>
                <span class="tui-full-calendar-location">${event.raw?.patient_name || ''}</span>
              </div>
            `;
          },
          goingDuration: function(event: any) {
            return `<span>${event.goingDuration}</span>`;
          },
          comingDuration: function(event: any) {
            return `<span>${event.comingDuration}</span>`;
          },
        },
      });

      // Event handlers
      calendarInstance.current.on('clickEvent', (info: any) => {
        if (onEventClick) {
          onEventClick(info.event);
        }
      });

      calendarInstance.current.on('beforeCreateEvent', (eventData: any) => {
        // Handle new appointment creation
        console.log('Creating new event:', eventData);
      });

      // Trigger initial date range change
      setTimeout(() => notifyDateRangeChange(), 100);
    }

    return () => {
      if (calendarInstance.current) {
        calendarInstance.current.destroy();
        calendarInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (calendarInstance.current && events) {
      // Clear existing events
      calendarInstance.current.clear();

      // Convert events to TUI Calendar format
      const tuiEvents = events.map(event => ({
        id: event.id,
        calendarId: 'appointments',
        title: event.reason || 'Consulta Médica',
        category: 'time',
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        backgroundColor: event.specialist_color || '#5c1c8c',
        borderColor: event.specialist_color || '#5c1c8c',
        color: '#ffffff',
        raw: {
          patient_name: event.patient_name,
          specialist_name: event.specialist_name,
          status: event.status,
          reason: event.reason,
        },
      }));

      // Add events to calendar
      calendarInstance.current.createEvents(tuiEvents);
    }
  }, [events]);

  const notifyDateRangeChange = () => {
    if (calendarInstance.current && onDateRangeChange) {
      const currentDate = calendarInstance.current.getDate();
      const viewType = calendarInstance.current.getViewName();
      
      let startDate: Date, endDate: Date;
      
      if (viewType === 'month') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      } else if (viewType === 'week') {
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        startDate = new Date(currentDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else { // day view
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      }
      
      onDateRangeChange(startDate, endDate);
    }
  };

  const goToPrev = () => {
    if (calendarInstance.current) {
      calendarInstance.current.prev();
      notifyDateRangeChange();
    }
  };

  const goToNext = () => {
    if (calendarInstance.current) {
      calendarInstance.current.next();
      notifyDateRangeChange();
    }
  };

  const goToToday = () => {
    if (calendarInstance.current) {
      calendarInstance.current.today();
      notifyDateRangeChange();
    }
  };

  const changeView = (view: string) => {
    if (calendarInstance.current) {
      calendarInstance.current.changeView(view);
      // Notify date range change when view changes
      setTimeout(() => notifyDateRangeChange(), 100);
    }
  };

  return (
    <div className="w-full h-full">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changeView('month')}
          >
            Mes
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changeView('week')}
          >
            Semana
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changeView('day')}
          >
            Día
          </Button>
        </div>
      </div>

      {/* Calendar Container */}
      <div 
        ref={calendarRef} 
        className="w-full" 
        style={{ height: '600px' }}
      />
    </div>
  );
}