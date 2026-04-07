
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HorarioTurnoAssignment {
  id: string;
  horario_id: string;
  turno_id: string;
  day_of_week: number;
  custom_start_time?: string;
  custom_end_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  turno?: {
    id: string;
    name: string;
    start_time?: string;
    end_time?: string;
    is_custom: boolean;
  };
}

export interface HorarioTurnoAssignmentInput {
  horario_id: string;
  turno_id: string;
  day_of_week: number;
  custom_start_time?: string;
  custom_end_time?: string;
  is_active?: boolean;
}

export function useHorarioTurnoAssignments(horarioId?: string) {
  const [assignments, setAssignments] = useState<HorarioTurnoAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignments = async () => {
    if (!horarioId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('horario_turno_assignments')
        .select(`
          *,
          turno:turnos(id, name, start_time, end_time, is_custom)
        `)
        .eq('horario_id', horarioId)
        .order('day_of_week');

      if (error) throw error;
      setAssignments((data || []) as HorarioTurnoAssignment[]);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones de turnos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateAssignment = async (assignmentData: HorarioTurnoAssignmentInput) => {
    try {
      console.log('Creating/updating assignment with data:', assignmentData);

      // Preparar los datos para enviar
      const dataToSend = {
        horario_id: assignmentData.horario_id,
        turno_id: assignmentData.turno_id,
        day_of_week: assignmentData.day_of_week,
        custom_start_time: assignmentData.custom_start_time || null,
        custom_end_time: assignmentData.custom_end_time || null,
        is_active: assignmentData.is_active ?? true
      };

      console.log('Data to send to Supabase:', dataToSend);

      // Siempre crear nueva asignación para permitir múltiples turnos por día
      const { data, error } = await supabase
        .from('horario_turno_assignments')
        .insert([{
          ...dataToSend,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          turno:turnos(id, name, start_time, end_time, is_custom)
        `)
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        throw error;
      }

      console.log('Created assignment response:', data);

      setAssignments(prev => [...prev, data as HorarioTurnoAssignment].sort((a, b) => a.day_of_week - b.day_of_week));

      toast({
        title: "Turno Asignado",
        description: "El turno se ha asignado correctamente",
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateAssignment = async (id: string, assignmentData: Partial<HorarioTurnoAssignmentInput>) => {
    try {
      console.log('Updating assignment with data:', assignmentData);

      const dataToSend = {
        ...assignmentData,
        updated_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('horario_turno_assignments')
        .update(dataToSend)
        .eq('id', id)
        .select(`
          *,
          turno:turnos(id, name, start_time, end_time, is_custom)
        `)
        .single();

      if (error) {
        console.error('Error updating assignment:', error);
        throw error;
      }

      console.log('Updated assignment response:', data);

      setAssignments(prev => prev.map(a => 
        a.id === id ? data as HorarioTurnoAssignment : a
      ));

      toast({
        title: "Turno Actualizado",
        description: "El turno se ha actualizado correctamente",
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('horario_turno_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Asignación Eliminada",
        description: "La asignación de turno se ha eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación de turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [horarioId]);

  return {
    assignments,
    loading,
    createOrUpdateAssignment,
    updateAssignment,
    deleteAssignment,
    refetch: fetchAssignments
  };
}
