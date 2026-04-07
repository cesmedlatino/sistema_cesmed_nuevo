import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getLocalDateString } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

export interface PharmacyOutput {
  id: string;
  date: string;
  medication_id?: string;
  product_code?: string;
  description?: string;
  quantity: number;
  sale_cost_per_unit?: number;
  total?: number;
  comments?: string;
  created_at: string;
  tipo_salida?: string;
  nro_comprobante?: string;
  patient_id?: string;
  supplier_id?: string;
  motivo_ajuste?: string;
  medications?: Json;
  medication?: {
    descripcion: string;
    codigo: string;
    laboratorio?: string;
  };
  patient?: {
    first_name: string;
    last_name: string;
    dni: string;
  };
  supplier?: {
    name: string;
  };
}

export const usePharmacyOutputs = (
  limit: number = 100,
  filterType?: string,
  filterValue?: string,
  searchTerm?: string
) => {
  return useQuery({
    queryKey: ["pharmacy-outputs", limit, filterType, filterValue, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("pharmacy_outputs")
        .select(`
          *,
          medication:pharmacy_medications(descripcion, codigo, laboratorio),
          patient:patients(first_name, last_name, dni),
          supplier:pharmacy_suppliers(name)
        `)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      // Apply date filters on server side
      if (filterType === "today") {
        const today = getLocalDateString();
        query = query.eq("date", today);
      } else if (filterType === "date" && filterValue) {
        query = query.eq("date", filterValue);
      } else if (filterType === "month" && filterValue) {
        const [year, month] = filterValue.split("-");
        const startDate = `${year}-${month}-01`;
        const endDateObj = new Date(parseInt(year, 10), parseInt(month, 10), 0);
        const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
        query = query.gte("date", startDate).lte("date", endDate);
      } else if (filterType === "year" && filterValue) {
        query = query.gte("date", `${filterValue}-01-01`).lte("date", `${filterValue}-12-31`);
      }

      // Apply search filter on server side if provided
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(
          `description.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%,tipo_salida.ilike.%${searchTerm}%,nro_comprobante.ilike.%${searchTerm}%`
        );
      }

      // Apply limit
      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PharmacyOutput[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const usePharmacyOutputsCount = () => {
  return useQuery({
    queryKey: ["pharmacy-outputs-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pharmacy_outputs")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });
};

export const useCreateOutput = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (output: Omit<PharmacyOutput, "id" | "created_at" | "medication">) => {
      const { data, error } = await supabase
        .from("pharmacy_outputs")
        .insert([output])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-outputs"] });
      toast({
        title: "Salida registrada",
        description: "La salida se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar la salida.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOutput = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...output }: Partial<PharmacyOutput> & { id: string }) => {
      const { data, error } = await supabase
        .from("pharmacy_outputs")
        .update(output)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-outputs"] });
      toast({
        title: "Salida actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la salida.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteOutput = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_outputs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-outputs"] });
      toast({
        title: "Salida eliminada",
        description: "La salida se ha eliminado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la salida.",
        variant: "destructive",
      });
    },
  });
};
