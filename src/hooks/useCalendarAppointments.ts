
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function useCalendarAppointments() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEvents = async (startDate: Date, endDate: Date, specialistId?: string) => {
    setLoading(true);
    console.log('Fetching calendar events:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      specialistId
    });

    try {
      // Usar consulta directa unificada con todos los datos necesarios
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(
            id,
            first_name,
            last_name,
            patient_code
          ),
          specialists!inner(
            id,
            first_name,
            last_name,
            specialist_code,
            color
          ),
          consulting_rooms(
            id,
            name,
            floor
          )
        `)
        .gte('appointment_date', startDate.toISOString().split('T')[0])
        .lte('appointment_date', endDate.toISOString().split('T')[0])
        .in('status', ['Programada', 'Sin Programar', 'Completada', 'En Proceso']);

      if (specialistId && specialistId !== 'all') {
        query = query.eq('specialist_id', specialistId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error en consulta directa:', error);
        throw error;
      }

      console.log('Datos de consulta directa:', data);

      // Formatear datos con información completa
      const formattedEvents: CalendarEvent[] = (data || []).map(appointment => {
        const appointmentDateTime = `${appointment.appointment_date}T${appointment.appointment_time}`;
        const startTime = new Date(appointmentDateTime);
        const duration = appointment.duration_minutes || 30;
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const event: CalendarEvent = {
          id: appointment.id,
          title: appointment.reason || 'Consulta Médica',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          specialist_name: `${appointment.specialists.first_name} ${appointment.specialists.last_name}`,
          specialist_color: appointment.specialists.color || '#5c1c8c',
          patient_name: `${appointment.patients.first_name} ${appointment.patients.last_name}`,
          status: appointment.status || 'Programada',
          reason: appointment.reason || 'Consulta Médica',
          duration_minutes: duration,
          // Datos completos para el formulario
          patient_id: appointment.patient_id,
          specialist_id: appointment.specialist_id,
          consulting_room_id: appointment.consulting_room_id,
          appointment_date: appointment.appointment_date,
          payment_id: appointment.payment_id,
          appointment_time: appointment.appointment_time,
          notes: appointment.notes,
          patients: appointment.patients,
          specialists: appointment.specialists,
          consulting_rooms: appointment.consulting_rooms
        };

        console.log('Evento formateado con datos completos:', {
          id: event.id,
          title: event.title,
          patient_id: event.patient_id,
          specialist_id: event.specialist_id
        });

        return event;
      });

      setEvents(formattedEvents);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: 'Error al cargar eventos',
        description: error.message,
        variant: 'destructive',
      });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    events,
    loading,
    fetchEvents,
  };
}
