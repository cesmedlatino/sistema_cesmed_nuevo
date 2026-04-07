import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPPLIES_CATEGORIES } from "./useSuppliesProducts";

export interface KardexMovement {
  id: string;
  sistema: 'botica' | 'optica' | 'suministros';
  tipo_movimiento: 'entrada' | 'salida';
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  unidad: string;
  costo_unitario: number | null;
  costo_total: number | null;
  stock_anterior: number;
  stock_nuevo: number;
  saldo_valor: number;
  motivo: string;
  documento_referencia: string | null;
  observaciones: string | null;
  fecha: string;
  lote: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
}

export interface KardexSummary {
  sistema: string;
  total_productos: number;
  total_entradas: number;
  total_salidas: number;
  valor_inventario: number;
  productos_bajo_stock: number;
  total_valor_entradas: number;
  total_valor_salidas: number;
}

export interface KardexProductDetail {
  producto_codigo: string;
  producto_nombre: string;
  sistema: string;
  stock_actual: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  valor_inventario: number;
  movimientos: KardexMovement[];
}

// Hook para obtener movimientos consolidados de Kardex
export function useKardexMovements(filters?: {
  sistema?: string;
  fechaInicio?: string;
  fechaFin?: string;
  tipoMovimiento?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["kardex-movements", filters],
    queryFn: async () => {
      const movements: KardexMovement[] = [];
      
      // Obtener movimientos de Farmacia (Botica)
      if (!filters?.sistema || filters.sistema === 'botica') {
        let pharmacyQuery = supabase
          .from("pharmacy_entries")
          .select(`
            id,
            date,
            quantity_received,
            purchase_cost_per_unit,
            importe,
            invoice_number,
            observations,
            created_at,
            medication:pharmacy_medications(codigo, descripcion, stock_actual)
          `)
          .order("date", { ascending: false });
        
        if (filters?.fechaInicio) {
          pharmacyQuery = pharmacyQuery.gte("date", filters.fechaInicio);
        }
        if (filters?.fechaFin) {
          pharmacyQuery = pharmacyQuery.lte("date", filters.fechaFin);
        }
        if (filters?.limit) {
          pharmacyQuery = pharmacyQuery.limit(filters.limit);
        }

        const { data: pharmacyEntries } = await pharmacyQuery;
        
        pharmacyEntries?.forEach((entry: any) => {
          movements.push({
            id: entry.id,
            sistema: 'botica',
            tipo_movimiento: 'entrada',
            producto_codigo: entry.medication?.codigo || '',
            producto_nombre: entry.medication?.descripcion || '',
            cantidad: entry.quantity_received || 0,
            unidad: 'UND',
            costo_unitario: entry.purchase_cost_per_unit,
            costo_total: entry.importe,
            stock_anterior: (entry.medication?.stock_actual || 0) - (entry.quantity_received || 0),
            stock_nuevo: entry.medication?.stock_actual || 0,
            saldo_valor: (entry.medication?.stock_actual || 0) * (entry.purchase_cost_per_unit || 0),
            motivo: 'Compra',
            documento_referencia: entry.invoice_number,
            observaciones: entry.observations,
            fecha: entry.date,
            lote: null,
            fecha_vencimiento: null,
            created_at: entry.created_at,
          });
        });

        // Salidas de farmacia
        let pharmacyOutputQuery = supabase
          .from("pharmacy_outputs")
          .select(`
            id,
            date,
            quantity,
            sale_cost_per_unit,
            total,
            nro_comprobante,
            comments,
            tipo_salida,
            created_at,
            medication:pharmacy_medications(codigo, descripcion, stock_actual)
          `)
          .order("date", { ascending: false });

        if (filters?.fechaInicio) {
          pharmacyOutputQuery = pharmacyOutputQuery.gte("date", filters.fechaInicio);
        }
        if (filters?.fechaFin) {
          pharmacyOutputQuery = pharmacyOutputQuery.lte("date", filters.fechaFin);
        }
        if (filters?.limit) {
          pharmacyOutputQuery = pharmacyOutputQuery.limit(filters.limit);
        }

        const { data: pharmacyOutputs } = await pharmacyOutputQuery;

        pharmacyOutputs?.forEach((output: any) => {
          movements.push({
            id: output.id,
            sistema: 'botica',
            tipo_movimiento: 'salida',
            producto_codigo: output.medication?.codigo || '',
            producto_nombre: output.medication?.descripcion || '',
            cantidad: output.quantity || 0,
            unidad: 'UND',
            costo_unitario: output.sale_cost_per_unit,
            costo_total: output.total,
            stock_anterior: (output.medication?.stock_actual || 0) + (output.quantity || 0),
            stock_nuevo: output.medication?.stock_actual || 0,
            saldo_valor: (output.medication?.stock_actual || 0) * (output.sale_cost_per_unit || 0),
            motivo: output.tipo_salida || 'Venta',
            documento_referencia: output.nro_comprobante,
            observaciones: output.comments,
            fecha: output.date,
            lote: null,
            fecha_vencimiento: null,
            created_at: output.created_at,
          });
        });
      }

      // Obtener movimientos de Óptica
      if (!filters?.sistema || filters.sistema === 'optica') {
        let opticsEntryQuery = supabase
          .from("optics_entries")
          .select(`
            id,
            date,
            quantity_received,
            purchase_cost_per_unit,
            importe,
            invoice_number,
            observations,
            created_at,
            product:optics_products(codigo, nombre, stock_actual)
          `)
          .order("date", { ascending: false });

        if (filters?.fechaInicio) {
          opticsEntryQuery = opticsEntryQuery.gte("date", filters.fechaInicio);
        }
        if (filters?.fechaFin) {
          opticsEntryQuery = opticsEntryQuery.lte("date", filters.fechaFin);
        }
        if (filters?.limit) {
          opticsEntryQuery = opticsEntryQuery.limit(filters.limit);
        }

        const { data: opticsEntries } = await opticsEntryQuery;

        opticsEntries?.forEach((entry: any) => {
          movements.push({
            id: entry.id,
            sistema: 'optica',
            tipo_movimiento: 'entrada',
            producto_codigo: entry.product?.codigo || '',
            producto_nombre: entry.product?.nombre || '',
            cantidad: entry.quantity_received || 0,
            unidad: 'UND',
            costo_unitario: entry.purchase_cost_per_unit,
            costo_total: entry.importe,
            stock_anterior: (entry.product?.stock_actual || 0) - (entry.quantity_received || 0),
            stock_nuevo: entry.product?.stock_actual || 0,
            saldo_valor: (entry.product?.stock_actual || 0) * (entry.purchase_cost_per_unit || 0),
            motivo: 'Compra',
            documento_referencia: entry.invoice_number,
            observaciones: entry.observations,
            fecha: entry.date,
            lote: null,
            fecha_vencimiento: null,
            created_at: entry.created_at,
          });
        });

        // Salidas de óptica
        let opticsOutputQuery = supabase
          .from("optics_outputs")
          .select(`
            id,
            date,
            quantity,
            sale_cost_per_unit,
            total,
            nro_comprobante,
            comments,
            tipo_salida,
            created_at,
            product:optics_products(codigo, nombre, stock_actual)
          `)
          .order("date", { ascending: false });

        if (filters?.fechaInicio) {
          opticsOutputQuery = opticsOutputQuery.gte("date", filters.fechaInicio);
        }
        if (filters?.fechaFin) {
          opticsOutputQuery = opticsOutputQuery.lte("date", filters.fechaFin);
        }
        if (filters?.limit) {
          opticsOutputQuery = opticsOutputQuery.limit(filters.limit);
        }

        const { data: opticsOutputs } = await opticsOutputQuery;

        opticsOutputs?.forEach((output: any) => {
          movements.push({
            id: output.id,
            sistema: 'optica',
            tipo_movimiento: 'salida',
            producto_codigo: output.product?.codigo || '',
            producto_nombre: output.product?.nombre || '',
            cantidad: output.quantity || 0,
            unidad: 'UND',
            costo_unitario: output.sale_cost_per_unit,
            costo_total: output.total,
            stock_anterior: (output.product?.stock_actual || 0) + (output.quantity || 0),
            stock_nuevo: output.product?.stock_actual || 0,
            saldo_valor: (output.product?.stock_actual || 0) * (output.sale_cost_per_unit || 0),
            motivo: output.tipo_salida || 'Venta',
            documento_referencia: output.nro_comprobante,
            observaciones: output.comments,
            fecha: output.date,
            lote: null,
            fecha_vencimiento: null,
            created_at: output.created_at,
          });
        });
      }

      // Obtener movimientos de Suministros (filtrados por categoría de pharmacy_medications)
      if (!filters?.sistema || filters.sistema === 'suministros') {
        // Get supply medication IDs
        const { data: supplyMeds } = await supabase
          .from("pharmacy_medications")
          .select("id, codigo, descripcion, stock_actual, purchase_price, precio_venta")
          .in("category", SUPPLIES_CATEGORIES)
          .eq("status", "Activo");
        
        const supplyIds = (supplyMeds || []).map(m => m.id);
        const supplyMap = new Map((supplyMeds || []).map(m => [m.id, m]));
        
        if (supplyIds.length > 0) {
          // Entradas de suministros
          let suppliesEntryQuery = supabase
            .from("pharmacy_entries")
            .select(`
              id,
              date,
              quantity_received,
              purchase_cost_per_unit,
              importe,
              invoice_number,
              observations,
              batch,
              expiry_date,
              created_at,
              medication_id
            `)
            .in("medication_id", supplyIds)
            .order("date", { ascending: false });

          if (filters?.fechaInicio) {
            suppliesEntryQuery = suppliesEntryQuery.gte("date", filters.fechaInicio);
          }
          if (filters?.fechaFin) {
            suppliesEntryQuery = suppliesEntryQuery.lte("date", filters.fechaFin);
          }
          if (filters?.limit) {
            suppliesEntryQuery = suppliesEntryQuery.limit(filters.limit);
          }

          const { data: suppliesEntries } = await suppliesEntryQuery;

          suppliesEntries?.forEach((entry: any) => {
            const med = supplyMap.get(entry.medication_id);
            if (med) {
              movements.push({
                id: entry.id,
                sistema: 'suministros',
                tipo_movimiento: 'entrada',
                producto_codigo: med.codigo || '',
                producto_nombre: med.descripcion || '',
                cantidad: entry.quantity_received || 0,
                unidad: 'UND',
                costo_unitario: entry.purchase_cost_per_unit,
                costo_total: entry.importe,
                stock_anterior: (med.stock_actual || 0) - (entry.quantity_received || 0),
                stock_nuevo: med.stock_actual || 0,
                saldo_valor: (med.stock_actual || 0) * (entry.purchase_cost_per_unit || med.purchase_price || 0),
                motivo: 'Compra',
                documento_referencia: entry.invoice_number,
                observaciones: entry.observations,
                fecha: entry.date,
                lote: entry.batch,
                fecha_vencimiento: entry.expiry_date,
                created_at: entry.created_at,
              });
            }
          });

          // Salidas de suministros
          let suppliesOutputQuery = supabase
            .from("pharmacy_outputs")
            .select(`
              id,
              date,
              quantity,
              sale_cost_per_unit,
              total,
              nro_comprobante,
              comments,
              tipo_salida,
              created_at,
              medication_id
            `)
            .in("medication_id", supplyIds)
            .order("date", { ascending: false });

          if (filters?.fechaInicio) {
            suppliesOutputQuery = suppliesOutputQuery.gte("date", filters.fechaInicio);
          }
          if (filters?.fechaFin) {
            suppliesOutputQuery = suppliesOutputQuery.lte("date", filters.fechaFin);
          }
          if (filters?.limit) {
            suppliesOutputQuery = suppliesOutputQuery.limit(filters.limit);
          }

          const { data: suppliesOutputs } = await suppliesOutputQuery;

          suppliesOutputs?.forEach((output: any) => {
            const med = supplyMap.get(output.medication_id);
            if (med) {
              movements.push({
                id: output.id,
                sistema: 'suministros',
                tipo_movimiento: 'salida',
                producto_codigo: med.codigo || '',
                producto_nombre: med.descripcion || '',
                cantidad: output.quantity || 0,
                unidad: 'UND',
                costo_unitario: output.sale_cost_per_unit,
                costo_total: output.total,
                stock_anterior: (med.stock_actual || 0) + (output.quantity || 0),
                stock_nuevo: med.stock_actual || 0,
                saldo_valor: (med.stock_actual || 0) * (output.sale_cost_per_unit || med.precio_venta || 0),
                motivo: output.tipo_salida || 'Uso Interno',
                documento_referencia: output.nro_comprobante,
                observaciones: output.comments,
                fecha: output.date,
                lote: null,
                fecha_vencimiento: null,
                created_at: output.created_at,
              });
            }
          });
        }
      }

      // Ordenar por fecha descendente
      movements.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // Aplicar filtro de tipo de movimiento
      if (filters?.tipoMovimiento) {
        return movements.filter(m => m.tipo_movimiento === filters.tipoMovimiento);
      }

      return movements;
    },
  });
}

