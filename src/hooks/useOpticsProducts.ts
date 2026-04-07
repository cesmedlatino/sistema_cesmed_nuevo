import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OpticsProduct {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  ubicacion?: string;
  proveedor_id?: string;
  imagen_url?: string;
  material?: string;
  color?: string;
  tamanio?: string;
  genero?: string;
  indice_refraccion?: string;
  tratamiento?: string;
  tipo_lente?: string;
  fecha_ingreso?: string;
  status: string;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export function useOpticsProducts(limit?: number, searchTerm?: string, tipo?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["optics-products", limit, searchTerm, tipo, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("optics_products")
        .select(`
          *,
          supplier:pharmacy_suppliers(id, name)
        `)
        .order("created_at", { ascending: false });

      // Apply status filter (default to all if not specified)
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(
          `nombre.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`
        );
      }

      if (tipo && tipo !== "all") {
        query = query.eq("tipo", tipo);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OpticsProduct[];
    },
  });
}

export function useOpticsProductByCode(codigo: string) {
  return useQuery({
    queryKey: ["optics-product", codigo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optics_products")
        .select(`
          *,
          supplier:pharmacy_suppliers(id, name)
        `)
        .eq("codigo", codigo)
        .single();

      if (error) throw error;
      return data as OpticsProduct;
    },
    enabled: !!codigo,
  });
}

export function useOpticsProductById(id: string) {
  return useQuery({
    queryKey: ["optics-product-id", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optics_products")
        .select(`
          *,
          supplier:pharmacy_suppliers(id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as OpticsProduct;
    },
    enabled: !!id,
  });
}

export function useCreateOpticsProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (product: Omit<OpticsProduct, "id" | "created_at" | "updated_at" | "supplier">) => {
      const { data, error } = await supabase
        .from("optics_products")
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      toast({
        title: "Producto creado",
        description: "El producto se ha registrado correctamente.",
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

export function useUpdateOpticsProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<OpticsProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from("optics_products")
        .update({ ...product, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      toast({
        title: "Producto actualizado",
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

export function useDeleteOpticsProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("optics_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["optics-products"] });
      queryClient.invalidateQueries({ queryKey: ["optics-stats"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useOpticsStats() {
  return useQuery({
    queryKey: ["optics-stats"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("optics_products")
        .select("id, stock_actual, stock_minimo, precio_compra, precio_venta, tipo, status");

      if (error) throw error;

      const totalProducts = products?.length || 0;
      const lowStockCount = products?.filter(p => p.stock_actual <= p.stock_minimo).length || 0;
      const totalValue = products?.reduce((sum, p) => sum + (p.stock_actual * (p.precio_venta || 0)), 0) || 0;
      const monturas = products?.filter(p => p.tipo === "montura").length || 0;
      const lentes = products?.filter(p => ["lentes_contacto", "lentes_graduados"].includes(p.tipo)).length || 0;

      return {
        totalProducts,
        lowStockCount,
        totalValue,
        monturas,
        lentes,
      };
    },
  });
}
