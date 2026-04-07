import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsEntryPaginated {
  id: string;
  date: string;
  product_id?: string;
  product_code?: string;
  description?: string;
  quantity_received: number;
  purchase_cost_per_unit: number | null;
  importe: number | null;
  invoice_number?: string;
  invoice_due_date?: string;
  payment_status: string | null;
  payment_type?: string;
  supplier_id?: string;
  lote?: string;
  observations?: string;
  entry_type: string | null;
  created_at: string;
  product?: {
    id: string;
    codigo: string;
    nombre: string;
    marca?: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

interface PaginatedResult {
  data: OpticsEntryPaginated[];
  totalCount: number;
  totalPages: number;
}

interface UseOpticsEntriesPaginatedParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
}

export function useOpticsEntriesPaginated({ page, pageSize, searchTerm }: UseOpticsEntriesPaginatedParams) {
  return useQuery({
    queryKey: ["optics-entries-paginated", page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get count first
      let countQuery = supabase
        .from("optics_entries")
        .select("*", { count: "exact", head: true });

      if (searchTerm) {
        countQuery = countQuery.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`
        );
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Get data
      let query = supabase
        .from("optics_entries")
        .select(`
          *,
          product:optics_products(id, codigo, nombre, marca),
          supplier:pharmacy_suppliers(id, name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data: data as OpticsEntryPaginated[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
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
      queryClient.invalidateQueries({ queryKey: ["optics-entries-paginated"] });
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
