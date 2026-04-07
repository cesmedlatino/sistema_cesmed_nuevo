import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  } | null;
  medication?: {
    descripcion: string;
    codigo: string;
    precio_venta?: number;
  } | null;
}

export type FilterType = "all" | "today" | "date" | "month" | "year";

interface PaginatedEntriesParams {
  page: number;
  pageSize: number;
  filterType: FilterType;
  filterValue?: string;
  searchTerm?: string;
}

interface PaginatedResult {
  data: PharmacyEntry[];
  totalCount: number;
  totalPages: number;
}

// Get local date string in YYYY-MM-DD format
const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

// Build date filter conditions - returns null for "all" filter (no date restriction)
const getDateRange = (filterType: FilterType, filterValue?: string): { start: string; end: string } | null => {
  if (filterType === "all") {
    return null; // No date filter - show all records
  }
  
  if (filterType === "today") {
    const localDate = getLocalDateString();
    return { start: localDate, end: localDate };
  }
  
  if (filterType === "date" && filterValue) {
    return { start: filterValue, end: filterValue };
  }
  
  if (filterType === "month" && filterValue) {
    const [year, month] = filterValue.split("-");
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    };
  }
  
  if (filterType === "year" && filterValue) {
    return {
      start: `${filterValue}-01-01`,
      end: `${filterValue}-12-31`
    };
  }
  
  return null;
};

// Simple count query with supplier search
const getEntriesCount = async (
  filterType: FilterType,
  filterValue?: string,
  searchTerm?: string
): Promise<number> => {
  // If searching, we need to fetch data to filter by supplier name
  if (searchTerm && searchTerm.trim().length >= 2) {
    const term = searchTerm.trim().toLowerCase();
    
    let query = supabase
      .from("pharmacy_entries")
      .select(`
        id,
        product_code,
        description,
        invoice_number,
        laboratory,
        supplier:pharmacy_suppliers(name)
      `);

    // Apply date filter
    const dateRange = getDateRange(filterType, filterValue);
    if (dateRange) {
      query = query.gte("date", dateRange.start).lte("date", dateRange.end);
    }

    // Apply basic filters (product_code, description, invoice_number, laboratory)
    query = query.or(
      `product_code.ilike.%${term}%,description.ilike.%${term}%,invoice_number.ilike.%${term}%,laboratory.ilike.%${term}%`
    );

    const { data, error } = await query;
    
    if (error) {
      console.error("Count query error:", error);
      return 0;
    }

    // Filter by supplier name client-side
    const filtered = (data || []).filter((entry: any) => {
      const supplierName = entry.supplier?.name?.toLowerCase() || "";
      return supplierName.includes(term) ||
             entry.product_code?.toLowerCase().includes(term) ||
             entry.description?.toLowerCase().includes(term) ||
             entry.invoice_number?.toLowerCase().includes(term) ||
             entry.laboratory?.toLowerCase().includes(term);
    });

    return filtered.length;
  }

  // No search term - simple count
  let query = supabase
    .from("pharmacy_entries")
    .select("*", { count: "exact", head: true });

  const dateRange = getDateRange(filterType, filterValue);
  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end);
  }

  const { count, error } = await query;
  
  if (error) {
    console.error("Count query error:", error);
    return 0;
  }
  
  return count ?? 0;
};