// Hook para obtener resumen de kardex por sistema
export function useKardexSummary() {
  return useQuery({
    queryKey: ["kardex-summary"],
    queryFn: async () => {
      const summaries: KardexSummary[] = [];

      // Resumen Botica
      const { data: pharmacyProducts } = await supabase
        .from("pharmacy_medications")
        .select("id, stock_actual, stock_minimo, precio_venta")
        .eq("status", "Activo");

      const { count: pharmacyEntriesCount } = await supabase
        .from("pharmacy_entries")
        .select("id", { count: 'exact', head: true });

      const { count: pharmacyOutputsCount } = await supabase
        .from("pharmacy_outputs")
        .select("id", { count: 'exact', head: true });

      const pharmacyValue = pharmacyProducts?.reduce((acc, p: any) => {
        return acc + ((p.stock_actual || 0) * (p.precio_venta || 0));
      }, 0) || 0;

      const pharmacyLowStock = pharmacyProducts?.filter((p: any) => {
        return (p.stock_actual || 0) <= (p.stock_minimo || 0);
      }).length || 0;

      // Calcular valor de entradas y salidas
      const { data: pharmacyEntriesData } = await supabase
        .from("pharmacy_entries")
        .select("importe");
      const pharmacyEntradasValor = pharmacyEntriesData?.reduce((acc: number, e: any) => acc + (e.importe || 0), 0) || 0;

      const { data: pharmacyOutputsData } = await supabase
        .from("pharmacy_outputs")
        .select("total");
      const pharmacySalidasValor = pharmacyOutputsData?.reduce((acc: number, o: any) => acc + (o.total || 0), 0) || 0;

      summaries.push({
        sistema: 'Botica',
        total_productos: pharmacyProducts?.length || 0,
        total_entradas: pharmacyEntriesCount || 0,
        total_salidas: pharmacyOutputsCount || 0,
        valor_inventario: pharmacyValue,
        productos_bajo_stock: pharmacyLowStock,
        total_valor_entradas: pharmacyEntradasValor,
        total_valor_salidas: pharmacySalidasValor,
      });

      // Resumen Óptica
      const { data: opticsProducts } = await supabase
        .from("optics_products")
        .select("id, stock_actual, stock_minimo, precio_venta")
        .eq("status", "Activo");

      const { count: opticsEntriesCount } = await supabase
        .from("optics_entries")
        .select("id", { count: 'exact', head: true });

      const { count: opticsOutputsCount } = await supabase
        .from("optics_outputs")
        .select("id", { count: 'exact', head: true });

      const opticsValue = opticsProducts?.reduce((acc, p: any) => {
        return acc + ((p.stock_actual || 0) * (p.precio_venta || 0));
      }, 0) || 0;

      const opticsLowStock = opticsProducts?.filter((p: any) => {
        return (p.stock_actual || 0) <= (p.stock_minimo || 0);
      }).length || 0;

      const { data: opticsEntriesData } = await supabase
        .from("optics_entries")
        .select("importe");
      const opticsEntradasValor = opticsEntriesData?.reduce((acc: number, e: any) => acc + (e.importe || 0), 0) || 0;

      const { data: opticsOutputsData } = await supabase
        .from("optics_outputs")
        .select("total");
      const opticsSalidasValor = opticsOutputsData?.reduce((acc: number, o: any) => acc + (o.total || 0), 0) || 0;

      summaries.push({
        sistema: 'Óptica',
        total_productos: opticsProducts?.length || 0,
        total_entradas: opticsEntriesCount || 0,
        total_salidas: opticsOutputsCount || 0,
        valor_inventario: opticsValue,
        productos_bajo_stock: opticsLowStock,
        total_valor_entradas: opticsEntradasValor,
        total_valor_salidas: opticsSalidasValor,
      });

      // Resumen Suministros - datos reales
      const { data: suppliesProducts } = await supabase
        .from("pharmacy_medications")
        .select("id, stock_actual, min_stock_level, precio_venta, purchase_price")
        .eq("status", "Activo")
        .in("category", SUPPLIES_CATEGORIES);

      const supplyIds = (suppliesProducts || []).map((p: any) => p.id);

      let suppliesEntriesCount = 0;
      let suppliesOutputsCount = 0;
      let suppliesEntradasValor = 0;
      let suppliesSalidasValor = 0;

      if (supplyIds.length > 0) {
        const { count: entriesCount } = await supabase
          .from("pharmacy_entries")
          .select("id", { count: 'exact', head: true })
          .in("medication_id", supplyIds);
        suppliesEntriesCount = entriesCount || 0;

        const { count: outputsCount } = await supabase
          .from("pharmacy_outputs")
          .select("id", { count: 'exact', head: true })
          .in("medication_id", supplyIds);
        suppliesOutputsCount = outputsCount || 0;

        const { data: supEntriesData } = await supabase
          .from("pharmacy_entries")
          .select("importe")
          .in("medication_id", supplyIds);
        suppliesEntradasValor = supEntriesData?.reduce((acc: number, e: any) => acc + (e.importe || 0), 0) || 0;

        const { data: supOutputsData } = await supabase
          .from("pharmacy_outputs")
          .select("total")
          .in("medication_id", supplyIds);
        suppliesSalidasValor = supOutputsData?.reduce((acc: number, o: any) => acc + (o.total || 0), 0) || 0;
      }

      const suppliesValue = suppliesProducts?.reduce((acc: number, p: any) => {
        return acc + ((p.stock_actual || 0) * (p.precio_venta || 0));
      }, 0) || 0;

      const suppliesLowStock = suppliesProducts?.filter((p: any) => {
        return (p.stock_actual || 0) <= (p.min_stock_level || 0);
      }).length || 0;

      summaries.push({
        sistema: 'Suministros',
        total_productos: suppliesProducts?.length || 0,
        total_entradas: suppliesEntriesCount,
        total_salidas: suppliesOutputsCount,
        valor_inventario: suppliesValue,
        productos_bajo_stock: suppliesLowStock,
        total_valor_entradas: suppliesEntradasValor,
        total_valor_salidas: suppliesSalidasValor,
      });

      return summaries;
    },
  });
}

