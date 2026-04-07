import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getLocalDateString } from "@/lib/utils";

export interface PharmacyEntry {
  id: string;
  supplier_id?: string;
  invoice_number?: string;
  date: string;
  num_boxes?: number;
  medication_id?: string;
  product_code?: string;
  description?: string;
  pharmaceutical_form?: string;
  laboratory?: string;
  batch?: string;
  nsoc_rs?: string;
  expiry_date?: string;
  presentation?: string;
  quantity_requested?: number;
  quantity_received?: number;
  is_accepted?: boolean;
  observations?: string;
  purchase_cost_per_unit?: number;
  payment_type?: string;
  total_amount?: number;
  invoice_due_date?: string;
  payment_status: string;
  entry_type: string;
  created_at: string;
  medications?: any[];
  supplier?: {
    name: string;
  };
  medication?: {
    descripcion: string;
    codigo: string;
    precio_venta?: number;
  };
}

export const usePharmacyEntries = (
  limit: number = 100,
  filterType?: string,
  filterValue?: string,
  searchTerm?: string
) => {
  return useQuery({
    queryKey: ["pharmacy-entries", limit, filterType, filterValue, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("pharmacy_entries")
        .select(`
          *,
          supplier:pharmacy_suppliers(name),
          medication:pharmacy_medications(descripcion, codigo, precio_venta)
        `)
        .order("date", { ascending: false });

      // Apply date filters on server side
      if (filterType === "today") {
        const today = getLocalDateString();
        query = query.eq("date", today);
      } else if (filterType === "date" && filterValue) {
        query = query.eq("date", filterValue);
      } else if (filterType === "month" && filterValue) {
        const [year, month] = filterValue.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
        query = query.gte("date", startDate).lte("date", endDate);
      } else if (filterType === "year" && filterValue) {
        query = query.gte("date", `${filterValue}-01-01`).lte("date", `${filterValue}-12-31`);
      }

      // Apply search filter on server side if provided
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(
          `description.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%,laboratory.ilike.%${searchTerm}%`
        );
      }

      // Apply limit
      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PharmacyEntry[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const usePharmacyEntriesCount = () => {
  return useQuery({
    queryKey: ["pharmacy-entries-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pharmacy_entries")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });
};

export const usePharmacyEntriesByInvoice = (invoiceNumber?: string | null) => {
  return useQuery({
    queryKey: ["pharmacy-entries-by-invoice", invoiceNumber],
    queryFn: async () => {
      if (!invoiceNumber) return [];
      
      const { data, error } = await supabase
        .from("pharmacy_entries")
        .select(`
          *,
          supplier:pharmacy_suppliers(id, name),
          medication:pharmacy_medications(id, descripcion, codigo, precio_venta)
        `)
        .eq("invoice_number", invoiceNumber)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PharmacyEntry[];
    },
    enabled: !!invoiceNumber,
  });
};

export const useCreateEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: Omit<PharmacyEntry, "id" | "created_at" | "supplier" | "medication">) => {
      const { data, error } = await supabase
        .from("pharmacy_entries")
        .insert([entry])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
      toast({
        title: "Entrada registrada",
        description: "La entrada se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...entry }: Partial<PharmacyEntry> & { id: string }) => {
      console.log("Updating entry:", id, "with date:", entry.date);
      
      const { data, error } = await supabase
        .from("pharmacy_entries")
        .update({
          ...entry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      console.log("Updated entry result:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-by-invoice"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-count"] });
      toast({
        title: "Entrada actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error) => {
      console.error("Error updating entry:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la entrada.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
      toast({
        title: "Entrada eliminada",
        description: "La entrada se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la entrada.",
        variant: "destructive",
      });
    },
  });
};
