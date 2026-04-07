
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OpeningHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  opening_time?: string;
  closing_time?: string;
}

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function useOpeningHours() {
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOpeningHours = async () => {
    try {
      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .not('clinic_id', 'is', null)
        .order('day_of_week');

      if (error) throw error;

      setOpeningHours(data || []);
    } catch (error) {
      console.error('Error fetching opening hours:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios de atención.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOpeningHours = async (updatedHours: OpeningHour[]) => {
    try {
      setLoading(true);

      // Update each day's opening hours
      for (const hour of updatedHours) {
        const { error } = await supabase
          .from('opening_hours')
          .update({
            is_open: hour.is_open,
            opening_time: hour.opening_time,
            closing_time: hour.closing_time
          })
          .eq('id', hour.id);

        if (error) throw error;
      }

      setOpeningHours(updatedHours);
      toast({
        title: "Horario Actualizado",
        description: "Los horarios de atención se han guardado correctamente.",
      });
    } catch (error) {
      console.error('Error updating opening hours:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los horarios de atención.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpeningHours();
  }, []);

  return {
    openingHours,
    loading,
    updateOpeningHours,
    dayNames
  };
}
