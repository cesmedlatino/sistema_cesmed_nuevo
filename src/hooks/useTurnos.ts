
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShiftType {
  id: string;
  name: string;
  description: string;
}

export interface Turno {
  id: string;
  name: string;
  shift_type_id: string;
  start_time?: string;
  end_time?: string;
  is_custom: boolean;
  clinic_id?: string;
  dias_laborables?: number[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  shift_type?: ShiftType;
}

export interface TurnoInput {
  name: string;
  shift_type_id: string;
  start_time?: string;
  end_time?: string;
  is_custom: boolean;
  dias_laborables?: number[];
}

export function useTurnos() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShiftTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setShiftTypes(data || []);
    } catch (error) {
      console.error('Error fetching shift types:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los tipos de turno",
        variant: "destructive",
      });
    }
  };

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('turnos')
        .select(`
          *,
          shift_type:shift_types(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTurnos((data || []) as Turno[]);
    } catch (error) {
      console.error('Error fetching turnos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTurno = async (turnoData: TurnoInput) => {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .insert([{
          ...turnoData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select(`
          *,
          shift_type:shift_types(*)
        `)
        .single();

      if (error) throw error;

      setTurnos(prev => [data as Turno, ...prev]);
      toast({
        title: "Turno Creado",
        description: "El turno se ha creado correctamente",
      });
      return data as Turno;
    } catch (error) {
      console.error('Error creating turno:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTurno = async (id: string, turnoData: Partial<TurnoInput>) => {
    try {
      const { data, error } = await supabase
        .from('turnos')
        .update({
          ...turnoData,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select(`
          *,
          shift_type:shift_types(*)
        `)
        .single();

      if (error) throw error;

      setTurnos(prev => prev.map(t => t.id === id ? data as Turno : t));
      toast({
        title: "Turno Actualizado",
        description: "El turno se ha actualizado correctamente",
      });
      return data as Turno;
    } catch (error) {
      console.error('Error updating turno:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTurno = async (id: string) => {
    try {
      const { error } = await supabase
        .from('turnos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTurnos(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Turno Eliminado",
        description: "El turno se ha eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting turno:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el turno",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchShiftTypes();
    fetchTurnos();
  }, []);

  return {
    turnos,
    shiftTypes,
    loading,
    createTurno,
    updateTurno,
    deleteTurno,
    refetch: fetchTurnos
  };
}
