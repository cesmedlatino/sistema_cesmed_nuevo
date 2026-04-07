import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export type DateFilterType = 'today' | 'date' | 'week' | 'month' | 'select-month' | 'all';

export interface TodayAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  specialist_name: string;
  specialist_id: string;
  specialty_name: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  reason: string;
  queue_position?: number;
  checked_in_at?: string;
  hms?: string;
  // Payment fields
  estado_pago?: string;
  modalidad_pago?: string;
  monto_pagado?: number;
  payment_id?: string;
  nro_comprobante?: string;
}

// Helper function to get local Lima date string (YYYY-MM-DD)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to get start and end of current week (Sunday to Saturday)
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return {
    start: getLocalDateString(startOfWeek),
    end: getLocalDateString(endOfWeek)
  };
}

// Helper to get start and end of current month
function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: getLocalDateString(startOfMonth),
    end: getLocalDateString(endOfMonth)
  };
}

// Helper to get a specific month range
function getSpecificMonthRange(year: number, month: number): { start: string; end: string } {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  return {
    start: getLocalDateString(startOfMonth),
    end: getLocalDateString(endOfMonth)
  };
}

export function useAttendanceQueue(
  filterType: DateFilterType = 'today',
  selectedDate?: string,
  selectedMonth?: { year: number; month: number }
) {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { userData } = useUserPermissions();

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on filter
      let dateStart: string;
      let dateEnd: string;
      
      switch (filterType) {
        case 'today':
          dateStart = getLocalDateString();
          dateEnd = dateStart;
          break;
        case 'date':
          dateStart = selectedDate || getLocalDateString();
          dateEnd = dateStart;
          break;
        case 'week':
          const weekRange = getWeekRange();
          dateStart = weekRange.start;
          dateEnd = weekRange.end;
          break;
        case 'month':
          const monthRange = getMonthRange();
          dateStart = monthRange.start;
          dateEnd = monthRange.end;
          break;
        case 'select-month':
          if (selectedMonth) {
            const specificRange = getSpecificMonthRange(selectedMonth.year, selectedMonth.month);
            dateStart = specificRange.start;
            dateEnd = specificRange.end;
          } else {
            const currentMonthRange = getMonthRange();
            dateStart = currentMonthRange.start;
            dateEnd = currentMonthRange.end;
          }
          break;
        case 'all':
          dateStart = '2000-01-01';
          dateEnd = '2099-12-31';
          break;
        default:
          dateStart = getLocalDateString();
          dateEnd = dateStart;
      }
      
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          queue_position,
          checked_in_at,
          patient_id,
          specialist_id,
          payment_id,
          estado_cuenta,
          patients!inner(
            id,
            first_name,
            last_name
          ),
          specialists!inner(
            id,
            first_name,
            last_name,
            medical_specialties!inner(
              name
            )
          ),
          pagos(
            id,
            monto_pagado,
            estado_pago,
            modalidad:modalidad_id(nombre),
            documento_pago:documento_pago_id(numero_documento)
          )
        `)
        .gte('appointment_date', dateStart)
        .lte('appointment_date', dateEnd);

      // Only filter by status for "today" filter
      if (filterType === 'today') {
        query = query.in('status', ['Programada', 'En Proceso', 'En Espera']);
      }

      // Filtrar por especialista si el usuario es especialista
      if (userData?.rol === 'especialista') {
        const { data: specialistData } = await supabase
          .from('specialists')
          .select('id')
          .eq('email', userData.email)
          .single();
        
        if (specialistData) {
          query = query.eq('specialist_id', specialistData.id);
        }
      }

      const { data, error } = await query.order('appointment_date', { ascending: false }).order('appointment_time');

      if (error) throw error;

      // Obtener los HMS de la tabla medical_records para cada paciente
      const patientIds = (data || []).map((apt: any) => apt.patient_id).filter(Boolean);
      
      let hmsMap: Record<string, string> = {};
      if (patientIds.length > 0) {
        const { data: medicalRecords } = await supabase
          .from('medical_records')
          .select('patient_id, hms, created_at')
          .in('patient_id', patientIds)
          .order('created_at', { ascending: false });

        if (medicalRecords) {
          medicalRecords.forEach((record: any) => {
            if (!hmsMap[record.patient_id] && record.hms) {
              hmsMap[record.patient_id] = record.hms;
            }
          });
        }
      }

      const formattedAppointments = (data || []).map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patients?.id,
        patient_name: `${apt.patients?.first_name || ''} ${apt.patients?.last_name || ''}`.trim(),
        specialist_name: `${apt.specialists?.first_name || ''} ${apt.specialists?.last_name || ''}`.trim(),
        specialist_id: apt.specialists?.id,
        specialty_name: apt.specialists?.medical_specialties?.name || 'Sin especialidad',
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        reason: apt.reason || 'Consulta general',
        queue_position: apt.queue_position,
        checked_in_at: apt.checked_in_at,
        hms: hmsMap[apt.patient_id] || undefined,
        // Payment fields
        payment_id: apt.payment_id,
        estado_pago: apt.pagos?.estado_pago || apt.estado_cuenta,
        modalidad_pago: apt.pagos?.modalidad?.nombre || null,
        monto_pagado: apt.pagos?.monto_pagado || null,
        nro_comprobante: apt.pagos?.documento_pago?.numero_documento || null,
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterType, selectedDate, selectedMonth, userData, toast]);

  const checkInPatient = async (appointmentId: string, specialistId: string) => {
    try {
      const today = getLocalDateString();
      
      const { data: queueData, error: queueError } = await supabase
        .from('appointments')
        .select('queue_position')
        .eq('specialist_id', specialistId)
        .eq('appointment_date', today)
        .not('queue_position', 'is', null)
        .order('queue_position', { ascending: false })
        .limit(1);

      if (queueError) throw queueError;

      const nextPosition = queueData.length > 0 ? (queueData[0].queue_position || 0) + 1 : 1;

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'En Espera',
          queue_position: nextPosition,
          checked_in_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Paciente registrado",
        description: `Paciente agregado a la cola en posición ${nextPosition}`,
      });

      fetchAppointments();
    } catch (error) {
      console.error('Error checking in patient:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar al paciente",
        variant: "destructive",
      });
    }
  };

  const callNextPatient = async (specialistId: string) => {
    try {
      const today = getLocalDateString();
      
      const { data: nextPatient, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('specialist_id', specialistId)
        .eq('appointment_date', today)
        .eq('status', 'En Espera')
        .order('queue_position')
        .limit(1);

      if (error) throw error;

      if (nextPatient && nextPatient.length > 0) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'En Proceso' })
          .eq('id', nextPatient[0].id);

        if (updateError) throw updateError;

        toast({
          title: "Siguiente paciente",
          description: `Paciente llamado para atención`,
        });

        fetchAppointments();
      } else {
        toast({
          title: "Sin pacientes",
          description: "No hay pacientes en espera para este especialista",
        });
      }
    } catch (error) {
      console.error('Error calling next patient:', error);
      toast({
        title: "Error",
        description: "No se pudo llamar al siguiente paciente",
        variant: "destructive",
      });
    }
  };

  const completeAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Completada' })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Cita completada",
        description: "La cita ha sido marcada como completada",
      });

      fetchAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la cita",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (userData !== null) {
      fetchAppointments();
    }
  }, [userData, fetchAppointments]);

  // Configurar realtime para actualizaciones de turnos
  useEffect(() => {
    if (filterType !== 'today') return; // Only subscribe for today filter
    
    const today = getLocalDateString();
    
    const channel = supabase
      .channel('appointments-queue-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `appointment_date=eq.${today}`
        },
        (payload) => {
          console.log('Queue position updated:', payload);
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData, filterType, fetchAppointments]);

  return {
    appointments,
    loading,
    checkInPatient,
    callNextPatient,
    completeAppointment,
    refetch: fetchAppointments
  };
}
