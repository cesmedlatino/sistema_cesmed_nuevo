import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, XCircle, Trash2, Search, Printer, Eye, TrendingUp, Wallet, Clock, Ban, Plus, ChevronDown, ChevronRight, RefreshCw, Edit, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ComprobantesReceipt } from "@/components/comprobantes/ComprobantesReceipt";
import { AddPaymentToAccountDialog } from "@/components/comprobantes/AddPaymentToAccountDialog";
import { PaymentDetailsDialog } from "@/components/payments/PaymentDetailsDialog";
import { PaymentDialog } from "@/components/payments/PaymentDialog";
import { EmitPaymentReceiptDialog } from "@/components/comprobantes/EmitPaymentReceiptDialog";
import { AccountReceiptPrintDialog } from "@/components/comprobantes/AccountReceiptPrintDialog";

// Helper para formatear fechas locales sin interpretación UTC
const formatLocalDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "dd/MM/yyyy", { locale: es });
};

type FilterType = "Todos" | "Hoy" | "Semana Actual" | "Mes Actual" | "Mes" | "Fecha";

interface PatientAccount {
  cuenta_id: string;
  patient_id: string;
  patient_name: string;
  patient_dni: string;
  patient_code: string;
  fecha_cuenta: string;
  estado: string;
  pagos: {
    id: string;
    pago_id: string;
    concepto: string;
    monto: number;
    monto_pagado: number;
    monto_adelanto: number;
    saldo: number;
    modalidad: string;
    fecha_pago: string;
    numero_comprobante?: string;
  }[];
  monto_total: number;
  monto_adelantado: number;
  saldo_pendiente: number;
  comprobante_emitido: boolean;
  fecha_emision?: string;
  numero_comprobante?: string;
  tipo_comprobante?: string;
  anulado: boolean;
}

