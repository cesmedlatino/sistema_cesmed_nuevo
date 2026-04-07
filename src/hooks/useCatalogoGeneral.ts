import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CatalogoGeneralItem {
  id: string;
  codigo: string;
  catalogo: string;
  nombre: string;
  clasificacion?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  precio_venta: number;
  stock_actual: number;
  ubicacion?: string;
  observacion?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export function useCatalogoGeneral(searchTerm?: string, catalogo?: string) {
  return useQuery({
    queryKey: ["catalogo-general", searchTerm, catalogo],
    queryFn: async () => {
      let query = supabase
        .from("catalogo_general")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%`
        );
      }

      if (catalogo && catalogo !== "all") {
        query = query.eq("catalogo", catalogo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CatalogoGeneralItem[];
    },
  });
}

export function useCatalogoGeneralByCodigo(codigo: string) {
  return useQuery({
    queryKey: ["catalogo-general-item", codigo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_general")
        .select("*")
        .eq("codigo", codigo)
        .single();
      if (error) throw error;
      return data as CatalogoGeneralItem;
    },
    enabled: !!codigo,
  });
}

export function useNextCatalogoCode() {
  return useQuery({
    queryKey: ["next-catalogo-code"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalogo_general")
        .select("codigo")
        .order("codigo", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) return "CG-000001";

      const lastCode = data[0].codigo;
      const match = lastCode.match(/^CG-(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `CG-${String(nextNum).padStart(6, "0")}`;
      }
      return "CG-000001";
    },
  });
}

export function useCreateCatalogoItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<CatalogoGeneralItem, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("catalogo_general")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogo-general"] });
      queryClient.invalidateQueries({ queryKey: ["next-catalogo-code"] });
      toast({ title: "Producto creado", description: "Se registró correctamente en el catálogo." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCatalogoItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<CatalogoGeneralItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("catalogo_general")
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogo-general"] });
      queryClient.invalidateQueries({ queryKey: ["catalogo-general-item"] });
      toast({ title: "Producto actualizado", description: "Los cambios se guardaron." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCatalogoItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("catalogo_general")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogo-general"] });
      toast({ title: "Producto eliminado", description: "Se eliminó del catálogo." });
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    },
  });
}
