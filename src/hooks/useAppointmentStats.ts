
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppointmentStats {
  specialist_id: string;
  specialist_name: string;
  specialist_color: string;
  total_today: number;
  completed_today: number;
  scheduled_today: number;
  cancelled_today: number;
  unscheduled_today: number;
}

interface MonthlyStats {
  total_month: number;
  completed_month: number;
  scheduled_month: number;
  cancelled_month: number;
  unscheduled_month: number;
}

export function useAppointmentStats() {
  const [stats, setStats] = useState<AppointmentStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    total_month: 0,
    completed_month: 0,
    scheduled_month: 0,
    cancelled_month: 0,
    unscheduled_month: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      console.log('Actualizando estadísticas de citas...');
      
      // Primero, actualizar automáticamente las citas que no tienen consultorio asignado a "Sin Programar"
      const { data: citasSinConsultorio, error: errorActualizacion } = await supabase
        .from('appointments')
        .update({ status: 'Sin Programar' })
        .is('consulting_room_id', null)
        .neq('status', 'Anulada')
        .neq('status', 'Completada')
        .select('id, status');

      if (errorActualizacion) {
        console.error('Error actualizando citas sin consultorio:', errorActualizacion);
      } else {
        console.log('Citas actualizadas a Sin Programar:', citasSinConsultorio?.length || 0);
      }

      // Obtener estadísticas del día actual
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select(`
          specialist_id,
          status,
          consulting_room_id,
          specialists!inner(first_name, last_name, color)
        `)
        .eq('appointment_date', new Date().toISOString().split('T')[0]);
      
      if (todayError) throw todayError;
      
      console.log('Datos de citas de hoy:', todayData);
      
      // Obtener estadísticas del mes actual
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: monthData, error: monthError } = await supabase
        .from('appointments')
        .select('status, consulting_room_id')
        .gte('appointment_date', firstDayOfMonth)
        .lte('appointment_date', lastDayOfMonth);
      
      if (monthError) throw monthError;
      
      // Procesar estadísticas por especialista (solo del día)
      const statsMap = new Map();
      
      (todayData || []).forEach(appointment => {
        const specialistId = appointment.specialist_id;
        const specialistName = `${appointment.specialists.first_name} ${appointment.specialists.last_name}`;
        const specialistColor = appointment.specialists.color || '#5c1c8c';
        
        if (!statsMap.has(specialistId)) {
          statsMap.set(specialistId, {
            specialist_id: specialistId,
            specialist_name: specialistName,
            specialist_color: specialistColor,
            total_today: 0,
            completed_today: 0,
            scheduled_today: 0,
            cancelled_today: 0,
            unscheduled_today: 0
          });
        }
        
        const stat = statsMap.get(specialistId);
        
        // Contar en total siempre (excepto anuladas)
        if (appointment.status !== 'Anulada') {
          stat.total_today++;
        }
        
        // Contabilizar por estado
        switch (appointment.status) {
          case 'Completada':
            stat.completed_today++;
            break;
          case 'Programada':
            // Solo contar como programada si tiene consultorio asignado
            if (appointment.consulting_room_id) {
              stat.scheduled_today++;
            } else {
              stat.unscheduled_today++;
            }
            break;
          case 'Sin Programar':
            stat.unscheduled_today++;
            break;
          case 'Anulada':
            stat.cancelled_today++;
            break;
        }
        
        console.log(`Especialista ${specialistName}: Total=${stat.total_today}, Programadas=${stat.scheduled_today}, Sin Programar=${stat.unscheduled_today}, Completadas=${stat.completed_today}, Anuladas=${stat.cancelled_today}`);
      });
      
      // Procesar estadísticas del mes
      const monthlyTotals = {
        total_month: monthData?.filter(a => a.status !== 'Anulada').length || 0,
        completed_month: monthData?.filter(a => a.status === 'Completada').length || 0,
        scheduled_month: monthData?.filter(a => a.status === 'Programada' && a.consulting_room_id).length || 0,
        cancelled_month: monthData?.filter(a => a.status === 'Anulada').length || 0,
        unscheduled_month: monthData?.filter(a => a.status === 'Sin Programar' || (a.status === 'Programada' && !a.consulting_room_id)).length || 0
      };
      
      console.log('Estadísticas mensuales:', monthlyTotals);
      
      setStats(Array.from(statsMap.values()));
      setMonthlyStats(monthlyTotals);
    } catch (error: any) {
      console.error('Error fetching appointment stats:', error);
      toast({
        title: 'Error al cargar estadísticas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return {
    stats,
    monthlyStats,
    loading,
    refetch: fetchStats,
  };
}
