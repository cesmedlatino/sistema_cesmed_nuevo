import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsMovement {
  id: string;
  product_id: string;
  movement_type: string;
  movement_reason: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost?: number;
  total_cost?: number;
  reference_document?: string;
  observations?: string;
  created_at: string;
  product?: {
    id: string;
    codigo: string;
    nombre: string;
  };
}

export function useOpticsMovements(productId?: string, limit?: number) {
  return useQuery({
    queryKey: ["optics-movements", productId, limit],
    queryFn: async () => {
      let query = supabase
        .from("optics_inventory_movements")
        .select(`
          *,
          product:optics_products(id, codigo, nombre)
        `)
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OpticsMovement[];
    },
  });
}

export function useCreateOpticsMovement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movement: Omit<OpticsMovement, "id" | "created_at" | "product">) => {
      const { data, error } = await supabase
        .from("optics_inventory_movements")
        .insert(movement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-movements"] });
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      toast({
        title: "Movimiento registrado",
        description: "El movimiento se ha registrado correctamente.",
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
