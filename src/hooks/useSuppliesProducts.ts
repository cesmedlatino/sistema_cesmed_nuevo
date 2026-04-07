import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchActiveSuppliesCategoryNames } from "@/hooks/useSuppliesCategories";

// Categories specific to medical supplies
export const SUPPLIES_CATEGORIES = [
  "Material de curación",
  "Material descartable", 
  "Instrumental menor",
  "Insumos de limpieza"
];

export interface SuppliesProduct {
  id: string;
  codigo: string;
  descripcion: string;
  category: string;
  presentation: string;
  ubicacion: string;
  stock_actual: number;
  min_stock_level: number;
  purchase_price: number;
  precio_venta: number;
  supplier_id: string | null;
  supplier_name?: string;
  status: string;
  laboratorio?: string;
  lote?: string;
  fecha_vencimiento?: string;
  created_at: string;
  updated_at?: string;
}

// Type for database row with category
interface DbMedicationWithCategory {
  id: string;
  codigo: string;
  descripcion: string;
  category: string | null;
  presentation: string | null;
  ubicacion: string | null;
  stock_actual: number;
  min_stock_level: number;
  purchase_price: number | null;
  precio_venta: number | null;
  supplier_id: string | null;
  status: string;
  laboratorio: string | null;
  lote: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
  updated_at: string | null;
  supplier?: { name: string } | null;
}

export function useSuppliesProducts(limit?: number, searchTerm?: string, category?: string) {
  return useQuery({
    queryKey: ["supplies-products", limit, searchTerm, category],
    queryFn: async () => {
      const activeCategories = await fetchActiveSuppliesCategoryNames().catch(() => SUPPLIES_CATEGORIES);
      const allowedCategories = activeCategories.length ? activeCategories : SUPPLIES_CATEGORIES;

      let query = supabase
        .from("pharmacy_medications")
        .select("*, supplier:pharmacy_suppliers(name)")
        .eq("status", "Activo")
        .order("descripcion", { ascending: true });

      // Filter by supplies categories
      query = query.in("category", allowedCategories);

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      if (searchTerm) {
        query = query.or(`codigo.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return ((data || []) as unknown as DbMedicationWithCategory[]).map(row => ({
        id: row.id,
        codigo: row.codigo,
        descripcion: row.descripcion,
        category: row.category || "",
        presentation: row.presentation || "",
        ubicacion: row.ubicacion || "",
        stock_actual: row.stock_actual || 0,
        min_stock_level: row.min_stock_level || 0,
        purchase_price: row.purchase_price || 0,
        precio_venta: row.precio_venta || 0,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier?.name,
        status: row.status,
        laboratorio: row.laboratorio,
        lote: row.lote,
        fecha_vencimiento: row.fecha_vencimiento,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })) as SuppliesProduct[];
    },
  });
}

export function useSuppliesProductByCode(codigo: string) {
  return useQuery({
    queryKey: ["supplies-product", codigo],
    queryFn: async () => {
      const activeCategories = await fetchActiveSuppliesCategoryNames().catch(() => SUPPLIES_CATEGORIES);
      const allowedCategories = activeCategories.length ? activeCategories : SUPPLIES_CATEGORIES;

      const { data, error } = await supabase
        .from("pharmacy_medications")
        .select("*, supplier:pharmacy_suppliers(name)")
        .eq("codigo", codigo)
        .in("category", allowedCategories)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      const row = data as unknown as DbMedicationWithCategory;
      return {
        id: row.id,
        codigo: row.codigo,
        descripcion: row.descripcion,
        category: row.category || "",
        presentation: row.presentation || "",
        ubicacion: row.ubicacion || "",
        stock_actual: row.stock_actual || 0,
        min_stock_level: row.min_stock_level || 0,
        purchase_price: row.purchase_price || 0,
        precio_venta: row.precio_venta || 0,
        supplier_id: row.supplier_id,
        supplier_name: row.supplier?.name,
        status: row.status,
        laboratorio: row.laboratorio,
        lote: row.lote,
        fecha_vencimiento: row.fecha_vencimiento,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as SuppliesProduct;
    },
    enabled: !!codigo,
  });
}

interface StatsRow {
  id: string;
  stock_actual: number;
  min_stock_level: number;
  precio_venta: number | null;
  category: string | null;
}

export function useSuppliesStats() {
  return useQuery({
    queryKey: ["supplies-stats"],
    queryFn: async () => {
      const activeCategories = await fetchActiveSuppliesCategoryNames().catch(() => SUPPLIES_CATEGORIES);
      const allowedCategories = activeCategories.length ? activeCategories : SUPPLIES_CATEGORIES;

      const { data, error } = await supabase
        .from("pharmacy_medications")
        .select("id, stock_actual, min_stock_level, precio_venta, category")
        .eq("status", "Activo")
        .in("category", allowedCategories);

      if (error) throw error;

      const products = (data || []) as unknown as StatsRow[];
      const totalProducts = products.length;
      const lowStockCount = products.filter(p => p.stock_actual <= p.min_stock_level).length;
      const outOfStockCount = products.filter(p => p.stock_actual <= 0).length;
      const totalValue = products.reduce((sum, p) => sum + (p.stock_actual * (p.precio_venta || 0)), 0);

      // Count by category
      const byCategory: Record<string, number> = {};
      allowedCategories.forEach(cat => {
        byCategory[cat] = products.filter(p => p.category === cat).length;
      });

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalValue,
        byCategory,
      };
    },
  });
}

export function useCreateSuppliesProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<SuppliesProduct>) => {
      const insertData = {
        codigo: product.codigo,
        descripcion: product.descripcion || "",
        category: product.category,
        presentation: product.presentation,
        ubicacion: product.ubicacion,
        stock_actual: product.stock_actual || 0,
        min_stock_level: product.min_stock_level || 5,
        purchase_price: product.purchase_price || 0,
        precio_venta: product.precio_venta || 0,
        supplier_id: product.supplier_id,
        laboratorio: product.laboratorio,
        status: "Activo",
      };

      const { data, error } = await supabase
        .from("pharmacy_medications")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Suministro creado correctamente");
    },
    onError: (error) => {
      console.error("Error creating supply:", error);
      toast.error("Error al crear el suministro");
    },
  });
}

export function useUpdateSuppliesProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<SuppliesProduct> & { id: string }) => {
      const { id, supplier_name: _supplier_name, created_at: _created_at, updated_at: _updated_at, ...rest } = product;
      
      // Build update object without the excluded fields
      const updateData: Record<string, unknown> = {};
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const { data, error } = await supabase
        .from("pharmacy_medications")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Suministro actualizado correctamente");
    },
    onError: (error) => {
      console.error("Error updating supply:", error);
      toast.error("Error al actualizar el suministro");
    },
  });
}

export function useDeleteSuppliesProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_medications")
        .update({ status: "Inactivo" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies-products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies-stats"] });
      toast.success("Suministro eliminado correctamente");
    },
    onError: (error) => {
      console.error("Error deleting supply:", error);
      toast.error("Error al eliminar el suministro");
    },
  });
}
