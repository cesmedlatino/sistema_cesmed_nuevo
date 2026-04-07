import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsOutput {
  id: string;
  date: string;
  product_id?: string;
  product_code?: string;
  description?: string;
  quantity: number;
  sale_cost_per_unit: number;
  total: number;
  nro_comprobante?: string;
  tipo_salida: string;
  motivo_ajuste?: string;
  patient_id?: string;
  comments?: string;
  created_at: string;
  product?: {
    id: string;
    codigo: string;
    nombre: string;
  };
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function useOpticsOutputs(limit?: number, searchTerm?: string) {
  return useQuery({
    queryKey: ["optics-outputs", limit, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("optics_outputs")
        .select(`
          *,
          product:optics_products(id, codigo, nombre),
          patient:patients(id, first_name, last_name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,nro_comprobante.ilike.%${searchTerm}%`
        );
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OpticsOutput[];
    },
  });
}

export function useCreateOpticsOutput() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (output: Omit<OpticsOutput, "id" | "created_at" | "product" | "patient">) => {
      const { data, error } = await supabase
        .from("optics_outputs")
        .insert(output)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Salida registrada",
        description: "La salida se ha registrado correctamente.",
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

export function useUpdateOpticsOutput() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...output }: Partial<OpticsOutput> & { id: string }) => {
      const { data, error } = await supabase
        .from("optics_outputs")
        .update({ ...output, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Salida actualizada",
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

export function useDeleteOpticsOutput() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("optics_outputs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Salida eliminada",
        description: "La salida se ha eliminado correctamente.",
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
