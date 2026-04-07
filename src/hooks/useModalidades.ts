import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Modalidad {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export function useModalidades() {
  return useQuery({
    queryKey: ["modalidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalidad")
        .select("*")
        .order("nombre");

      if (error) throw error;
      return data as Modalidad[];
    },
  });
}

export function useCreateModalidad() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (modalidad: Omit<Modalidad, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("modalidad")
        .insert([modalidad])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalidades"] });
      toast({
        title: "Modalidad creada",
        description: "La modalidad se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la modalidad.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateModalidad() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Modalidad> & { id: string }) => {
      const { data, error } = await supabase
        .from("modalidad")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalidades"] });
      toast({
        title: "Modalidad actualizada",
        description: "La modalidad se ha actualizado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la modalidad.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteModalidad() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("modalidad")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modalidades"] });
      toast({
        title: "Modalidad eliminada",
        description: "La modalidad se ha eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la modalidad.",
        variant: "destructive",
      });
    },
  });
}