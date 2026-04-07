import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type ConsultingRoom = Tables<'consulting_rooms'>;
type ConsultingRoomInsert = TablesInsert<'consulting_rooms'>;
type ConsultingRoomUpdate = TablesUpdate<'consulting_rooms'>;

export function useConsultingRooms() {
  return useQuery({
    queryKey: ['consulting-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_rooms')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateConsultingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: ConsultingRoomInsert) => {
      const { data, error } = await supabase
        .from('consulting_rooms')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulting-rooms'] });
      toast.success('Consultorio creado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating consulting room:', error);
      toast.error('Error al crear consultorio: ' + error.message);
    },
  });
}

export function useUpdateConsultingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ConsultingRoomUpdate }) => {
      const { data, error } = await supabase
        .from('consulting_rooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulting-rooms'] });
      toast.success('Consultorio actualizado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error updating consulting room:', error);
      toast.error('Error al actualizar consultorio: ' + error.message);
    },
  });
}

export function useDeleteConsultingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consulting_rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulting-rooms'] });
      toast.success('Consultorio eliminado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error deleting consulting room:', error);
      toast.error('Error al eliminar consultorio: ' + error.message);
    },
  });
}