export function Comprobantes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("Hoy");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PatientAccount | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAccount, setDetailsAccount] = useState<PatientAccount | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [addPaymentAccount, setAddPaymentAccount] = useState<PatientAccount | null>(null);
  
  // Estados para acciones de pagos individuales
  const [selectedPaymentForDetails, setSelectedPaymentForDetails] = useState<any>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<{id: string; pago_id: string; concepto: string; monto: number} | null>(null);
  const [showDeletePaymentDialog, setShowDeletePaymentDialog] = useState(false);
  
  // Estados para emisión de comprobante individual
  const [emitPaymentReceipt, setEmitPaymentReceipt] = useState<{
    payment: PatientAccount['pagos'][0];
    patient: { id: string; name: string; dni: string; patient_code: string };
    cuentaId: string;
  } | null>(null);
  const [showEmitPaymentDialog, setShowEmitPaymentDialog] = useState(false);
  
  // Estado para reimprimir comprobante de cuenta (estilo térmico)
  const [showAccountPrintDialog, setShowAccountPrintDialog] = useState(false);
  const [accountToPrint, setAccountToPrint] = useState<PatientAccount | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getDateRange = () => {
    const today = new Date();
    
    switch (filterType) {
      case "Todos":
        return null; // No date filter
      case "Hoy":
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
      case "Semana Actual":
        return {
          start: format(startOfWeek(today, { locale: es }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { locale: es }), "yyyy-MM-dd"),
        };
      case "Mes Actual":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "Mes":
        const monthDate = new Date(selectedMonth + "-01");
        return {
          start: format(startOfMonth(monthDate), "yyyy-MM-dd"),
          end: format(endOfMonth(monthDate), "yyyy-MM-dd"),
        };
      case "Fecha":
        return {
          start: selectedDate,
          end: selectedDate,
        };
      default:
        return {
          start: format(today, "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
    }
  };

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ["comprobantes-accounts", filterType, selectedMonth, selectedDate, searchTerm],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      // Paso 1: Obtener todos los documentos emitidos con sus cuentas
      // Usar documento_de_pago directamente para tener información completa
      const { data: documentos, error: docError } = await supabase
        .from("documento_de_pago")
        .select(`
          id,
          numero_documento,
          fecha_emision,
          estado,
          tipo_documento,
          estado_documento,
          patient_id
        `)
        .not('numero_documento', 'is', null);

      if (docError) throw docError;
      if (!documentos || documentos.length === 0) return [];

      // Paso 2: Obtener pagos que tienen documento_pago_id vinculado
      const { data: pagosConDoc, error: pagosDocError } = await supabase
        .from("pagos")
        .select(`
          cuenta_id,
          documento_pago_id
        `)
        .not('documento_pago_id', 'is', null)
        .not('cuenta_id', 'is', null);

      if (pagosDocError) throw pagosDocError;

      // Mapear documento_pago_id a cuenta_id
      const docIdToCuentaId = new Map<string, string>();
      pagosConDoc?.forEach((p: any) => {
        if (p.documento_pago_id && p.cuenta_id) {
          docIdToCuentaId.set(p.documento_pago_id, p.cuenta_id);
        }
      });

      // Crear mapa de cuenta_id a documento
      const cuentasConDocumento = new Map<string, any>();
      documentos.forEach((doc: any) => {
        const cuentaId = docIdToCuentaId.get(doc.id);
        if (cuentaId && doc.numero_documento) {
          // Si ya hay un documento para esta cuenta, mantener el más reciente
          const existing = cuentasConDocumento.get(cuentaId);
          if (!existing || (doc.fecha_emision && doc.fecha_emision > existing.fecha_emision)) {
            cuentasConDocumento.set(cuentaId, doc);
          }
        }
      });

      if (cuentasConDocumento.size === 0) return [];

      // Paso 3: Traer TODOS los pagos de esas cuentas con su documento individual
      let query = supabase
        .from("pagos")
        .select(`
          *,
          patients!inner(id, first_name, last_name, dni, patient_code),
          concepto!inner(nombre, monto),
          modalidad(nombre),
          documento_de_pago(numero_documento)
        `)
        .in('cuenta_id', Array.from(cuentasConDocumento.keys()))
        .order('fecha_pago', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar pagos por cuenta_id
      const groupedAccounts = new Map<string, PatientAccount>();

      data?.forEach((payment: any) => {
        if (!payment.cuenta_id) return;
        
        const accountKey = payment.cuenta_id;
        const docInfo = cuentasConDocumento.get(accountKey);
        
        if (!groupedAccounts.has(accountKey)) {
          const isAnulado = docInfo?.estado === 'anulado' || docInfo?.estado_documento === 'Anulado';
          
          // Usar fecha_emision del documento para filtrado de fecha
          const fechaCuenta = docInfo?.fecha_emision || payment.fecha_pago;
          
          groupedAccounts.set(accountKey, {
            cuenta_id: payment.cuenta_id,
            patient_id: payment.patient_id,
            patient_name: `${payment.patients.first_name} ${payment.patients.last_name}`,
            patient_dni: payment.patients.dni,
            patient_code: payment.patients.patient_code,
            fecha_cuenta: fechaCuenta,
            estado: docInfo?.estado_documento || payment.estado_pago || 'Pendiente',
            pagos: [],
            monto_total: 0,
            monto_adelantado: 0,
            saldo_pendiente: 0,
            comprobante_emitido: true,
            fecha_emision: docInfo?.fecha_emision || undefined,
            numero_comprobante: docInfo?.numero_documento || undefined,
            tipo_comprobante: docInfo?.tipo_documento || undefined,
            anulado: isAnulado,
          });
        }

        const account = groupedAccounts.get(accountKey)!;
        account.pagos.push({
          id: payment.id,
          pago_id: payment.pago_id || '-',
          concepto: payment.concepto.nombre,
          monto: payment.monto_pagado,
          monto_pagado: payment.monto_pagado,
          monto_adelanto: payment.monto_adelanto || 0,
          saldo: payment.saldo || 0,
          modalidad: payment.modalidad?.nombre || '-',
          fecha_pago: payment.fecha_pago,
          numero_comprobante: payment.documento_de_pago?.numero_documento || undefined,
        });

        account.monto_total += payment.monto_pagado;
        account.monto_adelantado += payment.monto_adelanto || 0;
        account.saldo_pendiente += payment.saldo || 0;
      });

      // Filtrar por fecha y término de búsqueda
      let accountsList = Array.from(groupedAccounts.values());
      
      // Aplicar filtro de fecha
      if (dateRange) {
        accountsList = accountsList.filter(acc => {
          const fecha = acc.fecha_cuenta;
          return fecha >= dateRange.start && fecha <= dateRange.end;
        });
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        accountsList = accountsList.filter(acc => 
          acc.patient_name.toLowerCase().includes(search) ||
          acc.patient_dni.includes(search) ||
          acc.patient_code.toLowerCase().includes(search) ||
          acc.cuenta_id.toLowerCase().includes(search) ||
          (acc.numero_comprobante && acc.numero_comprobante.toLowerCase().includes(search))
        );
      }

      return accountsList;
    },
  });

  const anularMutation = useMutation({
    mutationFn: async (account: PatientAccount) => {
      // Actualizar el documento de pago a estado anulado
      const { error } = await supabase
        .from("documento_de_pago")
        .update({ 
          estado: 'anulado',
          estado_documento: 'Anulado',
          updated_at: new Date().toISOString()
        } as any)
        .eq("numero_documento", account.numero_comprobante);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
      toast({
        title: "Comprobante anulado",
        description: "El comprobante ha sido anulado correctamente.",
      });
      setAnularDialogOpen(false);
      setSelectedAccount(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo anular el comprobante.",
        variant: "destructive",
      });
      console.error("Error al anular:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (account: PatientAccount) => {
      // Eliminar documento de pago si existe
      if (account.numero_comprobante) {
        await supabase
          .from("documento_de_pago")
          .delete()
          .eq("numero_documento", account.numero_comprobante);
      }

      // Eliminar todos los pagos asociados a esta cuenta
      const { error } = await supabase
        .from("pagos")
        .delete()
        .eq("cuenta_id", account.cuenta_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
      toast({
        title: "Cuenta eliminada",
        description: "La cuenta y sus pagos han sido eliminados correctamente.",
      });
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta.",
        variant: "destructive",
      });
      console.error("Error al eliminar:", error);
    },
  });

  // Mutation para eliminar un pago individual
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("pagos")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: "Pago eliminado",
        description: "El pago ha sido eliminado correctamente.",
      });
      setShowDeletePaymentDialog(false);
      setDeletingPayment(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago.",
        variant: "destructive",
      });
      console.error("Error al eliminar pago:", error);
    },
  });

  const handleAnular = (account: PatientAccount) => {
    setSelectedAccount(account);
    setAnularDialogOpen(true);
  };

  const handleDelete = (account: PatientAccount) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleEmitirComprobante = (account: PatientAccount) => {
    setSelectedAccount(account);
    setShowReceipt(true);
  };

  // Handlers para acciones de pagos individuales
  const handleViewPaymentDetails = async (pago: { id: string; pago_id: string; numero_comprobante?: string }) => {
    // Cargar datos completos del pago para mostrar en el dialog
    const { data } = await supabase
      .from("pagos")
      .select(`
        *,
        patients!inner(first_name, last_name, dni),
        concepto!inner(nombre, monto),
        modalidad(nombre),
        documento_de_pago(numero_documento, tipo_documento, estado_documento)
      `)
      .eq("id", pago.id)
      .single();
    
    if (data) {
      setSelectedPaymentForDetails({
        ...data,
        patient_name: `${data.patients.first_name} ${data.patients.last_name}`,
        patient_dni: data.patients.dni,
        concept_name: data.concepto.nombre,
        concept_amount: data.concepto.monto,
        modality_name: data.modalidad?.nombre || 'Sin modalidad',
        // Mapear el numero_comprobante del documento vinculado
        document_number: data.documento_de_pago?.numero_documento || pago.numero_comprobante || null,
        document_type: data.documento_de_pago?.tipo_documento || null,
      });
      setShowPaymentDetails(true);
    }
  };

  const handleEditPayment = (pago: { id: string }, patientId: string) => {
    setEditingPayment({ id: pago.id, patient_id: patientId });
    setShowEditPaymentDialog(true);
  };

  const handleDeletePayment = (pago: { id: string; pago_id: string; concepto: string; monto_pagado: number }) => {
    setDeletingPayment({
      id: pago.id,
      pago_id: pago.pago_id,
      concepto: pago.concepto,
      monto: pago.monto_pagado,
    });
    setShowDeletePaymentDialog(true);
  };

  const confirmDeletePayment = () => {
    if (deletingPayment) {
      deletePaymentMutation.mutate(deletingPayment.id);
    }
  };

  const handlePaymentSaved = () => {
    setShowEditPaymentDialog(false);
    setEditingPayment(null);
  };

  // Imprimir según tipo de documento
  const handlePrintByType = async (account: PatientAccount) => {
    const tipoComprobante = account.tipo_comprobante || 'Nota de Venta';
    
    if (tipoComprobante.includes('Boleta') || tipoComprobante.includes('Factura')) {
      // A4 fiscal format for Boleta/Factura
      await printFiscalDocument(account);
    } else {
      // Thermal format using comprobante_config for Nota de Venta
      setSelectedAccount(account);
      setShowReceipt(true);
    }
  };

  // Print A4 fiscal document (Boleta/Factura)
  const printFiscalDocument = async (account: PatientAccount) => {
    // Fetch documento_de_pago data
    const { data: docData } = await supabase
      .from('documento_de_pago')
      .select('*')
      .eq('numero_documento', account.numero_comprobante)
      .single();

    const tipoDoc = account.tipo_comprobante || 'Boleta de Venta';
    const subtotal = account.monto_total / 1.18;
    const igv = account.monto_total - subtotal;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de impresión. Verifique los bloqueadores de pop-ups.",
        variant: "destructive"
      });
      return;
    }

    const formatCurrency = (amount: number) => `S/. ${amount.toFixed(2)}`;
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tipoDoc} - ${account.numero_comprobante}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
          .container { max-width: 700px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #5c1c8c; }
          .company-info { flex: 1; }
          .company-name { font-size: 16px; font-weight: bold; color: #5c1c8c; margin-bottom: 5px; }
          .company-details { font-size: 10px; color: #666; line-height: 1.5; }
          .document-box { border: 2px solid #5c1c8c; padding: 15px; text-align: center; min-width: 180px; }
          .document-type { font-size: 14px; font-weight: bold; color: #5c1c8c; margin-bottom: 5px; }
          .document-number { font-size: 16px; font-weight: bold; }
          .client-info { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .client-row { display: flex; margin-bottom: 8px; }
          .client-label { width: 120px; font-weight: bold; color: #5c1c8c; }
          .client-value { flex: 1; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #5c1c8c; color: white; padding: 10px; text-align: left; font-size: 11px; }
          .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .items-table .amount { text-align: right; }
          .totals-section { display: flex; justify-content: flex-end; margin-top: 20px; }
          .totals-box { width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total-row.grand-total { border-top: 2px solid #5c1c8c; border-bottom: none; font-size: 14px; font-weight: bold; color: #5c1c8c; margin-top: 5px; padding-top: 10px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company-info">
              <div class="company-name">CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L.</div>
              <div class="company-details">
                RUC: 20607644315<br>
                Mz. G Lote. 17 Coop. Villa Pornogoche<br>
                Paucarpata - Arequipa - Perú<br>
                Tel: 054-407301 | WhatsApp: 950293377
              </div>
            </div>
            <div class="document-box">
              <div class="document-type">${tipoDoc.toUpperCase()}</div>
              <div class="document-number">${account.numero_comprobante}</div>
              <div style="font-size: 10px; margin-top: 5px;">Fecha: ${formatDate(account.fecha_cuenta)}</div>
            </div>
          </div>

          <div class="client-info">
            <div class="client-row">
              <span class="client-label">${tipoDoc.includes('Factura') ? 'RUC:' : 'DNI:'}</span>
              <span class="client-value">${docData?.cliente_ruc || account.patient_dni}</span>
            </div>
            <div class="client-row">
              <span class="client-label">${tipoDoc.includes('Factura') ? 'Razón Social:' : 'Cliente:'}</span>
              <span class="client-value">${docData?.cliente_razon_social || account.patient_name}</span>
            </div>
            ${docData?.cliente_direccion ? `
            <div class="client-row">
              <span class="client-label">Dirección:</span>
              <span class="client-value">${docData.cliente_direccion}</span>
            </div>` : ''}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50px;">Cant.</th>
                <th>Descripción</th>
                <th style="width: 80px;">P. Unit.</th>
                <th style="width: 100px;" class="amount">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${account.pagos.map(pago => `
                <tr>
                  <td>1</td>
                  <td>${pago.concepto}<br><small style="color: #666;">Pago: ${pago.pago_id} - ${pago.modalidad}</small></td>
                  <td>${formatCurrency(pago.monto)}</td>
                  <td class="amount">${formatCurrency(pago.monto)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>Op. Gravada:</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              <div class="total-row">
                <span>IGV (18%):</span>
                <span>${formatCurrency(igv)}</span>
              </div>
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>${formatCurrency(account.monto_total)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Representación impresa de la ${tipoDoc}</p>
            <p>Conserve este documento para cualquier reclamo</p>
            <p style="margin-top: 10px;">www.cesmedlatinoamericano.com</p>
          </div>
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleComprobanteEmitido = (numeroComprobante: string) => {
    queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
    toast({
      title: "Comprobante emitido",
      description: `Comprobante ${numeroComprobante} emitido correctamente.`,
    });
    setShowReceipt(false);
    setSelectedAccount(null);
  };

  const confirmAnular = () => {
    if (selectedAccount) {
      anularMutation.mutate(selectedAccount);
    }
  };

  const confirmDelete = () => {
    if (selectedAccount) {
      deleteMutation.mutate(selectedAccount);
    }
  };

  // Manejo de selección múltiple
  const handleSelectAccount = (cuentaId: string, checked: boolean) => {
    const newSelected = new Set(selectedAccountIds);
    if (checked) {
      newSelected.add(cuentaId);
    } else {
      newSelected.delete(cuentaId);
    }
    setSelectedAccountIds(newSelected);
  };
  const confirmBulkDelete = async () => {
    if (selectedAccountIds.size === 0) return;

    try {
      // Get all selected accounts
      const accountsToDelete = accounts.filter(
        (a) => selectedAccountIds.has(a.cuenta_id)
      );

      let deletedCount = 0;

      for (const account of accountsToDelete) {
        // Delete documento_de_pago if it exists
        if (account.numero_comprobante) {
          await supabase
            .from("documento_de_pago")
            .delete()
            .eq("numero_documento", account.numero_comprobante);
        }

        // Delete all pagos associated with this cuenta_id
        const { error } = await supabase
          .from("pagos")
          .delete()
          .eq("cuenta_id", account.cuenta_id);

        if (!error) {
          deletedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
      toast({
        title: "Comprobantes eliminados",
        description: `Se eliminaron ${deletedCount} cuentas correctamente.`,
      });
      setShowBulkDeleteDialog(false);
      setSelectedAccountIds(new Set());
    } catch (error: any) {
      console.error("Error al eliminar comprobantes:", error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar los comprobantes.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "S/. 0.00";
    return `S/. ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (account: PatientAccount) => {
    if (account.anulado) {
      return <Badge variant="destructive">Anulado</Badge>;
    }
    if (account.comprobante_emitido) {
      return <Badge className="bg-green-500 hover:bg-green-600">Emitido</Badge>;
    }
    
    // Usar el estado_pago real de la base de datos
    const estado = account.estado.toLowerCase();
    
    if (estado === 'pagado' || estado === 'cancelado') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Cancelado</Badge>;
    }
    if (estado === 'adelanto' || estado === 'parcial') {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Adelanto</Badge>;
    }
    if (estado === 'pendiente') {
      return <Badge variant="secondary">Pendiente</Badge>;
    }
    
    // Fallback basado en saldo
    if (account.saldo_pendiente === 0) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Cancelado</Badge>;
    }
    if (account.monto_adelantado > 0) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Adelanto</Badge>;
    }
    return <Badge variant="secondary">Por Cancelar</Badge>;
  };

  // Transformar account para ComprobantesReceipt
  const getReceiptAccount = (account: PatientAccount) => ({
    cuenta_id: account.cuenta_id,
    patient: {
      id: account.patient_id,
      patient_code: account.patient_code,
      first_name: account.patient_name.split(' ')[0] || '',
      last_name: account.patient_name.split(' ').slice(1).join(' ') || '',
      dni: account.patient_dni,
      birth_date: '',
      gender: '',
      phone: '',
      email: '',
    },
    fecha_cuenta: account.fecha_cuenta,
    estado: account.estado,
    pagos: account.pagos,
    monto_total: account.monto_total,
    monto_adelantado: account.monto_adelantado,
    saldo_pendiente: account.saldo_pendiente,
    comprobante_emitido: account.comprobante_emitido,
    fecha_emision: account.fecha_emision,
    numero_comprobante: account.numero_comprobante,
  });

  // Calcular estadísticas (sin filtro de estado aplicado)
  const stats = useMemo(() => {
    const total = accounts.reduce((sum, acc) => sum + acc.monto_total, 0);
    const pagado = accounts.reduce((sum, acc) => sum + acc.monto_adelantado, 0);
    const pendiente = accounts.reduce((sum, acc) => sum + acc.saldo_pendiente, 0);
    const emitidos = accounts.filter(acc => acc.comprobante_emitido && !acc.anulado).length;
    const anulados = accounts.filter(acc => acc.anulado).length;
    const porCancelar = accounts.filter(acc => !acc.comprobante_emitido && !acc.anulado).length;
    const conSaldo = accounts.filter(acc => acc.saldo_pendiente > 0 && !acc.anulado).length;
    const sinSaldo = accounts.filter(acc => acc.saldo_pendiente === 0 && !acc.anulado).length;
    
    return { total, pagado, pendiente, emitidos, anulados, porCancelar, conSaldo, sinSaldo, count: accounts.length };
  }, [accounts]);

  // Filtrar cuentas por estado seleccionado
  const filteredAccounts = useMemo(() => {
    if (!statusFilter) return accounts;
    
    switch (statusFilter) {
      case 'emitidos':
        return accounts.filter(acc => acc.comprobante_emitido && !acc.anulado);
      case 'anulados':
        return accounts.filter(acc => acc.anulado);
      case 'porCancelar':
        return accounts.filter(acc => !acc.comprobante_emitido && !acc.anulado);
      case 'conSaldo':
        return accounts.filter(acc => acc.saldo_pendiente > 0 && !acc.anulado);
      case 'sinSaldo':
        return accounts.filter(acc => acc.saldo_pendiente === 0 && !acc.anulado);
      default:
        return accounts;
    }
  }, [accounts, statusFilter]);

  const toggleStatusFilter = (filter: string) => {
    setStatusFilter(prev => prev === filter ? null : filter);
  };

  const handleViewDetails = (account: PatientAccount) => {
    setDetailsAccount(account);
    setDetailsOpen(true);
  };

  const toggleExpandAccount = (cuentaId: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cuentaId)) {
        newSet.delete(cuentaId);
      } else {
        newSet.add(cuentaId);
      }
      return newSet;
    });
  };

  const handleAddPaymentToAccount = (account: PatientAccount) => {
    setAddPaymentAccount(account);
    setShowAddPaymentDialog(true);
  };

  const handlePaymentAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
    setShowAddPaymentDialog(false);
    setAddPaymentAccount(null);
    // Expandir la cuenta para mostrar los nuevos pagos
    if (addPaymentAccount) {
      setExpandedAccounts(prev => new Set(prev).add(addPaymentAccount.cuenta_id));
    }
  };

  // Update document amount when reprinting
  const updateDocumentAmount = async (account: PatientAccount) => {
    if (!account.numero_comprobante) return;
    
    try {
      await supabase
        .from("documento_de_pago")
        .update({ 
          importe_total: account.monto_total,
          subtotal: account.monto_total,
          updated_at: new Date().toISOString()
        } as any)
        .eq("numero_documento", account.numero_comprobante);
    } catch (error) {
      console.error("Error updating document amount:", error);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Comprobantes</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de comprobantes de cuentas de pacientes
          </p>
        </div>
        <Receipt className="h-8 w-8 text-primary" />
      </div>

      {/* Stats Cards - Interactive Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 ${!statusFilter ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setStatusFilter(null)}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs text-muted-foreground">Cuentas</span>
            </div>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{stats.count}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 ${statusFilter === 'sinSaldo' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => toggleStatusFilter('sinSaldo')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-muted-foreground">Cancelados</span>
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{stats.sinSaldo}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800 ${statusFilter === 'emitidos' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => toggleStatusFilter('emitidos')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-muted-foreground">Emitidos</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{stats.emitidos}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800 ${statusFilter === 'conSaldo' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => toggleStatusFilter('conSaldo')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-muted-foreground">Con Saldo</span>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{stats.conSaldo}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] border-gray-200 dark:border-gray-700 ${statusFilter === 'porCancelar' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => toggleStatusFilter('porCancelar')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-muted-foreground">Por Cancelar</span>
            </div>
            <p className="text-xl font-bold text-gray-600">{stats.porCancelar}</p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] border-red-200 dark:border-red-800 ${statusFilter === 'anulados' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => toggleStatusFilter('anulados')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Anulados</span>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.anulados}</p>
          </CardContent>
        </Card>
      </div>

      {/* Totales resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xs text-muted-foreground">Importe Total</span>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xs text-muted-foreground">Monto de Adelanto</span>
            <p className="text-lg font-bold text-green-600">{formatCurrency(stats.pagado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xs text-muted-foreground">Saldo Pendiente</span>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.pendiente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="w-full md:w-48">
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as FilterType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Hoy">Hoy</SelectItem>
                  <SelectItem value="Semana Actual">Semana Actual</SelectItem>
                  <SelectItem value="Mes Actual">Mes Actual</SelectItem>
                  <SelectItem value="Mes">Seleccionar Mes</SelectItem>
                  <SelectItem value="Fecha">Seleccionar Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "Mes" && (
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full md:w-40"
              />
            )}

            {filterType === "Fecha" && (
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full md:w-40"
              />
            )}

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="N° Comprobante, paciente, DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Lista de Cuentas</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              title="Recargar lista"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
            {statusFilter && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer" 
                onClick={() => setStatusFilter(null)}
              >
                {statusFilter === 'emitidos' && 'Emitidos'}
                {statusFilter === 'anulados' && 'Anulados'}
                {statusFilter === 'porCancelar' && 'Por Cancelar'}
                {statusFilter === 'conSaldo' && 'Con Saldo'}
                {statusFilter === 'sinSaldo' && 'Cancelados'}
                <XCircle className="h-3 w-3 ml-1 inline" />
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              ({filteredAccounts.length} de {accounts.length})
            </span>
          </div>
          {selectedAccountIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar ({selectedAccountIds.size})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredAccounts.length > 0 && selectedAccountIds.size === filteredAccounts.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const allIds = new Set(filteredAccounts.map((a) => a.cuenta_id));
                            setSelectedAccountIds(allIds);
                          } else {
                            setSelectedAccountIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Cuenta ID</TableHead>
                    <TableHead>Tipo de Cuenta</TableHead>
                    <TableHead>Nro Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Conceptos</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Monto de Adelanto</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8">
                        {statusFilter ? 'No hay cuentas con este filtro' : 'No se encontraron cuentas'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map((account) => (
                      <React.Fragment key={account.cuenta_id}>
                        <TableRow className={selectedAccountIds.has(account.cuenta_id) ? "bg-muted/50" : ""}>
                          <TableCell className="w-8 p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpandAccount(account.cuenta_id)}
                            >
                              {expandedAccounts.has(account.cuenta_id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={selectedAccountIds.has(account.cuenta_id)}
                              onCheckedChange={(checked) => handleSelectAccount(account.cuenta_id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary">
                            {account.cuenta_id.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            {account.pagos.length > 1 ? (
                              <Badge variant="secondary" className="text-xs">Varios Pagos</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Pago Único</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {account.numero_comprobante || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatLocalDate(account.fecha_cuenta)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {account.patient_name}
                          </TableCell>
                          <TableCell>
                            {account.patient_dni}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {account.pagos.slice(0, 2).map((p, idx) => (
                                <div key={idx} className="text-muted-foreground">
                                  {p.concepto}
                                </div>
                              ))}
                              {account.pagos.length > 2 && (
                                <div className="text-muted-foreground italic">
                                  +{account.pagos.length - 2} más...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-right">
                            {formatCurrency(account.monto_total)}
                          </TableCell>
                          <TableCell className="text-green-600 text-right">
                            {formatCurrency(account.monto_adelantado)}
                          </TableCell>
                          <TableCell className={`text-right ${account.saldo_pendiente > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                            {formatCurrency(account.saldo_pendiente)}
                          </TableCell>
                          <TableCell>{getStatusBadge(account)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Agregar pago"
                                onClick={() => handleAddPaymentToAccount(account)}
                                disabled={account.anulado}
                              >
                                <Plus className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalles"
                                onClick={() => handleViewDetails(account)}
                              >
                                <Eye className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={account.comprobante_emitido ? "Reimprimir" : "Emitir Comprobante"}
                                onClick={async () => {
                                  if (account.comprobante_emitido) {
                                    // Abrir dialog térmico para reimprimir
                                    await updateDocumentAmount(account);
                                    setAccountToPrint(account);
                                    setShowAccountPrintDialog(true);
                                  } else {
                                    handleEmitirComprobante(account);
                                  }
                                }}
                                disabled={account.anulado}
                              >
                                <Printer className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Anular"
                                onClick={() => handleAnular(account)}
                                disabled={account.anulado || !account.comprobante_emitido}
                              >
                                <XCircle className="h-4 w-4 text-amber-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar cuenta"
                                onClick={() => handleDelete(account)}
                                disabled={account.anulado}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Sub-rows for expanded accounts */}
                        {expandedAccounts.has(account.cuenta_id) && account.pagos.map((pago, idx) => (
                          <TableRow key={`${account.cuenta_id}-pago-${idx}`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="pl-8">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">Pago #{idx + 1}</Badge>
                                {pago.numero_comprobante ? (
                                  <span className="text-xs font-mono text-primary">{pago.numero_comprobante}</span>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Sin comprobante</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {pago.pago_id}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-xs">{formatLocalDate(pago.fecha_pago)}</TableCell>
                            <TableCell colSpan={2}></TableCell>
                            <TableCell className="font-medium">{pago.concepto}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(pago.monto_pagado)}</TableCell>
                            <TableCell className="text-right text-green-600">{pago.monto_adelanto > 0 ? formatCurrency(pago.monto_adelanto) : '-'}</TableCell>
                            <TableCell className="text-right text-amber-600">{pago.saldo > 0 ? formatCurrency(pago.saldo) : '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{pago.modalidad}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {/* Botón para emitir o reimprimir comprobante individual */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 ${pago.numero_comprobante ? 'hover:bg-primary/10' : 'hover:bg-muted'}`}
                                  title={pago.numero_comprobante ? `Reimprimir ${pago.numero_comprobante}` : "Emitir nuevo comprobante"}
                                  onClick={() => {
                                    setEmitPaymentReceipt({
                                      payment: pago,
                                      patient: {
                                        id: account.patient_id,
                                        name: account.patient_name,
                                        dni: account.patient_dni,
                                        patient_code: account.patient_code
                                      },
                                      cuentaId: account.cuenta_id
                                    });
                                    setShowEmitPaymentDialog(true);
                                  }}
                                >
                                  {pago.numero_comprobante ? (
                                    <Printer className="h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Ver detalle"
                                  onClick={() => handleViewPaymentDetails(pago)}
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Editar pago"
                                  onClick={() => handleEditPayment(pago, account.patient_id)}
                                >
                                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Eliminar pago"
                                  onClick={() => handleDeletePayment(pago)}
                                  disabled={account.pagos.length === 1}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Anular */}
      <AlertDialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará el comprobante{" "}
              <strong>{selectedAccount?.numero_comprobante}</strong>.
              <br /><br />
              Paciente: {selectedAccount?.patient_name}
              <br />
              Total: {formatCurrency(selectedAccount?.monto_total || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAnular} className="bg-orange-500 hover:bg-orange-600">
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el comprobante{" "}
              <strong>{selectedAccount?.numero_comprobante}</strong>.
              <br /><br />
              Paciente: {selectedAccount?.patient_name}
              <br />
              Total: {formatCurrency(selectedAccount?.monto_total || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal del Recibo */}
      {showReceipt && selectedAccount && (
        <ComprobantesReceipt
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedAccount(null);
          }}
          account={getReceiptAccount(selectedAccount)}
          onComprobanteEmitido={handleComprobanteEmitido}
        />
      )}

      {/* Dialog de eliminación masiva */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar comprobantes seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar {selectedAccountIds.size} comprobantes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar {selectedAccountIds.size} comprobantes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Panel lateral de detalles */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Detalle de Cuenta
            </SheetTitle>
          </SheetHeader>
          
          {detailsAccount && (
            <div className="space-y-4">
              {/* Información del paciente */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-semibold">{detailsAccount.patient_name}</p>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>DNI: {detailsAccount.patient_dni}</span>
                  <span>Código: {detailsAccount.patient_code}</span>
                </div>
              </div>

              {/* Identificadores */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">Cuenta ID</p>
                  <p className="font-mono text-xs">{detailsAccount.cuenta_id.substring(0, 12)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="text-sm font-medium">{formatLocalDate(detailsAccount.fecha_cuenta)}</p>
                </div>
              </div>

              {detailsAccount.numero_comprobante && (
                <div className="bg-primary/10 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">N° Comprobante</p>
                  <p className="font-medium text-primary">{detailsAccount.numero_comprobante}</p>
                </div>
              )}

              {/* Montos */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(detailsAccount.monto_total)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(detailsAccount.monto_adelantado)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCurrency(detailsAccount.saldo_pendiente)}</p>
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Estado</span>
                {getStatusBadge(detailsAccount)}
              </div>

              <Separator />

              {/* Lista de pagos/conceptos como tabla */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Conceptos ({detailsAccount.pagos.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDetailsOpen(false);
                      handleAddPaymentToAccount(detailsAccount);
                    }}
                    disabled={detailsAccount.anulado}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs py-2">#</TableHead>
                        <TableHead className="text-xs py-2">Concepto</TableHead>
                        <TableHead className="text-xs py-2">Modalidad</TableHead>
                        <TableHead className="text-xs py-2 text-right">Importe</TableHead>
                        <TableHead className="text-xs py-2">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsAccount.pagos.map((pago, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs py-2">{idx + 1}</TableCell>
                          <TableCell className="text-xs py-2 font-medium">{pago.concepto}</TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">{pago.modalidad}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-semibold">{formatCurrency(pago.monto_pagado)}</TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">{formatLocalDate(pago.fecha_pago)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="text-xs py-2 font-medium text-right">Total:</TableCell>
                        <TableCell className="text-xs py-2 text-right font-bold">{formatCurrency(detailsAccount.monto_total)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    if (detailsAccount.comprobante_emitido) {
                      await updateDocumentAmount(detailsAccount);
                      setDetailsOpen(false);
                      await handlePrintByType(detailsAccount);
                    } else {
                      setDetailsOpen(false);
                      handleEmitirComprobante(detailsAccount);
                    }
                  }}
                  disabled={detailsAccount.anulado}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {detailsAccount.comprobante_emitido ? "Reimprimir" : "Emitir"}
                </Button>
                {!detailsAccount.anulado && detailsAccount.comprobante_emitido && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailsOpen(false);
                      handleAnular(detailsAccount);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Anular
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog para agregar pago a cuenta */}
      {showAddPaymentDialog && addPaymentAccount && (
        <AddPaymentToAccountDialog
          isOpen={showAddPaymentDialog}
          onClose={() => {
            setShowAddPaymentDialog(false);
            setAddPaymentAccount(null);
          }}
          cuentaId={addPaymentAccount.cuenta_id}
          patientId={addPaymentAccount.patient_id}
          patientName={addPaymentAccount.patient_name}
          onPaymentAdded={handlePaymentAdded}
        />
      )}

      {/* Dialog para eliminar pago individual */}
      <AlertDialog open={showDeletePaymentDialog} onOpenChange={setShowDeletePaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el pago{" "}
              <strong>{deletingPayment?.pago_id}</strong>.
              <br /><br />
              Concepto: {deletingPayment?.concepto}
              <br />
              Monto: {formatCurrency(deletingPayment?.monto || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePayment} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para ver detalle de pago */}
      <PaymentDetailsDialog
        payment={selectedPaymentForDetails}
        open={showPaymentDetails}
        onOpenChange={setShowPaymentDetails}
      />

      {/* Dialog para editar pago */}
      {showEditPaymentDialog && editingPayment && (
        <PaymentDialog
          isOpen={showEditPaymentDialog}
          onClose={() => {
            setShowEditPaymentDialog(false);
            setEditingPayment(null);
          }}
          onPaymentSaved={handlePaymentSaved}
          paymentId={editingPayment.id}
          patientId={editingPayment.patient_id}
        />
      )}

      {/* Dialog para emitir comprobante a pago individual */}
      {showEmitPaymentDialog && emitPaymentReceipt && (
        <EmitPaymentReceiptDialog
          open={showEmitPaymentDialog}
          onOpenChange={(open) => {
            setShowEmitPaymentDialog(open);
            if (!open) setEmitPaymentReceipt(null);
          }}
          payment={emitPaymentReceipt.payment}
          patient={emitPaymentReceipt.patient}
          cuentaId={emitPaymentReceipt.cuentaId}
          onReceiptEmitted={(numero) => {
            queryClient.invalidateQueries({ queryKey: ["comprobantes-accounts"] });
            toast({
              title: "Comprobante emitido",
              description: `Se emitió el comprobante ${numero} para el pago ${emitPaymentReceipt.payment.pago_id}`,
            });
            setShowEmitPaymentDialog(false);
            setEmitPaymentReceipt(null);
          }}
        />
      )}

      {/* Dialog para reimprimir comprobante de cuenta (estilo térmico) */}
      {showAccountPrintDialog && accountToPrint && (
        <AccountReceiptPrintDialog
          open={showAccountPrintDialog}
          onOpenChange={(open) => {
            setShowAccountPrintDialog(open);
            if (!open) setAccountToPrint(null);
          }}
          account={accountToPrint}
        />
      )}
    </div>
  );
}
