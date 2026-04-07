import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, MapPin, Hand, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { useSpecialists } from '@/hooks/useSpecialists';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { NewAppointmentDialog } from './NewAppointmentDialog';
import { useNavigate } from 'react-router-dom';

type ViewType = 'day' | 'week' | 'month';

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

export function ProfessionalCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('day');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedHour, setSelectedHour] = useState<number>();
  
  const { events, loading, fetchEvents } = useCalendarAppointments();
  const { data: specialists } = useSpecialists();
  const navigate = useNavigate();

  // Fetch events when date, view, or specialist changes
  useEffect(() => {
    let startDate: Date, endDate: Date;
    
    switch (viewType) {
      case 'day':
        startDate = startOfDay(currentDate);
        endDate = startOfDay(currentDate);
        break;
      case 'week':
        startDate = startOfWeek(currentDate, { locale: es });
        endDate = endOfWeek(currentDate, { locale: es });
        break;
      case 'month':
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
    }
    
    fetchEvents(startDate, endDate, selectedSpecialist === 'all' ? undefined : selectedSpecialist);
  }, [currentDate, viewType, selectedSpecialist, fetchEvents]);

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const increment = direction === 'next' ? 1 : -1;
    
    switch (viewType) {
      case 'day':
        setCurrentDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
        break;
      case 'month':
        setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
        break;
    }
  };

  const getDateRangeText = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale: es });
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: es });
        const weekEnd = endOfWeek(currentDate, { locale: es });
        return `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Programada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'En Proceso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setShowNewAppointmentDialog(true);
  };

  const handleAppointmentCreated = () => {
    setShowNewAppointmentDialog(false);
    // Refetch events to show the new appointment
    let startDate: Date, endDate: Date;
    
    switch (viewType) {
      case 'day':
        startDate = startOfDay(currentDate);
        endDate = startOfDay(currentDate);
        break;
      case 'week':
        startDate = startOfWeek(currentDate, { locale: es });
        endDate = endOfWeek(currentDate, { locale: es });
        break;
      case 'month':
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
    }
    
    fetchEvents(startDate, endDate, selectedSpecialist === 'all' ? undefined : selectedSpecialist);
  };

  const renderDayView = () => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_time), currentDate)
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

    return (
      <div className="grid grid-cols-12 gap-4 h-96 overflow-y-auto">
        {/* Time column */}
        <div className="col-span-2 space-y-4">
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b border-gray-200 text-sm text-gray-500 p-2">
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </div>
          ))}
        </div>
        
        {/* Events column */}
        <div className="col-span-10 relative">
          {hours.map(hour => (
            <div 
              key={hour} 
              className="h-16 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors relative group"
              onClick={() => handleSlotClick(currentDate, hour)}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
                <Hand className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          ))}
          
          {/* Events overlay */}
          <div className="absolute inset-0">
            {dayEvents.map(event => {
              const startTime = new Date(event.start_time);
              const startHour = startTime.getHours() + startTime.getMinutes() / 60;
              const duration = event.duration_minutes / 60;
              const top = ((startHour - 7) / 14) * 100;
              const height = (duration / 14) * 100;

              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 rounded-lg p-2 text-white text-xs shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: event.specialist_color,
                    top: `${Math.max(0, top)}%`,
                    height: `${Math.min(height, 100 - top)}%`,
                    minHeight: '40px'
                  }}
                >
                  <div className="font-medium truncate">{event.reason}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{event.patient_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: es });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Week header */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-2 text-sm font-medium text-gray-500">Hora</div>
            {weekDays.map(day => (
              <div key={day.toString()} className="p-2 text-center">
                <div className="text-sm font-medium text-gray-900">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-8 h-96 overflow-y-auto">
            {/* Time column */}
            <div className="border-r border-gray-200">
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-gray-200 p-2 text-sm text-gray-500">
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(day => {
              const dayEvents = events.filter(event => 
                isSameDay(new Date(event.start_time), day)
              );

              return (
                <div key={day.toString()} className="border-r border-gray-200 relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors relative group"
                      onClick={() => handleSlotClick(day, hour)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity">
                        <Hand className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  
                  {/* Events for this day */}
                  <div className="absolute inset-0">
                    {dayEvents.map(event => {
                      const startTime = new Date(event.start_time);
                      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                      const duration = event.duration_minutes / 60;
                      const top = ((startHour - 7) / 14) * 100;
                      const height = (duration / 14) * 100;

                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 rounded p-1 text-white text-xs cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            backgroundColor: event.specialist_color,
                            top: `${Math.max(0, top)}%`,
                            height: `${Math.min(height, 100 - top)}%`,
                            minHeight: '30px'
                          }}
                        >
                          <div className="font-medium truncate">{event.reason}</div>
                          <div className="truncate">{event.patient_name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: es });
    const calendarEnd = endOfWeek(monthEnd, { locale: es });
    
    const calendarDays = [];
    let currentDay = calendarStart;
    
    while (currentDay <= calendarEnd) {
      calendarDays.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map(day => {
          const dayEvents = events.filter(event => 
            isSameDay(new Date(event.start_time), day)
          );
          const isCurrentMonth = day >= monthStart && day <= monthEnd;

          return (
            <div 
              key={day.toString()} 
              className={`min-h-24 p-2 border border-gray-200 ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded text-white truncate cursor-pointer"
                    style={{ backgroundColor: event.specialist_color }}
                  >
                    {event.reason}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendario de Programaciones
            </CardTitle>
            
            {/* Specialist filter */}
            <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos los especialistas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los especialistas</SelectItem>
                {specialists.map((specialist) => (
                  <SelectItem key={specialist.id} value={specialist.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: specialist.color }} 
                      />
                      {specialist.first_name} {specialist.last_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* New appointment button */}
            <Button 
              onClick={() => navigate('/appointments/new')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cita
            </Button>
          </div>

          {/* View controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('today')}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <Button
                variant={viewType === 'day' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewType('day')}
              >
                Día
              </Button>
              <Button
                variant={viewType === 'week' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-x"
                onClick={() => setViewType('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewType === 'month' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setViewType('month')}
              >
                Mes
              </Button>
            </div>
          </div>
        </div>
        
        <div className="text-lg font-semibold text-gray-700">
          {getDateRangeText()}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="w-full">
            {viewType === 'day' && renderDayView()}
            {viewType === 'week' && renderWeekView()}
            {viewType === 'month' && renderMonthView()}
          </div>
        )}

        {/* Events count */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          {events.length} cita{events.length !== 1 ? 's' : ''} encontrada{events.length !== 1 ? 's' : ''}
        </div>
      </CardContent>

      <NewAppointmentDialog
        open={showNewAppointmentDialog}
        onOpenChange={setShowNewAppointmentDialog}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </Card>
  );
}