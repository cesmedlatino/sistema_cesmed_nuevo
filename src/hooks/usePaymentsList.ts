import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentsList() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      // Primero obtener los pagos
      const { data, error } = await supabase
        .from("pagos")
        .select(`
          *,
          patients!inner(first_name, last_name),
          concepto!inner(nombre, monto),
          modalidad(nombre),
          documento_de_pago(numero_documento, tipo_documento, estado_documento)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Obtener IDs únicos de created_by
      const creatorIds = [...new Set(data?.map(p => p.created_by).filter(Boolean))];
      
      // Buscar información de usuarios que crearon los pagos
      let usuariosMap: Record<string, { documento_identidad: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: usuarios } = await supabase
          .from("usuario")
          .select(`
            auth_user_id,
            personal:personal_id(documento_identidad)
          `)
          .in("auth_user_id", creatorIds);
        
        if (usuarios) {
          usuarios.forEach((u: any) => {
            if (u.auth_user_id && u.personal?.documento_identidad) {
              usuariosMap[u.auth_user_id] = {
                documento_identidad: u.personal.documento_identidad
              };
            }
          });
        }
      }

      return data?.map((payment) => {
        const conceptoMonto = payment.concepto?.monto || 0;
        const montoPagado = payment.monto_pagado || 0;
        const montoAdelanto = payment.monto_adelanto || 0;
        const estadoPago = payment.estado_pago?.toLowerCase() || 'pendiente';
        
        // Para pagos PENDIENTES: saldo = importe total (no se pagó nada)
        // Para otros estados: usar saldo de BD o calcular
        let saldo: number;
        if (estadoPago === 'pendiente') {
          saldo = montoPagado; // El saldo pendiente es el monto total que debe pagar
        } else {
          saldo = payment.saldo ?? (conceptoMonto - montoPagado);
        }
        
        let estadoDisplay = payment.estado_pago || 'Pendiente';
        
        // Si el pago tiene saldo 0 y monto pagado igual al concepto, está Cancelado
        if (saldo <= 0 && montoPagado >= conceptoMonto && estadoDisplay !== 'Pendiente') {
          estadoDisplay = 'Cancelado';
        }
        
        // Obtener documento del usuario que creó el pago
        const creatorInfo = payment.created_by ? usuariosMap[payment.created_by] : null;
        const userDocument = creatorInfo?.documento_identidad || '-';
        
        return {
          ...payment,
          patient_name: `${payment.patients.first_name} ${payment.patients.last_name}`,
          patient_id: payment.patient_id,
          concept_name: payment.concepto.nombre,
          concept_amount: payment.concepto.monto,
          modality_name: payment.modalidad?.nombre || 'Sin modalidad',
          document_number: payment.documento_de_pago?.numero_documento,
          document_type: payment.documento_de_pago?.tipo_documento,
          document_status: payment.documento_de_pago?.estado_documento,
          user_name: userDocument,
          saldo: saldo,
          monto_adelanto: montoAdelanto,
          estado_pago: estadoDisplay,
          turno: payment.turno || null,
        };
      }) || [];
    },
  });
}