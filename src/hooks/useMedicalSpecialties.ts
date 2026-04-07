
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type MedicalSpecialty = Tables<'medical_specialties'>;
type MedicalSpecialtyInsert = TablesInsert<'medical_specialties'>;
type MedicalSpecialtyUpdate = TablesUpdate<'medical_specialties'>;

export function useMedicalSpecialties() {
  const [data, setData] = useState<MedicalSpecialty[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('medical_specialties')
        .select('*');

      if (error) throw error;
      
      setData(result || []);
    } catch (error: any) {
      console.error('Error fetching medical specialties:', error);
      toast({
        title: 'Error al cargar datos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (record: MedicalSpecialtyInsert) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('medical_specialties')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      setData(prev => [...prev, result]);
      
      toast({
        title: 'Registro creado',
        description: 'El registro se ha creado exitosamente',
      });
      
      return result;
    } catch (error: any) {
      console.error('Error creating medical specialty:', error);
      toast({
        title: 'Error al crear registro',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (id: string, updates: MedicalSpecialtyUpdate) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('medical_specialties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setData(prev => 
        prev.map(item => 
          item.id === id ? result : item
        )
      );
      
      toast({
        title: 'Registro actualizado',
        description: 'El registro se ha actualizado exitosamente',
      });
      
      return result;
    } catch (error: any) {
      console.error('Error updating medical specialty:', error);
      toast({
        title: 'Error al actualizar registro',
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
        .from('medical_specialties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setData(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Registro eliminado',
        description: 'El registro se ha eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('Error deleting medical specialty:', error);
      toast({
        title: 'Error al eliminar registro',
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
