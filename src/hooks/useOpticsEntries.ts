import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsEntry {
  id: string;
  date: string;
  product_id?: string;
  product_code?: string;
  description?: string;
  quantity_received: number;
  purchase_cost_per_unit: number;
  importe: number;
  invoice_number?: string;
  invoice_due_date?: string;
  payment_status: string;
  payment_type?: string;
  supplier_id?: string;
  lote?: string;
  observations?: string;
  entry_type: string;
  created_at: string;
  product?: {
    id: string;
    codigo: string;
    nombre: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

export function useOpticsEntries(limit?: number, searchTerm?: string) {
  return useQuery({
    queryKey: ["optics-entries", limit, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("optics_entries")
        .select(`
          *,
          product:optics_products(id, codigo, nombre),
          supplier:pharmacy_suppliers(id, name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`
        );
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OpticsEntry[];
    },
  });
}

export function useCreateOpticsEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: Omit<OpticsEntry, "id" | "created_at" | "product" | "supplier">) => {
      const { data, error } = await supabase
        .from("optics_entries")
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-entries"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Entrada registrada",
        description: "La entrada se ha registrado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOpticsEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...entry }: Partial<OpticsEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from("optics_entries")
        .update({ ...entry, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-entries"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Entrada actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteOpticsEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("optics_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-entries"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Entrada eliminada",
        description: "La entrada se ha eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
