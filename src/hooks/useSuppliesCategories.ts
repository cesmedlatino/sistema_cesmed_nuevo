import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SuppliesCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchActiveSuppliesCategoryNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from("supplies_categories")
    .select("name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  const names = (data || []).map((r) => r.name).filter(Boolean);
  return names;
}

export function useSuppliesCategories() {
  return useQuery({
    queryKey: ["supplies-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplies_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as SuppliesCategory[];
    },
    staleTime: 60_000,
  });
}

export function useCreateSuppliesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const normalized = name.trim();
      if (!normalized) throw new Error("Nombre de categoría requerido");

      const { data, error } = await supabase
        .from("supplies_categories")
        .insert({ name: normalized, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return data as SuppliesCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-categories"] });
      // también refresca catálogos/estadísticas que dependen de categorías
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Categoría creada");
    },
    onError: (e) => {
      console.error("Error creating supplies category", e);
      toast.error("No se pudo crear la categoría");
    },
  });
}

export function useUpdateSuppliesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; name?: string; is_active?: boolean }) => {
      const { id, ...rest } = payload;
      const update: Record<string, unknown> = {};
      if (rest.name !== undefined) update.name = rest.name.trim();
      if (rest.is_active !== undefined) update.is_active = rest.is_active;

      const { data, error } = await supabase
        .from("supplies_categories")
        .update(update)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SuppliesCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-categories"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Categoría actualizada");
    },
    onError: (e) => {
      console.error("Error updating supplies category", e);
      toast.error("No se pudo actualizar la categoría");
    },
  });
}

export function useDeleteSuppliesCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplies_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-categories"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Categoría eliminada");
    },
    onError: (e) => {
      console.error("Error deleting supplies category", e);
      toast.error("No se pudo eliminar la categoría");
    },
  });
}
