
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Specialist = Tables<'specialists'>;
type SpecialistInsert = TablesInsert<'specialists'>;
type SpecialistUpdate = TablesUpdate<'specialists'>;

// Create a type for the input that makes auto-generated fields optional
type SpecialistCreateInput = Omit<SpecialistInsert, 'id' | 'created_at' | 'updated_at' | 'specialist_code'> & {
  specialist_code?: string;
};

export function useSpecialists() {
  const [data, setData] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('specialists')
        .select(`
          *,
          specialty:medical_specialties(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setData(result || []);
    } catch (error: any) {
      console.error('Error fetching specialists:', error);
      toast({
        title: 'Error al cargar especialistas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (record: SpecialistCreateInput) => {
    setLoading(true);
    try {
      // Prepare the data for insertion - let the database generate specialist_code if not provided
      const insertData: SpecialistInsert = {
        ...record,
        specialist_code: record.specialist_code || '', // Will be overridden by trigger if empty
      };

      const { data: result, error } = await supabase
        .from('specialists')
        .insert(insertData)
        .select(`
          *,
          specialty:medical_specialties(name)
        `)
        .single();

      if (error) throw error;

      setData(prev => [result, ...prev]);
      
      toast({
        title: 'Especialista registrado',
        description: 'El especialista se ha registrado exitosamente',
      });
      
      return result;
    } catch (error: any) {
      console.error('Error creating specialist:', error);
      toast({
        title: 'Error al registrar especialista',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (id: string, updates: SpecialistUpdate) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('specialists')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          specialty:medical_specialties(name)
        `)
        .single();

      if (error) throw error;

      setData(prev => 
        prev.map(item => 
          item.id === id ? result : item
        )
      );
      
      toast({
        title: 'Especialista actualizado',
        description: 'El especialista se ha actualizado exitosamente',
      });
      
      return result;
    } catch (error: any) {
      console.error('Error updating specialist:', error);
      toast({
        title: 'Error al actualizar especialista',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('specialists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Especialista eliminado',
        description: 'El especialista se ha eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('Error deleting specialist:', error);
      toast({
        title: 'Error al eliminar especialista',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    fetchData,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
