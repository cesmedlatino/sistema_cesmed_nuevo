import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, AlertCircle, MapPin, Plus, ListOrdered } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { EditAppointmentDialog } from '@/components/appointments/EditAppointmentDialog';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
  // Datos completos de la cita
  patient_id: string;
  specialist_id: string;
  consulting_room_id: string | null;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
  payment_id?: string | null;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    patient_code: string;
  };
  specialists?: {
    id: string;
    first_name: string;
    last_name: string;
    specialist_code: string;
    color: string;
  };
  consulting_rooms?: {
    id: string;
    name: string;
    floor: string;
  };
}

interface Specialist {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
  status: string;
}

export function Programaciones() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('day');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarEvent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [queueAppointments, setQueueAppointments] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cargar eventos del calendario usando el hook unificado
  const { events, loading: eventsLoading, fetchEvents } = useCalendarAppointments();

  // Cargar especialistas
  const fetchSpecialists = async () => {
    try {
      const { data, error } = await supabase
        .from('specialists')
        .select('id, first_name, last_name, color, status')
        .eq('status', 'Activo')
        .order('first_name');

      if (error) throw error;
      setSpecialists(data || []);
    } catch (err: any) {
      console.error('Error fetching specialists:', err);
      toast({
        title: 'Error al cargar especialistas',
        description: err.message,
        variant: 'destructive',
      });
    }
  };
  useEffect(() => {
    fetchSpecialists();
  }, []);

  // Cargar eventos cuando cambien los filtros
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
    
    fetchEvents(startDate, endDate, selectedSpecialist);
  }, [currentDate, viewType, selectedSpecialist]);

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

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

  const getTodayButtonText = () => {
    const today = new Date();
    const isToday = isSameDay(currentDate, today);
    
    if (isToday) {
      return 'Hoy';
    }
    
    return format(currentDate, 'd MMM', { locale: es });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const handleEventClick = (eventId: string) => {
    console.log('Seleccionando cita:', eventId);
    
    // Buscar el evento en los datos ya cargados
    const selectedEvent = events.find(event => event.id === eventId);
    
    if (selectedEvent) {
      console.log('Datos de la cita encontrados:', selectedEvent);
      setSelectedAppointment(selectedEvent);
      setEditDialogOpen(true);
    } else {
      console.error('No se encontró la cita con ID:', eventId);
      toast({
        title: 'Error',
        description: 'No se pudo encontrar la información de la cita',
        variant: 'destructive',
      });
    }
  };

  const handleAppointmentUpdated = () => {
    // Recargar los eventos
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
    
    fetchEvents(startDate, endDate, selectedSpecialist);
  };

  const handleOpenQueueDialog = async () => {
    setIsLoadingQueue(true);
    setShowQueueDialog(true);
    
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          queue_position,
          reason,
          patient:patients(first_name, last_name),
          specialist:specialists(first_name, last_name)
        `)
        .eq('appointment_date', dateStr)
        .order('queue_position', { ascending: true, nullsFirst: false })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      setQueueAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas del día",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleSaveQueue = async () => {
    try {
      const updates = queueAppointments.map(apt => ({
        id: apt.id,
        queue_position: apt.queue_position
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('appointments')
          .update({ queue_position: update.queue_position })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Turnos asignados",
        description: "Los turnos de atención se guardaron correctamente",
      });
      
      setShowQueueDialog(false);
      
      // Recargar los datos para reflejar los cambios
      handleAppointmentUpdated();
    } catch (error) {
      console.error('Error saving queue:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los turnos",
        variant: "destructive",
      });
    }
  };

  const handleAutoNumber = () => {
    const sortedAppointments = [...queueAppointments].sort((a, b) => {
      return a.appointment_time.localeCompare(b.appointment_time);
    });
    
    const numberedAppointments = sortedAppointments.map((apt, idx) => ({
      ...apt,
      queue_position: idx + 1
    }));
    
    setQueueAppointments(numberedAppointments);
    
    toast({
      title: "Turnos auto-numerados",
      description: "Se asignaron los turnos según el horario de las citas",
    });
  };

  const updateQueuePosition = (appointmentId: string, position: number | null) => {
    setQueueAppointments(prev =>
      prev.map(apt =>
        apt.id === appointmentId
          ? { ...apt, queue_position: position }
          : apt
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const newAppointments = [...queueAppointments];
    const draggedItem = newAppointments[draggedIndex];
    
    // Remover el item de su posición original
    newAppointments.splice(draggedIndex, 1);
    // Insertarlo en la nueva posición
    newAppointments.splice(dropIndex, 0, draggedItem);
    
    // Actualizar las posiciones de turno basándose en el nuevo orden
    const updatedAppointments = newAppointments.map((apt, idx) => ({
      ...apt,
      queue_position: idx + 1
    }));
    
    setQueueAppointments(updatedAppointments);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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

  const renderDayView = () => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_time), currentDate)
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
    
    // Group events by hour to calculate required height for each cell
    const eventsByHour = hours.map(hour => {
      return dayEvents.filter(event => {
        const eventStartHour = new Date(event.start_time).getHours();
        return eventStartHour === hour;
      });
    });
    
    // Calculate minimum height for each hour cell based on number of events
    const hourHeights = eventsByHour.map(eventsInHour => {
      if (eventsInHour.length === 0) return 64; // Default height (h-16)
      return Math.max(64, eventsInHour.length * 60); // 60px per event, minimum 64px
    });

    return (
      <div className="flex overflow-y-auto border border-gray-200 rounded-lg bg-white">
        {/* Time column */}
        <div className="flex-shrink-0 w-20 bg-gray-50 border-r border-gray-200">
          {hours.map((hour, index) => (
            <div 
              key={hour} 
              className={`flex items-center justify-center text-sm text-gray-500 ${
                index < hours.length - 1 ? 'border-b border-gray-200' : ''
              }`}
              style={{ height: `${hourHeights[index]}px` }}
            >
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </div>
          ))}
        </div>
        
        {/* Events column */}
        <div className="flex-1">
          {hours.map((hour, hourIndex) => {
            const eventsInThisHour = eventsByHour[hourIndex];
            const cellHeight = hourHeights[hourIndex];
            
            return (
              <div 
                key={hour} 
                className={`relative ${
                  hourIndex < hours.length - 1 ? 'border-b border-gray-200' : ''
                }`}
                style={{ height: `${cellHeight}px` }}
              >
                {eventsInThisHour.map((event, eventIndex) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event.id);
                    }}
                    className="absolute left-2 right-2 rounded-lg p-1 text-white text-xs shadow-sm cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border border-white/20"
                    style={{
                      backgroundColor: event.specialist_color,
                      top: `${eventIndex * 60 + 2}px`,
                      height: '56px',
                      zIndex: 10 + eventIndex
                    }}
                  >
                    <div className="font-semibold text-xs leading-tight mb-1 truncate">{event.reason}</div>
                    <div className="flex items-center justify-between text-xs opacity-90 leading-tight">
                      <span className="truncate flex-1 mr-2">
                        <Clock className="h-2.5 w-2.5 inline mr-1" />
                        {formatTime(event.start_time)}-{formatTime(event.end_time)} • 
                        <User className="h-2.5 w-2.5 inline mx-1" />
                        {event.patient_name}
                      </span>
                      <Badge 
                        className="text-xs px-1 py-0 bg-white/20 hover:bg-white/30 shrink-0"
                        variant="secondary"
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
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
                      className="h-16 border-b border-gray-200"
                    ></div>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event.id);
                          }}
                          className="absolute left-1 right-1 rounded p-1 text-white text-xs cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border border-white/20"
                          style={{
                            backgroundColor: event.specialist_color,
                            top: `${Math.max(0, top)}%`,
                            height: `${Math.min(height, 100 - top)}%`,
                            minHeight: '30px'
                          }}
                        >
                          <div className="font-semibold text-xs leading-tight truncate">{event.reason}</div>
                          <div className="text-xs leading-tight opacity-90 truncate">
                            <User className="h-2.5 w-2.5 inline mr-1" />
                            {event.patient_name}
                          </div>
                          <div className="text-xs leading-tight opacity-80">
                            <Clock className="h-2.5 w-2.5 inline mr-1" />
                            {formatTime(event.start_time)}
                          </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event.id);
                    }}
                    className="text-xs p-2 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity border border-white/20"
                    style={{ backgroundColor: event.specialist_color }}
                  >
                    <div className="font-medium">{event.reason}</div>
                    <div className="opacity-80 text-xs">{formatTime(event.start_time)}</div>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Programaciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y visualiza las citas médicas programadas en formato calendario
          </p>
        </div>
      </div>

      <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarIcon className="h-6 w-6" />
                Calendario de Citas
              </CardTitle>
              
              {/* Specialist filter */}
              <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                <SelectTrigger className="w-64 bg-white shadow-sm">
                  <SelectValue placeholder="Todos los especialistas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Todos los especialistas
                    </div>
                  </SelectItem>
                  {specialists.map((specialist) => (
                    <SelectItem key={specialist.id} value={specialist.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full border" 
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
              
              {/* Asignar turnos button */}
              <Button 
                onClick={handleOpenQueueDialog}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <ListOrdered className="h-4 w-4 mr-2" />
                Asignar Turnos
              </Button>
            </div>

            {/* View controls */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')} className="shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('today')} className="shadow-sm">
                {getTodayButtonText()}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')} className="shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="h-6 w-px bg-border mx-2" />
              
              <div className="flex rounded-lg border border-border overflow-hidden shadow-sm bg-white">
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
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-xl font-semibold text-foreground">
              {getDateRangeText()}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Haz click en una cita para editarla</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading || eventsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Cargando citas...</p>
              </div>
            </div>
          ) : (
            <div className="w-full bg-white rounded-lg shadow-inner p-4">
              {viewType === 'day' && renderDayView()}
              {viewType === 'week' && renderWeekView()}
              {viewType === 'month' && renderMonthView()}
            </div>
          )}

          {/* Events count */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {events.length} cita{events.length !== 1 ? 's' : ''} encontrada{events.length !== 1 ? 's' : ''}
                {selectedSpecialist !== 'all' && specialists.length > 0 && (
                  <span className="ml-2 font-medium">
                    para {specialists.find(s => s.id === selectedSpecialist)?.first_name} {specialists.find(s => s.id === selectedSpecialist)?.last_name}
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditAppointmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        appointment={selectedAppointment}
        onSuccess={handleAppointmentUpdated}
      />

      {/* Queue Assignment Dialog */}
      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar Turnos de Atención</DialogTitle>
            <DialogDescription>
              {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {isLoadingQueue ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando citas...
            </div>
          ) : queueAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay citas programadas para este día
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="text-lg">↕️</span>
                  Arrastra las citas para reordenar los turnos
                </span>
              </div>
              {queueAppointments.map((apt, index) => (
                <div
                  key={apt.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 p-4 border-2 rounded-lg 
                    transition-all duration-200 cursor-move
                    ${draggedIndex === index 
                      ? 'opacity-50 scale-95 border-primary' 
                      : 'opacity-100 scale-100'
                    }
                    ${dragOverIndex === index && draggedIndex !== index
                      ? 'border-primary border-dashed bg-primary/5 scale-105'
                      : 'border-border bg-muted/50'
                    }
                    hover:border-primary/50 hover:shadow-md
                  `}
                >
                  <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                    <div className="flex flex-col gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                    </div>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      {apt.queue_position || index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-base">
                      {apt.appointment_time} - {apt.patient?.first_name}{' '}
                      {apt.patient?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {apt.reason || 'Sin motivo especificado'}
                    </div>
                    {apt.specialist && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Dr(a). {apt.specialist.first_name}{' '}
                        {apt.specialist.last_name}
                      </div>
                    )}
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="0"
                      value={apt.queue_position || ''}
                      onChange={(e) =>
                        updateQueuePosition(
                          apt.id,
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Turno"
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleAutoNumber}
              disabled={queueAppointments.length === 0}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Auto-numerar por horario
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQueueDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveQueue}
                disabled={queueAppointments.length === 0}
              >
                Guardar Turnos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}