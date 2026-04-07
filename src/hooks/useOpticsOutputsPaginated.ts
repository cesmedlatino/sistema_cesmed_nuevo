import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsOutputPaginated {
  id: string;
  date: string;
  product_id?: string;
  product_code?: string;
  description?: string;
  quantity: number;
  sale_cost_per_unit: number | null;
  total: number | null;
  nro_comprobante?: string;
  tipo_salida: string | null;
  motivo_ajuste?: string;
  patient_id?: string;
  comments?: string;
  created_at: string;
  product?: {
    id: string;
    codigo: string;
    nombre: string;
    marca?: string;
  };
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    dni: string;
  };
}

interface PaginatedResult {
  data: OpticsOutputPaginated[];
  totalCount: number;
  totalPages: number;
}

interface UseOpticsOutputsPaginatedParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
}

export function useOpticsOutputsPaginated({ page, pageSize, searchTerm }: UseOpticsOutputsPaginatedParams) {
  return useQuery({
    queryKey: ["optics-outputs-paginated", page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Get count first
      let countQuery = supabase
        .from("optics_outputs")
        .select("*", { count: "exact", head: true });

      if (searchTerm) {
        countQuery = countQuery.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,nro_comprobante.ilike.%${searchTerm}%`
        );
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Get data
      let query = supabase
        .from("optics_outputs")
        .select(`
          *,
          product:optics_products(id, codigo, nombre, marca),
          patient:patients(id, first_name, last_name, dni)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(
          `product_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,nro_comprobante.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data: data as OpticsOutputPaginated[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
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
      queryClient.invalidateQueries({ queryKey: ["optics-outputs-paginated"] });
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
