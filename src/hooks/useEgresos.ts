import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EgresoCategoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface EgresoConcepto {
  id: string;
  nombre: string;
  categoria_id: string | null;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  categoria?: EgresoCategoria;
}

export interface Egreso {
  id: string;
  concepto_id: string | null;
  categoria_id: string | null;
  monto: number;
  fecha: string;
  hora: string;
  turno: string;
  modalidad_id: string | null;
  descripcion: string | null;
  comprobante_referencia: string | null;
  created_at: string;
  concepto?: EgresoConcepto;
  categoria?: EgresoCategoria;
  modalidad?: { id: string; nombre: string };
}

export interface EgresoFilters {
  fechaDesde: string;
  fechaHasta: string;
  categoriaId: string | null;
  conceptoId: string | null;
  turno: string | null;
  modalidadId: string | null;
}

// Calcular turno basado en la hora
export function getTurno(hora: string): "Mañana" | "Tarde" {
  const [hours, minutes] = hora.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  // 15:30 = 930 minutos totales
  return totalMinutes >= 930 ? "Tarde" : "Mañana";
}

export function useEgresos(filters: EgresoFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categorías
  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ["egreso-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egreso_categorias")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data as EgresoCategoria[];
    },
  });

  // Fetch conceptos
  const { data: conceptos = [], isLoading: loadingConceptos } = useQuery({
    queryKey: ["egreso-conceptos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egreso_conceptos")
        .select("*, categoria:egreso_categorias(*)")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data as EgresoConcepto[];
    },
  });

  // Fetch modalidades de pago
  const { data: modalidades = [] } = useQuery({
    queryKey: ["modalidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modalidad")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data;
    },
  });

  // Fetch egresos con filtros
  const { data: egresos = [], isLoading: loadingEgresos, refetch } = useQuery({
    queryKey: ["egresos", filters],
    queryFn: async () => {
      let query = supabase
        .from("egresos")
        .select(`
          *,
          concepto:egreso_conceptos(*),
          categoria:egreso_categorias(*),
          modalidad:modalidad(*)
        `)
        .gte("fecha", filters.fechaDesde)
        .lte("fecha", filters.fechaHasta)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

      if (filters.categoriaId) {
        query = query.eq("categoria_id", filters.categoriaId);
      }
      if (filters.conceptoId) {
        query = query.eq("concepto_id", filters.conceptoId);
      }
      if (filters.turno) {
        query = query.eq("turno", filters.turno);
      }
      if (filters.modalidadId) {
        query = query.eq("modalidad_id", filters.modalidadId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Egreso[];
    },
  });

  // Crear egreso
  const createEgreso = useMutation({
    mutationFn: async (egreso: {
      concepto_id: string;
      categoria_id: string;
      monto: number;
      fecha: string;
      hora: string;
      modalidad_id: string;
      descripcion?: string;
      comprobante_referencia?: string;
    }) => {
      const turno = getTurno(egreso.hora);
      const { data, error } = await supabase
        .from("egresos")
        .insert([{ ...egreso, turno }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egresos"] });
      toast({ title: "Egreso registrado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al registrar egreso", description: error.message, variant: "destructive" });
    },
  });

  // Actualizar egreso
  const updateEgreso = useMutation({
    mutationFn: async ({ id, ...egreso }: Partial<Egreso> & { id: string }) => {
      const turno = egreso.hora ? getTurno(egreso.hora) : undefined;
      const { data, error } = await supabase
        .from("egresos")
        .update({ ...egreso, ...(turno && { turno }) })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egresos"] });
      toast({ title: "Egreso actualizado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar egreso", description: error.message, variant: "destructive" });
    },
  });

  // Eliminar egreso
  const deleteEgreso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("egresos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egresos"] });
      toast({ title: "Egreso eliminado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar egreso", description: error.message, variant: "destructive" });
    },
  });

  // Crear categoría
  const createCategoria = useMutation({
    mutationFn: async (categoria: { nombre: string; descripcion?: string }) => {
      const { data, error } = await supabase
        .from("egreso_categorias")
        .insert([categoria])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-categorias"] });
      toast({ title: "Categoría creada correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear categoría", description: error.message, variant: "destructive" });
    },
  });

  // Crear concepto
  const createConcepto = useMutation({
    mutationFn: async (concepto: { nombre: string; categoria_id: string; descripcion?: string }) => {
      const { data, error } = await supabase
        .from("egreso_conceptos")
        .insert([concepto])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-conceptos"] });
      toast({ title: "Concepto creado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear concepto", description: error.message, variant: "destructive" });
    },
  });

  // Calcular resúmenes
  const summaries = {
    totalEgresos: egresos.reduce((sum, e) => sum + Number(e.monto), 0),
    countEgresos: egresos.length,
    totalMañana: egresos.filter(e => e.turno === "Mañana").reduce((sum, e) => sum + Number(e.monto), 0),
    totalTarde: egresos.filter(e => e.turno === "Tarde").reduce((sum, e) => sum + Number(e.monto), 0),
    countMañana: egresos.filter(e => e.turno === "Mañana").length,
    countTarde: egresos.filter(e => e.turno === "Tarde").length,
    byCategoria: Object.entries(
      egresos.reduce((acc, e) => {
        const cat = e.categoria?.nombre || "Sin categoría";
        acc[cat] = (acc[cat] || 0) + Number(e.monto);
        return acc;
      }, {} as Record<string, number>)
    ).map(([nombre, total]) => ({ nombre, total })),
  };

  return {
    egresos,
    categorias,
    conceptos,
    modalidades,
    summaries,
    isLoading: loadingEgresos || loadingCategorias || loadingConceptos,
    refetch,
    createEgreso,
    updateEgreso,
    deleteEgreso,
    createCategoria,
    createConcepto,
  };
}
