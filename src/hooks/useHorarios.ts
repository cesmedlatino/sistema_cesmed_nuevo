
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Horario {
  id: string;
  nombre: string;
  dias_laborables: number[];
  estado: 'activo' | 'inactivo' | 'suspendido' | 'borrador';
  clinic_id?: string;
  specialist_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface HorarioInput {
  nombre: string;
  dias_laborables: number[];
  estado: 'activo' | 'inactivo' | 'suspendido' | 'borrador';
  specialist_id?: string;
}

export function useHorarios() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const dayNames = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 
    'Jueves', 'Viernes', 'Sábado'
  ];

  const estadoOptions = [
    { value: 'borrador' as const, label: 'Borrador', color: 'bg-gray-500' },
    { value: 'activo' as const, label: 'Activo', color: 'bg-green-500' },
    { value: 'inactivo' as const, label: 'Inactivo', color: 'bg-red-500' },
    { value: 'suspendido' as const, label: 'Suspendido', color: 'bg-yellow-500' }
  ];

  const fetchHorarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHorarios((data || []) as Horario[]);
    } catch (error) {
      console.error('Error fetching horarios:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createHorario = async (horarioData: HorarioInput) => {
    try {
      const { data, error } = await supabase
        .from('horarios')
        .insert([{
          ...horarioData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setHorarios(prev => [data as Horario, ...prev]);
      toast({
        title: "Horario Creado",
        description: "El horario se ha creado correctamente",
      });
      return data as Horario;
    } catch (error) {
      console.error('Error creating horario:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el horario",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateHorario = async (id: string, horarioData: Partial<HorarioInput>) => {
    try {
      const { data, error } = await supabase
        .from('horarios')
        .update({
          ...horarioData,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setHorarios(prev => prev.map(h => h.id === id ? data as Horario : h));
      toast({
        title: "Horario Actualizado",
        description: "El horario se ha actualizado correctamente",
      });
      return data as Horario;
    } catch (error) {
      console.error('Error updating horario:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteHorario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('horarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHorarios(prev => prev.filter(h => h.id !== id));
      toast({
        title: "Horario Eliminado",
        description: "El horario se ha eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting horario:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchHorarios();
  }, []);

  return {
    horarios,
    loading,
    dayNames,
    estadoOptions,
    createHorario,
    updateHorario,
    deleteHorario,
    refetch: fetchHorarios
  };
}
