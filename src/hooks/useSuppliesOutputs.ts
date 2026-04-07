import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPLIES_CATEGORIES } from "./useSuppliesProducts";
import { getLocalDateString } from "@/lib/utils";

export interface SuppliesOutput {
  id: string;
  medication_id: string | null;
  product_code: string | null;
  description: string | null;
  quantity: number;
  date: string;
  sale_cost_per_unit: number | null;
  total: number | null;
  tipo_salida: string | null;
  nro_comprobante: string | null;
  patient_id: string | null;
  motivo_ajuste: string | null;
  comments: string | null;
  created_at: string;
  medication?: {
    descripcion: string;
    codigo: string;
  };
  patient?: {
    first_name: string;
    last_name: string;
    dni: string;
  };
}

export function useSuppliesOutputs(limit?: number, searchTerm?: string) {
  return useQuery({
    queryKey: ["supplies-outputs", limit, searchTerm],
    queryFn: async () => {
      // First get medications that are supplies
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map(m => m.id);
      
      if (supplyIds.length === 0) return [];

      let query = supabase
        .from("pharmacy_outputs")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo),
          patient:patients(first_name, last_name, dni)
        `)
        .in("medication_id", supplyIds)
        .order("date", { ascending: false });

      if (searchTerm) {
        query = query.or(`nro_comprobante.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as unknown as SuppliesOutput[];
    },
  });
}

export function useSuppliesOutputsPaginated(page: number, pageSize: number, searchTerm?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["supplies-outputs-paginated", page, pageSize, searchTerm, dateFrom, dateTo],
    queryFn: async () => {
      // First get medications that are supplies
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map(m => m.id);
      
      if (supplyIds.length === 0) return { data: [], totalCount: 0, totalPages: 0 };

      // Count query
      let countQuery = supabase
        .from("pharmacy_outputs")
        .select("id", { count: "exact", head: true })
        .in("medication_id", supplyIds);

      if (dateFrom) countQuery = countQuery.gte("date", dateFrom);
      if (dateTo) countQuery = countQuery.lte("date", dateTo);

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Data query
      let query = supabase
        .from("pharmacy_outputs")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo),
          patient:patients(first_name, last_name, dni)
        `)
        .in("medication_id", supplyIds)
        .order("date", { ascending: false })
        .range(from, to);

      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo) query = query.lte("date", dateTo);
      if (searchTerm) {
        query = query.or(`nro_comprobante.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: (data || []) as unknown as SuppliesOutput[],
        totalCount,
        totalPages,
      };
    },
  });
}

export function useCreateSuppliesOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (output: Partial<SuppliesOutput>) => {
      const { data, error } = await supabase
        .from("pharmacy_outputs")
        .insert({
          medication_id: output.medication_id,
          product_code: output.product_code,
          description: output.description,
          quantity: output.quantity,
          date: output.date || getLocalDateString(),
          sale_cost_per_unit: output.sale_cost_per_unit,
          total: output.total,
          tipo_salida: output.tipo_salida || "Uso Interno",
          nro_comprobante: output.nro_comprobante,
          patient_id: output.patient_id,
          motivo_ajuste: output.motivo_ajuste,
          comments: output.comments,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-outputs-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Salida registrada correctamente");
    },
    onError: (error) => {
      console.error("Error creating output:", error);
      toast.error("Error al registrar la salida");
    },
  });
}

export function useDeleteSuppliesOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_outputs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-outputs"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-outputs-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Salida eliminada correctamente");
    },
    onError: (error) => {
      console.error("Error deleting output:", error);
      toast.error("Error al eliminar la salida");
    },
  });
}
