
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpecialistSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  shift_name: string;
  horario_name: string;
}

export function useSpecialistSchedules(specialistId?: string) {
  const [schedules, setSchedules] = useState<SpecialistSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSchedules = async (id: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_specialist_schedule', {
        p_specialist_id: id
      });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching specialist schedules:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los horarios del especialista',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (specialistId) {
      fetchSchedules(specialistId);
    } else {
      setSchedules([]);
    }
  }, [specialistId]);

  return {
    schedules,
    loading,
    refetch: () => specialistId && fetchSchedules(specialistId),
  };
}