// Paginated data query with supplier search
const getEntriesPage = async (
  page: number,
  pageSize: number,
  filterType: FilterType,
  filterValue?: string,
  searchTerm?: string
): Promise<PharmacyEntry[]> => {
  // If searching, fetch more data and filter client-side for supplier
  if (searchTerm && searchTerm.trim().length >= 2) {
    const term = searchTerm.trim().toLowerCase();
    
    let query = supabase
      .from("pharmacy_entries")
      .select(`
        id,
        supplier_id,
        invoice_number,
        date,
        num_boxes,
        medication_id,
        product_code,
        description,
        pharmaceutical_form,
        laboratory,
        batch,
        nsoc_rs,
        expiry_date,
        presentation,
        quantity_requested,
        quantity_received,
        is_accepted,
        observations,
        purchase_cost_per_unit,
        payment_type,
        total_amount,
        invoice_due_date,
        payment_status,
        entry_type,
        created_at,
        supplier:pharmacy_suppliers(name),
        medication:pharmacy_medications(descripcion, codigo, precio_venta)
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply date filter
    const dateRange = getDateRange(filterType, filterValue);
    if (dateRange) {
      query = query.gte("date", dateRange.start).lte("date", dateRange.end);
    }

    // Apply basic server-side filter
    query = query.or(
      `product_code.ilike.%${term}%,description.ilike.%${term}%,invoice_number.ilike.%${term}%,laboratory.ilike.%${term}%`
    );

    const { data, error } = await query;
    
    if (error) {
      console.error("Data query error:", error);
      return [];
    }

    // Filter by supplier name client-side and paginate
    const filtered = (data || []).filter((entry: any) => {
      const supplierName = entry.supplier?.name?.toLowerCase() || "";
      return supplierName.includes(term) ||
             entry.product_code?.toLowerCase().includes(term) ||
             entry.description?.toLowerCase().includes(term) ||
             entry.invoice_number?.toLowerCase().includes(term) ||
             entry.laboratory?.toLowerCase().includes(term);
    });

    const from = (page - 1) * pageSize;
    return filtered.slice(from, from + pageSize) as PharmacyEntry[];
  }

  // No search term - normal pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("pharmacy_entries")
    .select(`
      id,
      supplier_id,
      invoice_number,
      date,
      num_boxes,
      medication_id,
      product_code,
      description,
      pharmaceutical_form,
      laboratory,
      batch,
      nsoc_rs,
      expiry_date,
      presentation,
      quantity_requested,
      quantity_received,
      is_accepted,
      observations,
      purchase_cost_per_unit,
      payment_type,
      total_amount,
      invoice_due_date,
      payment_status,
      entry_type,
      created_at,
      supplier:pharmacy_suppliers(name),
      medication:pharmacy_medications(descripcion, codigo, precio_venta)
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const dateRange = getDateRange(filterType, filterValue);
  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Data query error:", error);
    return [];
  }
  
  return (data || []) as PharmacyEntry[];
};

export const usePharmacyEntriesPaginated = ({
  page,
  pageSize,
  filterType,
  filterValue,
  searchTerm
}: PaginatedEntriesParams) => {
  return useQuery({
    queryKey: ["pharmacy-entries-paginated", filterType, filterValue, searchTerm, page, pageSize],
    queryFn: async (): Promise<PaginatedResult> => {
      console.log("Fetching entries with:", { filterType, filterValue, searchTerm, page, pageSize });
      
      // Run count and data queries in parallel
      const [totalCount, data] = await Promise.all([
        getEntriesCount(filterType, filterValue, searchTerm),
        getEntriesPage(page, pageSize, filterType, filterValue, searchTerm)
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      console.log("Query results:", { totalCount, dataLength: data.length, totalPages });

      return {
        data,
        totalCount,
        totalPages
      };
    },
    staleTime: 60000, // 1 minute cache
    gcTime: 300000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
};

// Get filtered count for stats display
export const usePharmacyEntriesFilteredCount = (
  filterType: FilterType,
  filterValue?: string,
  searchTerm?: string
) => {
  return useQuery({
    queryKey: ["pharmacy-entries-count", filterType, filterValue, searchTerm],
    queryFn: () => getEntriesCount(filterType, filterValue, searchTerm),
    staleTime: 60000,
    gcTime: 300000,
    retry: 1,
  });
};

// Mutations
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
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-count"] });
      toast({
        title: "Entrada registrada",
        description: "La entrada se ha registrado correctamente.",
      });
    },
    onError: () => {
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
      const { data, error } = await supabase
        .from("pharmacy_entries")
        .update(entry)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-count"] });
      toast({
        title: "Entrada actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: () => {
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
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-entries-count"] });
      toast({
        title: "Entrada eliminada",
        description: "La entrada se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la entrada.",
        variant: "destructive",
      });
    },
  });
};
