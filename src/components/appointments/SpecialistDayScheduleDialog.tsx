import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  reason: string;
  patient_name: string;
}

interface SpecialistDayScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  specialistId: string;
  specialistName: string;
  date: string;
  onSelectTime: (time: string) => void;
}

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];

// Generar slots de tiempo de 7:00 a 20:00 con intervalo configurable
const generateTimeSlots = (intervalMinutes: number) => {
  const slots: string[] = [];
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (hour === 20 && minute > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

export function SpecialistDayScheduleDialog({
  open,
  onOpenChange,
  specialistId,
  specialistName,
  date,
  onSelectTime,
}: SpecialistDayScheduleDialogProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState(20); // Default 20 min

  const timeSlots = generateTimeSlots(interval);

  useEffect(() => {
    if (open && specialistId && date) {
      fetchAppointments();
    }
  }, [open, specialistId, date]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          duration_minutes,
          status,
          reason,
          patients!inner(first_name, last_name)
        `)
        .eq('specialist_id', specialistId)
        .eq('appointment_date', date)
        .not('status', 'in', '("Cancelada","No Asistió")')
        .order('appointment_time');

      if (error) throw error;

      const formattedAppointments: Appointment[] = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_time: apt.appointment_time?.substring(0, 5) || '',
        duration_minutes: apt.duration_minutes || 30,
        status: apt.status || 'Programada',
        reason: apt.reason || 'Consulta',
        patient_name: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Paciente',
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular el porcentaje de ocupación de un slot
  const getSlotOccupancy = (slot: string): { occupiedPercent: number; appointments: Appointment[] } => {
    const [slotHour, slotMinute] = slot.split(':').map(Number);
    const slotStartMinutes = slotHour * 60 + slotMinute;
    const slotEndMinutes = slotStartMinutes + interval;

    let occupiedMinutes = 0;
    const overlappingAppointments: Appointment[] = [];

    for (const apt of appointments) {
      const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
      const aptStartMinutes = aptHour * 60 + aptMinute;
      const aptEndMinutes = aptStartMinutes + (apt.duration_minutes || 30);

      // Calcular superposición
      const overlapStart = Math.max(slotStartMinutes, aptStartMinutes);
      const overlapEnd = Math.min(slotEndMinutes, aptEndMinutes);

      if (overlapStart < overlapEnd) {
        occupiedMinutes += overlapEnd - overlapStart;
        overlappingAppointments.push(apt);
      }
    }

    const occupiedPercent = Math.min(100, (occupiedMinutes / interval) * 100);
    return { occupiedPercent, appointments: overlappingAppointments };
  };


  const handleSelectTime = (time: string) => {
    onSelectTime(time);
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completada':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'En Proceso':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Programada':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Calculate grid columns based on interval
  const getGridCols = () => {
    switch (interval) {
      case 15: return 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8';
      case 20: return 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6';
      case 30: return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';
      case 45: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
      case 60: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
      default: return 'grid-cols-4 sm:grid-cols-6';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Agenda de {specialistName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDate(date)}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* Controles y Resumen */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary"></div>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/30 border-2 border-destructive"></div>
                  <span>Ocupado ({appointments.length} citas)</span>
                </div>
              </div>
              
              {/* Selector de intervalo */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Intervalo:</span>
                <Select value={interval.toString()} onValueChange={(v) => setInterval(Number(v))}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid de horarios */}
            <div className={cn("grid gap-2", getGridCols())}>
              {timeSlots.map((slot) => {
                const { occupiedPercent, appointments: slotAppointments } = getSlotOccupancy(slot);
                const isFullyOccupied = occupiedPercent >= 100;
                const isPartiallyOccupied = occupiedPercent > 0 && occupiedPercent < 100;

                return (
                  <div key={slot} className="relative group">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full h-10 text-sm font-mono transition-all relative overflow-hidden",
                        isFullyOccupied 
                          ? "opacity-60 cursor-not-allowed text-destructive-foreground border-destructive/50" 
                          : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      )}
                      onClick={() => !isFullyOccupied && handleSelectTime(slot)}
                      disabled={isFullyOccupied}
                    >
                      {/* Fondo de ocupación parcial */}
                      {occupiedPercent > 0 && (
                        <div 
                          className="absolute left-0 top-0 h-full bg-destructive/30 transition-all"
                          style={{ width: `${occupiedPercent}%` }}
                        />
                      )}
                      <span className="relative z-10">{slot}</span>
                    </Button>

                    {/* Tooltip para citas */}
                    {slotAppointments.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
                          <div className="text-xs text-muted-foreground mb-2">
                            Ocupado: {Math.round(occupiedPercent)}%
                          </div>
                          {slotAppointments.map((apt) => (
                            <div key={apt.id} className="mb-2 last:mb-0">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{apt.patient_name}</span>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground pl-6">
                                <p><span className="font-medium">Hora:</span> {apt.appointment_time}</p>
                                <p><span className="font-medium">Duración:</span> {apt.duration_minutes} min</p>
                                <p><span className="font-medium">Motivo:</span> {apt.reason}</p>
                              </div>
                              <Badge className={cn("mt-1 ml-6 text-xs", getStatusColor(apt.status))}>
                                {apt.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-popover border-r border-b rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lista de citas del día */}
            {appointments.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 text-sm">Citas programadas para este día</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex-shrink-0 text-center">
                        <div className="text-lg font-bold font-mono text-primary">
                          {apt.appointment_time}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.duration_minutes} min
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{apt.patient_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.reason}</p>
                      </div>
                      <Badge className={cn("flex-shrink-0 text-xs", getStatusColor(apt.status))}>
                        {apt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