// Hook para obtener estadísticas de movimientos por período
export function useKardexStats(periodo: 'dia' | 'semana' | 'mes' = 'mes') {
  return useQuery({
    queryKey: ["kardex-stats", periodo],
    queryFn: async () => {
      const today = new Date();
      let startDate: string;

      switch (periodo) {
        case 'dia':
          startDate = today.toISOString().split('T')[0];
          break;
        case 'semana':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'mes':
        default:
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
      }

      // Entradas por sistema
      const { data: pharmacyEntries } = await supabase
        .from("pharmacy_entries")
        .select("importe")
        .gte("date", startDate);

      const { data: opticsEntries } = await supabase
        .from("optics_entries")
        .select("importe")
        .gte("date", startDate);

      // Salidas por sistema
      const { data: pharmacyOutputs } = await supabase
        .from("pharmacy_outputs")
        .select("total")
        .gte("date", startDate);

      const { data: opticsOutputs } = await supabase
        .from("optics_outputs")
        .select("total")
        .gte("date", startDate);

      // Suministros stats
      const { data: supplyMeds } = await supabase
        .from("pharmacy_medications")
        .select("id")
        .in("category", SUPPLIES_CATEGORIES)
        .eq("status", "Activo");
      
      const supplyIds = (supplyMeds || []).map(m => m.id);

      let suppliesEntriesTotal = 0;
      let suppliesOutputsTotal = 0;
      let suppliesEntriesCount = 0;
      let suppliesOutputsCount = 0;

      if (supplyIds.length > 0) {
        const { data: supEntries } = await supabase
          .from("pharmacy_entries")
          .select("importe")
          .in("medication_id", supplyIds)
          .gte("date", startDate);
        suppliesEntriesTotal = supEntries?.reduce((acc: number, e: any) => acc + (e.importe || 0), 0) || 0;
        suppliesEntriesCount = supEntries?.length || 0;

        const { data: supOutputs } = await supabase
          .from("pharmacy_outputs")
          .select("total")
          .in("medication_id", supplyIds)
          .gte("date", startDate);
        suppliesOutputsTotal = supOutputs?.reduce((acc: number, o: any) => acc + (o.total || 0), 0) || 0;
        suppliesOutputsCount = supOutputs?.length || 0;
      }

      return {
        entradas: {
          botica: pharmacyEntries?.reduce((acc, e: any) => acc + (e.importe || 0), 0) || 0,
          optica: opticsEntries?.reduce((acc, e: any) => acc + (e.importe || 0), 0) || 0,
          suministros: suppliesEntriesTotal,
        },
        salidas: {
          botica: pharmacyOutputs?.reduce((acc, o: any) => acc + (o.total || 0), 0) || 0,
          optica: opticsOutputs?.reduce((acc, o: any) => acc + (o.total || 0), 0) || 0,
          suministros: suppliesOutputsTotal,
        },
        conteos: {
          entradas: (pharmacyEntries?.length || 0) + (opticsEntries?.length || 0) + suppliesEntriesCount,
          salidas: (pharmacyOutputs?.length || 0) + (opticsOutputs?.length || 0) + suppliesOutputsCount,
        }
      };
    },
  });
}

