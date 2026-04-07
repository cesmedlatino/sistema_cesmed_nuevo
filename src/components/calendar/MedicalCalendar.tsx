
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Clock, Eye, Plus } from 'lucide-react';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { NewAppointmentDialog } from './NewAppointmentDialog';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { useSpecialists } from '@/hooks/useSpecialists';
import { format, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

type ViewType = 'week' | 'day';

export function MedicalCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  
  const { events, loading, fetchEvents } = useCalendarAppointments();
  const { data: specialists, fetchData: fetchSpecialists } = useSpecialists();

  useEffect(() => {
    fetchSpecialists();
  }, []);

  useEffect(() => {
    const startDate = viewType === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : currentDate;
    const endDate = viewType === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : currentDate;

    fetchEvents(
      startDate, 
      endDate, 
      selectedSpecialist === 'all' ? undefined : selectedSpecialist
    );
  }, [currentDate, viewType, selectedSpecialist]);

  const handlePrevious = () => {
    if (viewType === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewType === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    // Aquí puedes agregar lógica para mostrar detalles del evento
  };

  const handleAppointmentCreated = () => {
    // Refrescar eventos después de crear una cita
    const startDate = viewType === 'week' 
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : currentDate;
    const endDate = viewType === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : currentDate;

    fetchEvents(
      startDate, 
      endDate, 
      selectedSpecialist === 'all' ? undefined : selectedSpecialist
    );
  };

  const getCurrentHour = () => {
    return new Date().getHours();
  };

  const handleNewAppointment = () => {
    setShowNewAppointmentDialog(true);
  };

  const getDateRangeText = () => {
    if (viewType === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
    } else {
      return format(currentDate, 'EEEE, d MMMM yyyy', { locale: es });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Calendario Médico</h1>
          </div>
          <Button 
            onClick={handleNewAppointment}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>

        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-800">
                {getDateRangeText()}
              </CardTitle>
              <div className="flex items-center gap-4">
                {/* View selector */}
                <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Día
                      </div>
                    </SelectItem>
                    <SelectItem value="week">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Semana
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Specialist filter */}
                <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por especialista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los especialistas</SelectItem>
                    {specialists.map((specialist) => (
                      <SelectItem key={specialist.id} value={specialist.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: specialist.color || '#5c1c8c' }}
                          />
                          {specialist.first_name} {specialist.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Hoy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto animate-spin text-purple-600" />
                    <p className="mt-2 text-gray-600">Cargando calendario...</p>
                  </div>
                </div>
              ) : viewType === 'week' ? (
                <WeekView 
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onAppointmentCreated={handleAppointmentCreated}
                />
              ) : (
                <DayView 
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onAppointmentCreated={handleAppointmentCreated}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <NewAppointmentDialog
        open={showNewAppointmentDialog}
        onOpenChange={setShowNewAppointmentDialog}
        selectedDate={currentDate}
        selectedHour={getCurrentHour()}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </>
  );
}
