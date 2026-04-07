
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilityResult {
  is_available: boolean;
  conflict_reason: string;
  available_slots: any;
}

export function useAvailabilityCheck() {
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const checkAvailability = async (
    specialistId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    consultingRoomId?: string,
    appointmentId?: string  // Nuevo parámetro para excluir la cita actual
  ): Promise<AvailabilityResult | null> => {
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc('check_specialist_availability', {
        p_specialist_id: specialistId,
        p_appointment_date: appointmentDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_consulting_room_id: consultingRoomId || null,
        p_appointment_id: appointmentId || null  // Pasar el ID de la cita para excluirla
      });

      if (error) throw error;
      
      return data?.[0] || null;
    } catch (error: any) {
      console.error('Error checking availability:', error);
      toast({
        title: 'Error al verificar disponibilidad',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setChecking(false);
    }
  };

  return {
    checkAvailability,
    checking,
  };
}
