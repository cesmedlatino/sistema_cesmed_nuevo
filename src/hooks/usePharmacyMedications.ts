
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getNextPharmacyMedicationCode } from "@/lib/pharmacy/medicationCodes";

export interface PharmacyMedication {
  id: string;
  ubicacion?: string;
  codigo: string;
  descripcion: string;
  forma_farmaceutica?: string;
  laboratorio?: string;
  presentation: string;
  concentration?: string;
  barcode?: string;
  supplier_id?: string;
  lote?: string;
  fecha_vencimiento?: string;
  stock_inicial: number;
  entrada: number;
  salida: number;
  stock_actual: number;
  min_stock_level: number;
  purchase_price?: number;
  igv_unitario?: number;
  importe_unitario?: number;
  porcentaje_ganancia?: number;
  importe_ganancia?: number;
  precio_venta?: number;
  days_before_expiry_alert: number;
  status: string;
  comentarios?: string;
  formula_magistral?: boolean;
  created_at: string;
  supplier?: {
    name: string;
  };
}

export const usePharmacyMedications = (
  limit: number = 500,
  searchTerm?: string
) => {
  return useQuery({
    queryKey: ["pharmacy-medications", limit, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("pharmacy_medications")
        .select(`
          *,
          supplier:pharmacy_suppliers(name)
        `)
        .eq("status", "Activo")
        .order("descripcion");

      // Apply search filter on server side if provided
      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(
          `descripcion.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,laboratorio.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`
        );
      }

      // Apply limit
      if (limit > 0) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PharmacyMedication[];
    },
    staleTime: 60000, // Cache for 1 minute
  });
};

export const useNextMedicationCode = () => {
  return useQuery({
    queryKey: ["next-medication-code"],
    queryFn: async () => {
      // Importante: Supabase limita a 1000 filas por defecto; paginamos para no repetir códigos.
      return await getNextPharmacyMedicationCode("P", 0);
    },
  });
};

export const useCreateMedication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      medication: Omit<PharmacyMedication, "id" | "created_at" | "supplier">
    ) => {
      const insertMedication = async (
        payload: Omit<PharmacyMedication, "id" | "created_at" | "supplier">
      ) => {
        const { data, error } = await supabase
          .from("pharmacy_medications")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return data;
      };

      try {
        return await insertMedication(medication);
      } catch (err: any) {
        // Si el código calculado se repite (por límite 1000 o concurrencia), reintentamos una vez.
        if (
          err?.code === "23505" &&
          typeof err?.message === "string" &&
          err.message.includes("pharmacy_medications_codigo_key")
        ) {
          const freshCode = await getNextPharmacyMedicationCode("P", 0);
          return await insertMedication({ ...medication, codigo: freshCode });
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
      queryClient.invalidateQueries({ queryKey: ["next-medication-code"] });
      toast({
        title: "Medicamento creado",
        description: "El medicamento se ha registrado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el medicamento.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMedication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...medication }: Partial<PharmacyMedication> & { id: string }) => {
      // Get current local datetime with timezone offset
      const now = new Date();
      const tzOffset = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(tzOffset) / 60).toString().padStart(2, '0');
      const offsetMinutes = (Math.abs(tzOffset) % 60).toString().padStart(2, '0');
      const offsetSign = tzOffset >= 0 ? '+' : '-';
      const localTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}${offsetSign}${offsetHours}:${offsetMinutes}`;
      
      const { data, error } = await supabase
        .from("pharmacy_medications")
        .update({
          ...medication,
          updated_at: localTimestamp,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
      toast({
        title: "Medicamento actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el medicamento.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteMedication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_medications")
        .update({ status: "Inactivo" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
      toast({
        title: "Producto marcado como inactivo",
        description: "El producto ya no se mostrará en el inventario.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo marcar el producto como inactivo.",
        variant: "destructive",
      });
    },
  });
};

export const usePermanentDeleteMedication = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_medications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
      toast({
        title: "Producto eliminado permanentemente",
        description: "El producto ha sido eliminado de forma permanente del sistema.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto permanentemente.",
        variant: "destructive",
      });
    },
  });
};
