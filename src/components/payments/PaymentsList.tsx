import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Paperclip, Eye, Edit, CalendarIcon, X, Trash2, FileWarning } from "lucide-react";
import { usePaymentsList } from "@/hooks/usePaymentsList";
import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { PaymentDialog } from "./PaymentDialog";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PaymentsListProps {
  onSelectionChange?: (selectedCuentaId: string | null) => void;
}

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'custom-month' | 'custom-date' | null;

export function PaymentsList({ onSelectionChange }: PaymentsListProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(undefined);
  const [deletingPayment, setDeletingPayment] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  const { data: payments, isLoading, error } = usePaymentsList();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filterByDate = (payment: any) => {
    if (!dateFilter || dateFilter === 'all') return true;
    
    const paymentDate = parseISO(payment.fecha_pago);
    const today = new Date();
    
    switch (dateFilter) {
      case 'today':
        return format(paymentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      
      case 'week':
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return isWithinInterval(paymentDate, { start: weekStart, end: weekEnd });
      
      case 'month':
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      
      case 'custom-month':
        if (!selectedMonth) return true;
        const customMonthStart = startOfMonth(selectedMonth);
        const customMonthEnd = endOfMonth(selectedMonth);
        return isWithinInterval(paymentDate, { start: customMonthStart, end: customMonthEnd });
      
      case 'custom-date':
        if (!selectedDate) return true;
        return format(paymentDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      
      default:
        return true;
    }
  };

  // Manejo de selección múltiple
  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    const newSelected = new Set(selectedPaymentIds);
    if (checked) {
      newSelected.add(paymentId);
    } else {
      newSelected.delete(paymentId);
    }
    setSelectedPaymentIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredPayments.map((p: any) => p.id));
      setSelectedPaymentIds(allIds);
    } else {
      setSelectedPaymentIds(new Set());
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedPaymentIds.size === 0) return;

    try {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .in('id', Array.from(selectedPaymentIds));

      if (error) throw error;

      toast({
        title: 'Pagos eliminados',
        description: `Se eliminaron ${selectedPaymentIds.size} pagos correctamente`,
      });

      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowBulkDeleteDialog(false);
      setSelectedPaymentIds(new Set());
    } catch (error: any) {
      console.error('Error deleting payments:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar los pagos: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredPayments = payments?.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      payment.patient_name?.toLowerCase().includes(searchLower) ||
      payment.concept_name?.toLowerCase().includes(searchLower) ||
      payment.modality_name?.toLowerCase().includes(searchLower) ||
      payment.tipo_confirmacion?.toLowerCase().includes(searchLower) ||
      payment.document_number?.toLowerCase().includes(searchLower) ||
      payment.user_name?.toLowerCase().includes(searchLower) ||
      payment.turno?.toLowerCase().includes(searchLower)
    );
    
    return matchesSearch && filterByDate(payment);
  }) || [];

  const handleClearFilters = () => {
    setDateFilter(null);
    setSelectedDate(undefined);
    setSelectedMonth(undefined);
  };

  const handleDeletePayment = (payment: any) => {
    setDeletingPayment(payment);
    setShowDeleteDialog(true);
  };

  const confirmDeletePayment = async () => {
    if (!deletingPayment) return;

    try {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast({
        title: 'Pago eliminado',
        description: 'El pago ha sido eliminado correctamente',
      });

      // Refrescar la lista de pagos
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowDeleteDialog(false);
      setDeletingPayment(null);
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el pago: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE');
  };

  const getConfirmadoBadge = (confirmed: boolean) => {
    return confirmed ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Confirmado
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        Pendiente
      </Badge>
    );
  };

  const getEstadoPagoBadge = (estadoPago: string, saldo?: number | null) => {
    const estadoLower = estadoPago?.toLowerCase() || 'pendiente';
    
    // Estado "Cancelado" = pagado completamente (saldo 0)
    if (estadoLower === 'cancelado' || estadoLower === 'pagado' || (saldo !== null && saldo !== undefined && saldo === 0 && estadoLower !== 'pendiente')) {
      return (
        <Badge className="bg-blue-500 text-white hover:bg-blue-600">
          Cancelado
        </Badge>
      );
    }
    
    // Estado "Adelanto" = pago parcial
    if (estadoLower === 'adelanto' || estadoLower === 'parcial') {
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-600">
          Adelanto
        </Badge>
      );
    }
    
    // Estado "Pendiente"
    if (estadoLower === 'pendiente') {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pendiente
        </Badge>
      );
    }
    
    // Estado "Confirmado" 
    if (estadoLower === 'confirmado') {
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-600">
          Confirmado
        </Badge>
      );
    }
    
    // Estados negativos
    if (estadoLower === 'anulado' || estadoLower === 'rechazado') {
      return (
        <Badge variant="destructive">
          {estadoPago}
        </Badge>
      );
    }
    
    // Default
    return (
      <Badge variant="outline">
        {estadoPago || 'Sin estado'}
      </Badge>
    );
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setShowEditDialog(true);
  };

  const handlePaymentSaved = (paymentId: string) => {
    setShowEditDialog(false);
    setEditingPayment(null);
    // La tabla se actualiza automáticamente gracias a react-query
  };

  const handleRowSelection = (cuentaId: string) => {
    const newSelectedCuentaId = selectedCuentaId === cuentaId ? null : cuentaId;
    setSelectedCuentaId(newSelectedCuentaId);
    onSelectionChange?.(newSelectedCuentaId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando pagos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error al cargar los pagos</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por paciente, concepto, modalidad, usuario, turno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filtrar por:</span>
        
        <Button
          variant={dateFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setDateFilter('all');
            setSelectedDate(undefined);
            setSelectedMonth(undefined);
          }}
        >
          Todos
        </Button>

        <Button
          variant={dateFilter === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setDateFilter('today');
            setSelectedDate(undefined);
            setSelectedMonth(undefined);
          }}
        >
          Hoy
        </Button>

        <Button
          variant={dateFilter === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setDateFilter('week');
            setSelectedDate(undefined);
            setSelectedMonth(undefined);
          }}
        >
          Semana Actual
        </Button>

        <Button
          variant={dateFilter === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setDateFilter('month');
            setSelectedDate(undefined);
            setSelectedMonth(undefined);
          }}
        >
          Mes Actual
        </Button>

        {/* Selector de Mes */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter === 'custom-month' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !selectedMonth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: es }) : "Seleccionar Mes"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(date) => {
                setSelectedMonth(date);
                setDateFilter('custom-month');
                setSelectedDate(undefined);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Selector de Fecha */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={dateFilter === 'custom-date' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar Fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setDateFilter('custom-date');
                setSelectedMonth(undefined);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Botón para limpiar filtros */}
        {dateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        )}

        {selectedPaymentIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            className="ml-2"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar seleccionados ({selectedPaymentIds.size})
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {filteredPayments.length} {filteredPayments.length === 1 ? 'pago' : 'pagos'}
        </span>
      </div>

      {/* Tabla de pagos */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
             <TableRow>
               <TableHead className="w-12">
                 <Checkbox
                   checked={filteredPayments.length > 0 && selectedPaymentIds.size === filteredPayments.length}
                   onCheckedChange={(checked) => handleSelectAll(!!checked)}
                 />
               </TableHead>
               <TableHead>PagoID</TableHead>
               <TableHead>CuentaID</TableHead>
               <TableHead>Nro de Documento</TableHead>
               <TableHead>Paciente</TableHead>
               <TableHead>Fecha</TableHead>
               <TableHead>Concepto</TableHead>
               <TableHead>Modalidad</TableHead>
               <TableHead>Tipo Confirmación</TableHead>
               <TableHead>Adjunto</TableHead>
             <TableHead>Importe</TableHead>
             <TableHead>Monto de Adelanto</TableHead>
             <TableHead>Saldo Pendiente</TableHead>
              <TableHead>Confirmado</TableHead>
              <TableHead>Estado de Pago</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Acciones</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={18} className="text-center py-8">
                   {searchTerm ? "No se encontraron pagos" : "No hay pagos registrados"}
                 </TableCell>
               </TableRow>
            ) : (
              filteredPayments.map((payment: any) => (
                 <TableRow 
                   key={payment.id}
                   className={selectedPaymentIds.has(payment.id) ? "bg-muted/50" : ""}
                 >
                   <TableCell>
                     <Checkbox
                       checked={selectedPaymentIds.has(payment.id)}
                       onCheckedChange={(checked) => handleSelectPayment(payment.id, !!checked)}
                     />
                   </TableCell>
                   <TableCell className="font-mono text-sm font-medium">
                     {payment.pago_id || 'Generando...'}
                   </TableCell>
                   <TableCell className="font-mono text-sm">
                     {payment.cuenta_id || 'Generando...'}
                   </TableCell>
                    <TableCell className="font-medium">
                      {payment.document_number ? (
                        <span className="text-foreground">{payment.document_number}</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <FileWarning className="h-4 w-4 text-amber-500" />
                          <span className="text-amber-600 text-sm">Sin comprobante</span>
                        </div>
                      )}
                    </TableCell>
                   <TableCell>{payment.patient_name}</TableCell>
                   <TableCell>{formatDate(payment.fecha_pago)}</TableCell>
                   <TableCell>{payment.concept_name}</TableCell>
                   <TableCell>{payment.modality_name}</TableCell>
                   <TableCell>{payment.tipo_confirmacion}</TableCell>
                   <TableCell>
                     {payment.tiene_adjunto && payment.archivo_confirmacion ? (
                       <Paperclip className="h-4 w-4 text-blue-600" />
                     ) : (
                       '-'
                     )}
                   </TableCell>
                   <TableCell className="font-medium">
                     {formatCurrency(payment.monto_pagado)}
                   </TableCell>
                   <TableCell className="font-medium">
                     {payment.monto_adelanto ? formatCurrency(payment.monto_adelanto) : '-'}
                   </TableCell>
                   <TableCell className="font-medium">
                     {payment.saldo ? formatCurrency(payment.saldo) : '-'}
                   </TableCell>
                   <TableCell>
                     {getConfirmadoBadge(payment.confirmado)}
                   </TableCell>
                    <TableCell>
                      {getEstadoPagoBadge(payment.estado_pago, payment.saldo)}
                    </TableCell>
                   <TableCell>{payment.user_name}</TableCell>
                   <TableCell>
                     {payment.turno ? (
                       <Badge 
                         variant="outline" 
                         className={payment.turno === 'Mañana' 
                           ? 'bg-orange-100 text-orange-800 border-orange-300' 
                           : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                         }
                       >
                         {payment.turno}
                       </Badge>
                     ) : '-'}
                   </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(payment)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                          title="Editar pago"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment)}
                          title="Eliminar pago"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                 </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de detalles */}
      <PaymentDetailsDialog
        payment={selectedPayment}
        open={showDetails}
        onOpenChange={setShowDetails}
      />

      {/* Dialog de edición */}
      <PaymentDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        patientId={editingPayment?.patient_id}
        specialistId={editingPayment?.specialist_id}
        paymentId={editingPayment?.id}
        onPaymentSaved={handlePaymentSaved}
      />

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el pago:
              {deletingPayment && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <p><strong>PagoID:</strong> {deletingPayment.pago_id}</p>
                  <p><strong>Paciente:</strong> {deletingPayment.patient_name}</p>
                  <p><strong>Concepto:</strong> {deletingPayment.concept_name}</p>
                  <p><strong>Monto:</strong> {formatCurrency(deletingPayment.monto_pagado)}</p>
                  <p><strong>Fecha:</strong> {formatDate(deletingPayment.fecha_pago)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminación masiva */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pagos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar {selectedPaymentIds.size} pagos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar {selectedPaymentIds.size} pagos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}