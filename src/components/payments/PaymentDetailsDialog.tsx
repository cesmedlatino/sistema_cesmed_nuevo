import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paperclip, Eye, Download, X, User, CreditCard, FileText, Clock, Receipt, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmitirDocumentoDialog } from "./EmitirDocumentoDialog";
import { PaymentReceiptPreview } from "./PaymentReceiptPreview";

interface PaymentDetailsDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailsDialog({ payment, open, onOpenChange }: PaymentDetailsDialogProps) {
  const [showImage, setShowImage] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [emittedReceipt, setEmittedReceipt] = useState<{numero: string, tipo: string} | null>(null);
  const [showEmitirDialog, setShowEmitirDialog] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const queryClient = useQueryClient();
  
  if (!payment) return null;

  // Callback cuando se emite documento desde el dialog
  const handleDocumentoEmitido = (numero: string, tipo: string) => {
    setEmittedReceipt({ numero, tipo });
    setShowReceiptPreview(true);
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  };

  const handlePrintReceipt = () => {
    const receiptType = emittedReceipt?.tipo || payment.document_type || 'Nota de Venta';
    const isBoletaOrFactura = receiptType?.includes('Boleta') || receiptType?.includes('Factura');
    
    // Si es Boleta o Factura, usar el método antiguo de impresión A4
    if (isBoletaOrFactura) {
      printA4Receipt();
    } else {
      // Para Nota de Venta, mostrar vista previa estilo farmacia
      setShowPrintPreview(true);
    }
  };

  const printA4Receipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptNumber = emittedReceipt?.numero || payment.document_number;
    const receiptType = emittedReceipt?.tipo || payment.document_type || 'Nota de Venta';
    const isBoletaOrFactura = receiptType?.includes('Boleta') || receiptType?.includes('Factura');

    // Get fiscal data from documento_de_pago if available
    const docPago = payment.documento_de_pago;
    const clienteRuc = docPago?.cliente_ruc || payment.patient_dni || '-';
    const clienteRazonSocial = docPago?.cliente_razon_social || payment.patient_name;
    const clienteDireccion = docPago?.cliente_direccion || '-';
    const subtotal = docPago?.subtotal || (payment.monto_pagado / 1.18);
    const igv = docPago?.igv || (payment.monto_pagado - subtotal);

