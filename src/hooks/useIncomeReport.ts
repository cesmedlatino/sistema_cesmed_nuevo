import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface IncomeReportItem {
  id: string;
  numero: number;
  doc_tipo: string;
  doc_abreviatura: string;
  nro_documento: string;
  sistema: string;
  nombres_apellidos: string;
  concepto: string;
  especialidad: string | null;
  modo_pago: string;
  pago: number;
  turno: "Mañana" | "Tarde";
  fecha: string;
  hora: string;
}

export interface IncomeReportData {
  fecha: string;
  fechaFormateada: string;
  turnoManana: IncomeReportItem[];
  turnoTarde: IncomeReportItem[];
  subtotalManana: number;
  subtotalTarde: number;
  egresosManana: number;
  egresosTarde: number;
  totalManana: number;
  totalTarde: number;
}

// Helper para determinar el turno basado en la hora
// Mañana: 08:30 - 15:29
// Tarde: 15:30 - en adelante
function getTurno(hora: string): "Mañana" | "Tarde" {
  const [hours, minutes] = hora.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  // 15:30 = 930 minutos
  if (totalMinutes >= 930) {
    return "Tarde";
  }
  return "Mañana";
}

// Helper para abreviar tipo de documento
function getDocAbreviatura(tipoDocumento: string | null, numeroDocumento: string): { tipo: string; abreviatura: string } {
  if (!tipoDocumento) {
    // Detectar por prefijo del número
    if (numeroDocumento?.startsWith("NV")) {
      return { tipo: "Nota de Venta", abreviatura: "NV" };
    }
    if (numeroDocumento?.startsWith("BV") || numeroDocumento?.startsWith("B")) {
      return { tipo: "Boleta de Venta", abreviatura: "BV" };
    }
    if (numeroDocumento?.startsWith("FA") || numeroDocumento?.startsWith("F")) {
      return { tipo: "Factura", abreviatura: "FA" };
    }
    return { tipo: "Nota de Venta", abreviatura: "NV" };
  }
  
  const tipo = tipoDocumento.toLowerCase();
  if (tipo.includes("nota") || tipo.includes("nv")) {
    return { tipo: "Nota de Venta", abreviatura: "NV" };
  }
  if (tipo.includes("boleta") || tipo.includes("bv")) {
    return { tipo: "Boleta de Venta", abreviatura: "BV" };
  }
  if (tipo.includes("factura") || tipo.includes("fa")) {
    return { tipo: "Factura", abreviatura: "FA" };
  }
  return { tipo: tipoDocumento, abreviatura: tipoDocumento.substring(0, 2).toUpperCase() };
}