// Hook para obtener Kardex de un producto específico (formato contable)
export function useKardexProducto(sistema: string, productoCodigo: string) {
  return useQuery({
    queryKey: ["kardex-producto", sistema, productoCodigo],
    queryFn: async () => {
      if (!productoCodigo) return null;

      let producto: any = null;
      const movimientos: KardexMovement[] = [];

      if (sistema === 'botica') {
        const { data: med } = await supabase
          .from("pharmacy_medications")
          .select("*")
          .eq("codigo", productoCodigo)
          .single();
        
        if (med) {
          producto = {
            codigo: med.codigo,
            nombre: med.descripcion,
            stock_actual: med.stock_actual,
            stock_minimo: med.min_stock_level,
            precio_compra: med.purchase_price,
            precio_venta: med.precio_venta,
          };

          // Get entries
          const { data: entries } = await supabase
            .from("pharmacy_entries")
            .select("*")
            .eq("medication_id", med.id)
            .order("date", { ascending: true });

          // Get outputs
          const { data: outputs } = await supabase
            .from("pharmacy_outputs")
            .select("*")
            .eq("medication_id", med.id)
            .order("date", { ascending: true });

          // Combine and sort
          const allMov = [
            ...(entries || []).map((e: any) => ({ ...e, tipo: 'entrada' })),
            ...(outputs || []).map((o: any) => ({ ...o, tipo: 'salida' })),
          ].sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

          let saldoCantidad = 0;
          let saldoValor = 0;

          allMov.forEach((m: any) => {
            const cantidad = m.tipo === 'entrada' ? (m.quantity_received || 0) : (m.quantity || 0);
            const costoUnit = m.tipo === 'entrada' ? (m.purchase_cost_per_unit || 0) : (m.sale_cost_per_unit || 0);
            const stockAnterior = saldoCantidad;
            
            if (m.tipo === 'entrada') {
              saldoCantidad += cantidad;
              saldoValor += cantidad * costoUnit;
            } else {
              saldoCantidad -= cantidad;
              saldoValor -= cantidad * costoUnit;
            }

            movimientos.push({
              id: m.id,
              sistema: 'botica',
              tipo_movimiento: m.tipo,
              producto_codigo: productoCodigo,
              producto_nombre: producto.nombre,
              cantidad,
              unidad: 'UND',
              costo_unitario: costoUnit,
              costo_total: cantidad * costoUnit,
              stock_anterior: stockAnterior,
              stock_nuevo: saldoCantidad,
              saldo_valor: saldoValor,
              motivo: m.tipo === 'entrada' ? 'Compra' : (m.tipo_salida || 'Venta'),
              documento_referencia: m.invoice_number || m.nro_comprobante,
              observaciones: m.observations || m.comments,
              fecha: m.date,
              lote: m.batch,
              fecha_vencimiento: m.expiry_date,
              created_at: m.created_at,
            });
          });
        }
      } else if (sistema === 'optica') {
        const { data: prod } = await supabase
          .from("optics_products")
          .select("*")
          .eq("codigo", productoCodigo)
          .single();
        
        if (prod) {
          producto = {
            codigo: prod.codigo,
            nombre: prod.nombre,
            stock_actual: prod.stock_actual,
            stock_minimo: prod.stock_minimo,
            precio_compra: prod.precio_compra,
            precio_venta: prod.precio_venta,
          };

          const { data: entries } = await supabase
            .from("optics_entries")
            .select("*")
            .eq("product_id", prod.id)
            .order("date", { ascending: true });

          const { data: outputs } = await supabase
            .from("optics_outputs")
            .select("*")
            .eq("product_id", prod.id)
            .order("date", { ascending: true });

          const allMov = [
            ...(entries || []).map((e: any) => ({ ...e, tipo: 'entrada' })),
            ...(outputs || []).map((o: any) => ({ ...o, tipo: 'salida' })),
          ].sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

          let saldoCantidad = 0;
          let saldoValor = 0;

          allMov.forEach((m: any) => {
            const cantidad = m.tipo === 'entrada' ? (m.quantity_received || 0) : (m.quantity || 0);
            const costoUnit = m.tipo === 'entrada' ? (m.purchase_cost_per_unit || 0) : (m.sale_cost_per_unit || 0);
            const stockAnterior = saldoCantidad;
            
            if (m.tipo === 'entrada') {
              saldoCantidad += cantidad;
              saldoValor += cantidad * costoUnit;
            } else {
              saldoCantidad -= cantidad;
              saldoValor -= cantidad * costoUnit;
            }

            movimientos.push({
              id: m.id,
              sistema: 'optica',
              tipo_movimiento: m.tipo,
              producto_codigo: productoCodigo,
              producto_nombre: producto.nombre,
              cantidad,
              unidad: 'UND',
              costo_unitario: costoUnit,
              costo_total: cantidad * costoUnit,
              stock_anterior: stockAnterior,
              stock_nuevo: saldoCantidad,
              saldo_valor: saldoValor,
              motivo: m.tipo === 'entrada' ? 'Compra' : (m.tipo_salida || 'Venta'),
              documento_referencia: m.invoice_number || m.nro_comprobante,
              observaciones: m.observations || m.comments,
              fecha: m.date,
              lote: m.lote,
              fecha_vencimiento: null,
              created_at: m.created_at,
            });
          });
        }
      } else if (sistema === 'suministros') {
        const { data: med } = await supabase
          .from("pharmacy_medications")
          .select("*")
          .eq("codigo", productoCodigo)
          .in("category", SUPPLIES_CATEGORIES)
          .single();
        
        if (med) {
          producto = {
            codigo: med.codigo,
            nombre: med.descripcion,
            stock_actual: med.stock_actual,
            stock_minimo: med.min_stock_level,
            precio_compra: med.purchase_price,
            precio_venta: med.precio_venta,
          };

          const { data: entries } = await supabase
            .from("pharmacy_entries")
            .select("*")
            .eq("medication_id", med.id)
            .order("date", { ascending: true });

          const { data: outputs } = await supabase
            .from("pharmacy_outputs")
            .select("*")
            .eq("medication_id", med.id)
            .order("date", { ascending: true });

          const allMov = [
            ...(entries || []).map((e: any) => ({ ...e, tipo: 'entrada' })),
            ...(outputs || []).map((o: any) => ({ ...o, tipo: 'salida' })),
          ].sort((a, b) => new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime());

          let saldoCantidad = 0;
          let saldoValor = 0;

          allMov.forEach((m: any) => {
            const cantidad = m.tipo === 'entrada' ? (m.quantity_received || 0) : (m.quantity || 0);
            const costoUnit = m.tipo === 'entrada' ? (m.purchase_cost_per_unit || 0) : (m.sale_cost_per_unit || 0);
            const stockAnterior = saldoCantidad;
            
            if (m.tipo === 'entrada') {
              saldoCantidad += cantidad;
              saldoValor += cantidad * costoUnit;
            } else {
              saldoCantidad -= cantidad;
              saldoValor -= cantidad * costoUnit;
            }

            movimientos.push({
              id: m.id,
              sistema: 'suministros',
              tipo_movimiento: m.tipo,
              producto_codigo: productoCodigo,
              producto_nombre: producto.nombre,
              cantidad,
              unidad: 'UND',
              costo_unitario: costoUnit,
              costo_total: cantidad * costoUnit,
              stock_anterior: stockAnterior,
              stock_nuevo: saldoCantidad,
              saldo_valor: saldoValor,
              motivo: m.tipo === 'entrada' ? 'Compra' : (m.tipo_salida || 'Uso Interno'),
              documento_referencia: m.invoice_number || m.nro_comprobante,
              observaciones: m.observations || m.comments,
              fecha: m.date,
              lote: m.batch,
              fecha_vencimiento: m.expiry_date,
              created_at: m.created_at,
            });
          });
        }
      }

      if (!producto) return null;

      return {
        producto_codigo: producto.codigo,
        producto_nombre: producto.nombre,
        sistema,
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo,
        precio_compra: producto.precio_compra,
        precio_venta: producto.precio_venta,
        valor_inventario: producto.stock_actual * (producto.precio_compra || 0),
        movimientos,
      } as KardexProductDetail;
    },
    enabled: !!productoCodigo && !!sistema,
  });
}
