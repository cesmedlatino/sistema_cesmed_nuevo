import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUPPLIES_CATEGORIES } from "./useSuppliesProducts";
import { getLocalDateString } from "@/lib/utils";

export interface SuppliesEntry {
  id: string;
  medication_id: string | null;
  product_code: string | null;
  description: string | null;
  date: string;
  quantity_received: number | null;
  purchase_cost_per_unit: number | null;
  total_amount: number | null;
  invoice_number: string | null;
  supplier_id: string | null;
  batch: string | null;
  expiry_date: string | null;
  observations: string | null;
  entry_type: string;
  payment_status: string;
  created_at: string;
  medication?: {
    descripcion: string;
    codigo: string;
  };
  supplier?: {
    name: string;
  };
}

export function useSuppliesEntries(limit?: number, searchTerm?: string) {
  return useQuery({
    queryKey: ["supplies-entries", limit, searchTerm],
    queryFn: async () => {
      // First get medications that are supplies
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (supplyMeds || []).map(m => m.id);
      
      if (supplyIds.length === 0) return [];

      let query = supabase
        .from("pharmacy_entries")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo),
          supplier:pharmacy_suppliers(name)
        `)
        .in("medication_id", supplyIds)
        .order("date", { ascending: false });

      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []) as unknown as SuppliesEntry[];
    },
  });
}

export function useSuppliesEntriesPaginated(page: number, pageSize: number, searchTerm?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["supplies-entries-paginated", page, pageSize, searchTerm, dateFrom, dateTo],
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
        .from("pharmacy_entries")
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
        .from("pharmacy_entries")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo),
          supplier:pharmacy_suppliers(name)
        `)
        .in("medication_id", supplyIds)
        .order("date", { ascending: false })
        .range(from, to);

      if (dateFrom) query = query.gte("date", dateFrom);
      if (dateTo) query = query.lte("date", dateTo);
      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: (data || []) as unknown as SuppliesEntry[],
        totalCount,
        totalPages,
      };
    },
  });
}

export function useCreateSuppliesEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Partial<SuppliesEntry>) => {
      const { data, error } = await supabase
        .from("pharmacy_entries")
        .insert({
          medication_id: entry.medication_id,
          product_code: entry.product_code,
          description: entry.description,
          quantity_received: entry.quantity_received,
          purchase_cost_per_unit: entry.purchase_cost_per_unit,
          total_amount: (entry.quantity_received || 0) * (entry.purchase_cost_per_unit || 0),
          invoice_number: entry.invoice_number,
          supplier_id: entry.supplier_id,
          batch: entry.batch,
          expiry_date: entry.expiry_date,
          date: entry.date || getLocalDateString(),
          observations: entry.observations,
          entry_type: entry.entry_type || "Compra",
          payment_status: entry.payment_status || "Pendiente",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-entries"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Entrada registrada correctamente");
    },
    onError: (error) => {
      console.error("Error creating entry:", error);
      toast.error("Error al registrar la entrada");
    },
  });
}

export function useDeleteSuppliesEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-entries"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Entrada eliminada correctamente");
    },
    onError: (error) => {
      console.error("Error deleting entry:", error);
      toast.error("Error al eliminar la entrada");
    },
  });
}
