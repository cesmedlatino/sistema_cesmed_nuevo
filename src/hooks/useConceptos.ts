import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Concepto {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  monto: number;
  activo: boolean;
  especialidad_id?: string | null;
  especialidad_name?: string;
  created_at: string;
  updated_at: string;
}

export function useConceptos() {
  return useQuery({
    queryKey: ["conceptos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concepto")
        .select(`
          *,
          medical_specialties (
            name
          )
        `)
        .order("nombre");

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        especialidad_name: item.medical_specialties?.name || null,
      })) as Concepto[];
    },
  });
}

export function useCreateConcepto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (concepto: Omit<Concepto, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("concepto")
        .insert([concepto])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      toast({
        title: "Concepto creado",
        description: "El concepto se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el concepto.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateConcepto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Concepto> & { id: string }) => {
      const { data, error } = await supabase
        .from("concepto")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      toast({
        title: "Concepto actualizado",
        description: "El concepto se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el concepto.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteConcepto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("concepto")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      toast({
        title: "Concepto eliminado",
        description: "El concepto se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el concepto.",
        variant: "destructive",
      });
    },
  });
}