    if (isBoletaOrFactura) {
      // A4 format for Boleta/Factura
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${receiptType} - ${receiptNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-info { flex: 1; }
            .company-name { font-size: 18px; font-weight: bold; color: #5c1c8c; }
            .company-details { font-size: 11px; color: #666; margin-top: 5px; }
            .document-info { text-align: right; border: 2px solid #5c1c8c; padding: 15px; border-radius: 8px; }
            .document-type { font-size: 16px; font-weight: bold; color: #5c1c8c; }
            .document-number { font-size: 14px; font-weight: bold; margin-top: 5px; }
            .document-ruc { font-size: 12px; margin-top: 5px; }
            .client-section { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .client-row { display: flex; margin: 5px 0; }
            .client-label { width: 150px; font-weight: bold; color: #333; }
            .client-value { flex: 1; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { background: #5c1c8c; color: white; padding: 10px; text-align: left; }
            .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
            .totals-section { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-box { width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .total-row.grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #333; border-bottom: none; margin-top: 10px; padding-top: 15px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div class="company-name">CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L</div>
              <div class="company-details">
                RUC: 20607644315<br>
                Domicilio: Mz. G Lote. 17 Coop. Villa Pornogocha<br>
                Paucarpata - Arequipa - Perú<br>
                Teléfono: 054-407301
              </div>
            </div>
            <div class="document-info">
              <div class="document-type">${receiptType?.toUpperCase()}</div>
              <div class="document-number">${receiptNumber}</div>
              <div class="document-ruc">RUC: 20607644315</div>
            </div>
          </div>
          
          <div class="client-section">
            <div class="client-row">
              <span class="client-label">Fecha de Emisión:</span>
              <span class="client-value">${formatDate(payment.fecha_pago)}</span>
            </div>
            <div class="client-row">
              <span class="client-label">${receiptType?.includes('Factura') ? 'RUC' : 'DNI'}:</span>
              <span class="client-value">${clienteRuc}</span>
            </div>
            <div class="client-row">
              <span class="client-label">${receiptType?.includes('Factura') ? 'Razón Social' : 'Cliente'}:</span>
              <span class="client-value">${clienteRazonSocial}</span>
            </div>
            <div class="client-row">
              <span class="client-label">Dirección:</span>
              <span class="client-value">${clienteDireccion}</span>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Cant.</th>
                <th>Descripción</th>
                <th>P. Unit.</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>${payment.concept_name} - ${payment.modality_name || 'Servicio'}</td>
                <td>${formatCurrency(payment.monto_pagado)}</td>
                <td>${formatCurrency(payment.monto_pagado)}</td>
              </tr>
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
                <span>${formatCurrency(payment.monto_pagado)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Representación impresa de la ${receiptType}</p>
            <p>Conserve este documento para cualquier reclamo</p>
          </div>
        </body>
        </html>
      `);
    }
    printWindow.document.close();
    printWindow.print();
    printWindow.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (confirmed: boolean) => {
    return confirmed ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Confirmado
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Pendiente
      </Badge>
    );
  };

  const getEstadoPagoBadge = (estado: string) => {
    const estadoLower = estado?.toLowerCase() || 'pendiente';
    const styles: Record<string, string> = {
      'pagado': 'bg-green-100 text-green-800 border-green-200',
      'confirmado': 'bg-green-100 text-green-800 border-green-200',
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'parcial': 'bg-blue-100 text-blue-800 border-blue-200',
      'adelanto': 'bg-blue-100 text-blue-800 border-blue-200',
      'anulado': 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <Badge className={styles[estadoLower] || 'bg-gray-100 text-gray-800'}>
        {estado || 'Sin estado'}
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Pago
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-4 space-y-4">
            {/* Cabecera con IDs y Estado */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Pago ID</span>
                  <p className="font-mono text-sm font-medium">{payment.pago_id || '-'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Cuenta ID</span>
                  <p className="font-mono text-sm font-medium">{payment.cuenta_id || '-'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <span className="text-xs text-muted-foreground">Nro. Documento</span>
                  <p className="text-sm font-medium">{payment.document_number || 'No asignado'}</p>
                </div>
                <div>{getStatusBadge(payment.confirmado)}</div>
              </div>
            </div>

            {/* Información del Paciente - Compacta */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium truncate">{payment.patient_name}</p>
              </div>
            </div>

            {/* Grid de información del pago - 2 columnas compactas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4" />
                Información del Pago
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Fecha</span>
                  <p className="text-sm font-medium">{formatDate(payment.fecha_pago)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Importe</span>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(payment.monto_pagado)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Concepto</span>
                  <p className="text-sm font-medium">{payment.concept_name}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Modalidad</span>
                  <p className="text-sm font-medium">{payment.modality_name}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Tipo Confirm.</span>
                  <p className="text-sm font-medium">{payment.tipo_confirmacion || '-'}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <div className="mt-0.5">{getEstadoPagoBadge(payment.estado_pago)}</div>
                </div>
              </div>

              {/* Montos de adelanto y saldo */}
              {(payment.monto_adelanto || payment.saldo) && (
                <div className="grid grid-cols-2 gap-3">
                  {payment.monto_adelanto && (
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <span className="text-xs text-muted-foreground">Adelanto</span>
                      <p className="text-sm font-bold text-blue-700">{formatCurrency(payment.monto_adelanto)}</p>
                    </div>
                  )}
                  {payment.saldo && (
                    <div className="bg-orange-50 rounded-lg p-2.5">
                      <span className="text-xs text-muted-foreground">Saldo Pendiente</span>
                      <p className="text-sm font-bold text-orange-700">{formatCurrency(payment.saldo)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Archivo de confirmación */}
            {payment.tiene_adjunto && payment.archivo_confirmacion && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Paperclip className="h-4 w-4" />
                  Archivo de Confirmación
                </div>
                <div className="border rounded-lg overflow-hidden">
                  {!imageError ? (
                    <>
                      <img
                        src={payment.archivo_confirmacion}
                        alt="Confirmación"
                        className="w-full h-32 object-contain bg-gray-50 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowImage(true)}
                        onError={() => setImageError(true)}
                      />
                      <div className="flex border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 rounded-none h-9"
                          onClick={() => setShowImage(true)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Ver
                        </Button>
                        <div className="w-px bg-border" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 rounded-none h-9"
                          onClick={() => window.open(payment.archivo_confirmacion, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Descargar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">No se puede mostrar</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(payment.archivo_confirmacion, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Descargar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {payment.observaciones && (
              <div className="space-y-2">
                <span className="text-sm font-semibold">Observaciones</span>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {payment.observaciones}
                </p>
              </div>
            )}

            {/* Comprobante Emitido o Sección para emitir */}
            {payment.document_number ? (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <Receipt className="h-4 w-4" />
                  Comprobante Emitido
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{payment.document_type || 'Nota de Venta'}</p>
                      <p className="font-mono font-bold text-green-800">{payment.document_number}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePrintReceipt}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Receipt className="h-4 w-4" />
                  Emitir Comprobante
                </div>
                <Button 
                  onClick={() => setShowEmitirDialog(true)}
                  className="w-full"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Seleccionar Tipo de Documento
                </Button>
              </div>
            )}

            {/* Vista previa del comprobante recién emitido */}
            {showReceiptPreview && emittedReceipt && (
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <Receipt className="h-4 w-4" />
                    ¡Comprobante Generado!
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowReceiptPreview(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{emittedReceipt.tipo}</p>
                      <p className="font-mono font-bold text-green-800">{emittedReceipt.numero}</p>
                    </div>
                    <Button 
                      onClick={handlePrintReceipt}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Imprimir
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Información del registro - Compacta */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" />
                Registro
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Registrado por</span>
                  <p className="font-medium">{payment.user_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha registro</span>
                  <p className="font-medium">{formatDate(payment.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal para ver imagen en pantalla completa */}
      <Dialog open={showImage} onOpenChange={setShowImage}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Imagen de Confirmación</DialogTitle>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center">
            <img
              src={payment?.archivo_confirmacion}
              alt="Confirmación - Vista completa"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
          </div>
          <div className="p-4 pt-0 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(payment?.archivo_confirmacion, '_blank')}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Descargar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImage(false)}
            >
              <X className="h-4 w-4 mr-1.5" />
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para emitir documento */}
      <EmitirDocumentoDialog
        open={showEmitirDialog}
        onOpenChange={setShowEmitirDialog}
        payment={payment}
        onDocumentoEmitido={handleDocumentoEmitido}
      />

      {/* Vista previa de impresión estilo farmacia */}
      <PaymentReceiptPreview
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
        numeroComprobante={emittedReceipt?.numero || payment.document_number || ''}
        tipoComprobante={emittedReceipt?.tipo || payment.document_type || 'Nota de Venta'}
        fecha={payment.fecha_pago}
        paciente={{
          nombre: payment.patient_name,
          dni: payment.patient_dni
        }}
        concepto={payment.concept_name}
        modalidad={payment.modality_name}
        importe={payment.monto_pagado}
        adelanto={payment.monto_adelanto}
        saldo={payment.saldo}
      />
    </>
  );
}
