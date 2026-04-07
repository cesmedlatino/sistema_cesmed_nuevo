import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    patient_name: string;
    specialist_name: string;
  };
  onRescheduled: () => void;
}

export function RescheduleDialog({ 
  open, 
  onOpenChange, 
  appointment, 
  onRescheduled 
}: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(() => {
    const [year, month, day] = appointment.appointment_date.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  });
  const [newTime, setNewTime] = useState(appointment.appointment_time.substring(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generar opciones de hora (cada 15 minutos de 7:00 a 20:00)
  const timeOptions = React.useMemo(() => {
    const options = [];
    for (let hour = 7; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  }, []);

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error('Selecciona fecha y hora');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = format(newDate, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: formattedDate,
          appointment_time: newTime + ':00',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      toast.success('Cita reprogramada exitosamente');
      onRescheduled();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al reprogramar:', error);
      toast.error('Error al reprogramar la cita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrentDate = () => {
    const [year, month, day] = appointment.appointment_date.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogramar Cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del paciente */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p><span className="text-muted-foreground">Paciente:</span> <strong>{appointment.patient_name}</strong></p>
            <p><span className="text-muted-foreground">Especialista:</span> {appointment.specialist_name}</p>
          </div>

          {/* Fecha y hora actual */}
          <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
            <p className="text-xs text-muted-foreground mb-1">Fecha y hora actual</p>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-orange-600" />
              <span className="capitalize">{formatCurrentDate()}</span>
              <Clock className="h-4 w-4 text-orange-600 ml-2" />
              <span>{appointment.appointment_time.substring(0, 5)}</span>
            </div>
          </div>

          {/* Nueva fecha */}
          <div className="space-y-2">
            <Label>Nueva Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Nueva hora */}
          <div className="space-y-2">
            <Label>Nueva Hora</Label>
            <Select value={newTime} onValueChange={setNewTime}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleReschedule} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Reprogramar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