export function useIncomeReport(fecha: string) {
  return useQuery({
    queryKey: ["income-report", fecha],
    queryFn: async (): Promise<IncomeReportData> => {
      const items: IncomeReportItem[] = [];
      
      // 1. Obtener pagos del sistema integral (tabla pagos)
      const { data: pagos, error: pagosError } = await supabase
        .from("pagos")
        .select(`
          id,
          created_at,
          monto_pagado,
          estado_pago,
          patients!inner(first_name, last_name),
          concepto!inner(nombre, especialidad_id),
          modalidad(nombre),
          documento_de_pago(numero_documento, tipo_documento)
        `)
        .gte("created_at", `${fecha}T00:00:00`)
        .lt("created_at", `${fecha}T23:59:59`)
        .in("estado_pago", ["Cancelado", "Adelanto", "Parcial", "Completo"]);

      if (pagosError) {
        console.error("Error fetching pagos:", pagosError);
      }

      // Obtener especialidades para mapear
      const { data: especialidades } = await supabase
        .from("medical_specialties")
        .select("id, name");

      const especialidadesMap = new Map(especialidades?.map(e => [e.id, e.name]) || []);

      // Procesar pagos del sistema integral
      if (pagos) {
        pagos.forEach((pago: any) => {
          const hora = format(new Date(pago.created_at), "HH:mm");
          const docInfo = getDocAbreviatura(
            pago.documento_de_pago?.tipo_documento,
            pago.documento_de_pago?.numero_documento || ""
          );
          
          items.push({
            id: pago.id,
            numero: 0, // Se asignará después
            doc_tipo: docInfo.tipo,
            doc_abreviatura: docInfo.abreviatura,
            nro_documento: pago.documento_de_pago?.numero_documento || "-",
            sistema: "Integral",
            nombres_apellidos: `${pago.patients.first_name} ${pago.patients.last_name}`,
            concepto: pago.concepto.nombre,
            especialidad: pago.concepto.especialidad_id 
              ? especialidadesMap.get(pago.concepto.especialidad_id) || null 
              : null,
            modo_pago: pago.modalidad?.nombre || "-",
            pago: pago.monto_pagado || 0,
            turno: getTurno(hora),
            fecha: fecha,
            hora: hora,
          });
        });
      }

      // 2. Obtener salidas de Farmacia por comprobante
      const { data: farmaciaOutputs, error: farmaciaError } = await supabase
        .from("pharmacy_outputs")
        .select(`
          id,
          created_at,
          total,
          nro_comprobante,
          tipo_salida,
          patients(first_name, last_name)
        `)
        .gte("created_at", `${fecha}T00:00:00`)
        .lt("created_at", `${fecha}T23:59:59`)
        .eq("tipo_salida", "Salida por comprobante");

      if (farmaciaError) {
        console.error("Error fetching pharmacy outputs:", farmaciaError);
      }

      // Agrupar salidas de farmacia por nro_comprobante
      if (farmaciaOutputs) {
        const groupedFarmacia = farmaciaOutputs.reduce((acc: Record<string, any>, output: any) => {
          const key = output.nro_comprobante || output.id;
          if (!acc[key]) {
            acc[key] = {
              id: output.id,
              created_at: output.created_at,
              total: 0,
              nro_comprobante: output.nro_comprobante,
              patient: output.patients,
            };
          }
          acc[key].total += output.total || 0;
          return acc;
        }, {});

        Object.values(groupedFarmacia).forEach((output: any) => {
          const hora = format(new Date(output.created_at), "HH:mm");
          const docInfo = getDocAbreviatura(null, output.nro_comprobante || "");
          
          items.push({
            id: output.id,
            numero: 0,
            doc_tipo: docInfo.tipo,
            doc_abreviatura: docInfo.abreviatura,
            nro_documento: output.nro_comprobante || "-",
            sistema: "Farmacia",
            nombres_apellidos: output.patient 
              ? `${output.patient.first_name} ${output.patient.last_name}`
              : "Cliente General",
            concepto: "Salida de Botica por Comprobante",
            especialidad: null,
            modo_pago: "Efectivo",
            pago: output.total || 0,
            turno: getTurno(hora),
            fecha: fecha,
            hora: hora,
          });
        });
      }

      // 3. Obtener salidas de Óptica por comprobante
      const { data: opticaOutputs, error: opticaError } = await supabase
        .from("optics_outputs")
        .select(`
          id,
          created_at,
          total,
          nro_comprobante,
          tipo_salida,
          patients(first_name, last_name)
        `)
        .gte("created_at", `${fecha}T00:00:00`)
        .lt("created_at", `${fecha}T23:59:59`)
        .eq("tipo_salida", "Venta");

      if (opticaError) {
        console.error("Error fetching optics outputs:", opticaError);
      }

      // Agrupar salidas de óptica por nro_comprobante
      if (opticaOutputs) {
        const groupedOptica = opticaOutputs.reduce((acc: Record<string, any>, output: any) => {
          const key = output.nro_comprobante || output.id;
          if (!acc[key]) {
            acc[key] = {
              id: output.id,
              created_at: output.created_at,
              total: 0,
              nro_comprobante: output.nro_comprobante,
              patient: output.patients,
            };
          }
          acc[key].total += output.total || 0;
          return acc;
        }, {});

        Object.values(groupedOptica).forEach((output: any) => {
          const hora = format(new Date(output.created_at), "HH:mm");
          const docInfo = getDocAbreviatura(null, output.nro_comprobante || "");
          
          items.push({
            id: output.id,
            numero: 0,
            doc_tipo: docInfo.tipo,
            doc_abreviatura: docInfo.abreviatura,
            nro_documento: output.nro_comprobante || "-",
            sistema: "Optica",
            nombres_apellidos: output.patient 
              ? `${output.patient.first_name} ${output.patient.last_name}`
              : "Cliente General",
            concepto: "Salida de Optica por Comprobante",
            especialidad: null,
            modo_pago: "Efectivo",
            pago: output.total || 0,
            turno: getTurno(hora),
            fecha: fecha,
            hora: hora,
          });
        });
      }

      // Ordenar por hora y asignar números
      items.sort((a, b) => a.hora.localeCompare(b.hora));

      // Separar por turno
      const turnoManana = items
        .filter(i => i.turno === "Mañana")
        .map((item, idx) => ({ ...item, numero: idx + 1 }));
      
      const turnoTarde = items
        .filter(i => i.turno === "Tarde")
        .map((item, idx) => ({ ...item, numero: idx + 1 }));

      // Calcular totales de ingresos
      const subtotalManana = turnoManana.reduce((acc, i) => acc + i.pago, 0);
      const subtotalTarde = turnoTarde.reduce((acc, i) => acc + i.pago, 0);
      
      // 4. Obtener egresos del día desde la tabla egresos
      const { data: egresosData, error: egresosError } = await supabase
        .from("egresos")
        .select("monto, turno")
        .eq("fecha", fecha);

      if (egresosError) {
        console.error("Error fetching egresos:", egresosError);
      }

      // Calcular totales de egresos por turno
      const egresosManana = egresosData
        ?.filter(e => e.turno === "Mañana")
        .reduce((acc, e) => acc + (Number(e.monto) || 0), 0) || 0;
      
      const egresosTarde = egresosData
        ?.filter(e => e.turno === "Tarde")
        .reduce((acc, e) => acc + (Number(e.monto) || 0), 0) || 0;

      // Parse date correctly to avoid timezone issues
      // Adding T12:00:00 ensures we stay in the correct day regardless of timezone
      const fechaDate = new Date(`${fecha}T12:00:00`);

      return {
        fecha,
        fechaFormateada: format(fechaDate, "EEEE dd 'de' MMMM 'del' yyyy", { locale: es }),
        turnoManana,
        turnoTarde,
        subtotalManana,
        subtotalTarde,
        egresosManana,
        egresosTarde,
        totalManana: subtotalManana - egresosManana,
        totalTarde: subtotalTarde - egresosTarde,
      };
    },
    enabled: !!fecha,
  });
}
