import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Printer, FileText, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PaymentInfo {
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
}

interface PatientInfo {
  id: string;
  name: string;
  dni: string;
  patient_code: string;
}

interface EmitPaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentInfo;
  patient: PatientInfo;
  cuentaId: string;
  onReceiptEmitted: (numeroComprobante: string) => void;
}

export function EmitPaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
  patient,
  cuentaId,
  onReceiptEmitted
}: EmitPaymentReceiptDialogProps) {
  const [tipoDocumento, setTipoDocumento] = useState('Nota de Venta');
  const [isEmitting, setIsEmitting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [numCopies, setNumCopies] = useState(2);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Campos para Boleta
  const [boletaNumero, setBoletaNumero] = useState('');
  const [boletaDni, setBoletaDni] = useState('');
  const [boletaNombre, setBoletaNombre] = useState('');
  const [boletaDireccion, setBoletaDireccion] = useState('');

  // Campos para Factura
  const [facturaNumero, setFacturaNumero] = useState('');
  const [facturaRuc, setFacturaRuc] = useState('');
  const [facturaRazonSocial, setFacturaRazonSocial] = useState('');
  const [facturaDireccion, setFacturaDireccion] = useState('');

  // Determinar si es modo reimpresión (ya tiene comprobante)
  const isReprintMode = !!payment.numero_comprobante;

  // Cargar configuración de comprobantes
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('comprobante_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setConfig(data);
      }
    };
    if (open) loadConfig();
  }, [open]);

  // Pre-llenar datos del paciente
  useEffect(() => {
    if (patient && open) {
      setBoletaDni(patient.dni || '');
      setBoletaNombre(patient.name || '');
      setFacturaRazonSocial(patient.name || '');
      // Reset números al abrir
      setBoletaNumero('');
      setFacturaNumero('');
    }
  }, [patient, open]);

  const calcularIGV = (monto: number) => {
    const igvRate = 0.18;
    const subtotal = monto / (1 + igvRate);
    const igv = monto - subtotal;
    return { subtotal, igv };
  };

  const handleEmitir = async () => {
    if (!payment) return;
    
    // Si ya tiene comprobante, no permitir emitir uno nuevo
    if (isReprintMode) {
      toast({
        title: 'Acción no permitida',
        description: 'Este pago ya tiene un comprobante asignado. Solo puede reimprimir.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsEmitting(true);

    try {
      const today = new Date();
      const fechaEmision = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      let documentData: any = {
        patient_id: patient.id,
        importe_total: payment.monto_pagado,
        fecha_emision: fechaEmision,
        estado: 'emitido',
        tipo_documento: tipoDocumento,
        estado_documento: payment.saldo > 0 ? 'Adelanto' : 'Cancelado',
        observaciones: `Comprobante para pago ${payment.pago_id} de cuenta ${cuentaId}`,
        forma_pago: payment.modalidad || 'Contado',
      };

      if (tipoDocumento === 'Boleta') {
        if (!boletaNumero.trim()) {
          toast({
            title: 'Error',
            description: 'Debe ingresar el número de boleta',
            variant: 'destructive',
          });
          setIsEmitting(false);
          return;
        }
        const { subtotal, igv } = calcularIGV(payment.monto_pagado);
        documentData = {
          ...documentData,
          numero_documento: boletaNumero,
          cliente_ruc: boletaDni,
          cliente_razon_social: boletaNombre,
          cliente_direccion: boletaDireccion,
          serie: 'B001',
          subtotal,
          igv,
        };
      } else if (tipoDocumento === 'Factura') {
        if (!facturaNumero.trim()) {
          toast({
            title: 'Error',
            description: 'Debe ingresar el número de factura',
            variant: 'destructive',
          });
          setIsEmitting(false);
          return;
        }
        const { subtotal, igv } = calcularIGV(payment.monto_pagado);
        documentData = {
          ...documentData,
          numero_documento: facturaNumero,
          cliente_ruc: facturaRuc,
          cliente_razon_social: facturaRazonSocial,
          cliente_direccion: facturaDireccion,
          serie: 'F001',
          subtotal,
          igv,
        };
      }
      // Para Nota de Venta, el número se genera automáticamente por trigger

      const { data: docData, error: docError } = await supabase
        .from('documento_de_pago')
        .insert(documentData)
        .select('numero_documento, id')
        .single();

      if (docError) throw docError;

      // Actualizar el pago con referencia al documento
      const { error: pagoError } = await supabase
        .from('pagos')
        .update({ documento_pago_id: docData.id })
        .eq('id', payment.id);

      if (pagoError) throw pagoError;

      toast({
        title: 'Comprobante emitido',
        description: `${tipoDocumento} ${docData.numero_documento} emitido para pago ${payment.pago_id}`,
      });

      queryClient.invalidateQueries({ queryKey: ['comprobantes-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      // Actualizar el número de comprobante en el payment local para imprimir
      payment.numero_comprobante = docData.numero_documento;
      
      onReceiptEmitted(docData.numero_documento);

      // Para Nota de Venta, abrir directamente la impresión
      if (tipoDocumento === 'Nota de Venta') {
        await handlePrint();
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al emitir documento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo emitir el documento: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!config) {
      toast({
        title: 'Error',
        description: 'Configuración de impresión no cargada',
        variant: 'destructive',
      });
      return;
    }

    const paperWidth = Number(config.paper_width) || 80;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;

    toast({
      title: 'Imprimiendo...',
      description: `Enviando ${numCopies} copia(s)${config.default_printer ? ` a: ${config.default_printer}` : ''}`,
    });

    const generateReceiptHTML = () => {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('es-PE');
      const formattedTime = currentDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Nota de Venta - ${payment.numero_comprobante || 'Nuevo'}</title>
          <style>
            @page { 
              size: ${paperWidth}mm auto; 
              margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; 
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: ${config.font_family || 'Arial'}; 
              font-size: ${config.font_size || 10}px; 
              line-height: ${config.line_height || '1.3'};
              width: ${paperWidth}mm;
              padding: 2mm;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: ${(config.font_size || 10) + 4}px; font-weight: bold;">${config.company_name_line1 || 'Centro de Especialidades Médicas'}</div>
            <div style="font-size: ${(config.font_size || 10) + 2}px; font-weight: bold;">${config.company_name_line2 || 'Latinoamericano'}</div>
          </div>
          <div class="center" style="font-size: ${(config.font_size || 10) - 1}px; margin-top: 4px;">
            <div>RUC: ${config.ruc || '20607644315'}</div>
            <div>${config.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa Pornogoche'}</div>
            <div>${config.address_line2 || 'Paucarpata - Arequipa - Perú'}</div>
            <div>Tel: ${config.phone || '054-407301'}</div>
          </div>
          <div class="separator"></div>
          <div class="center bold">
            <div>${config.document_title || 'NOTA DE VENTA'}</div>
            <div>N° ${payment.numero_comprobante}</div>
          </div>
          <div class="separator"></div>
          <div>
            <div>Fecha: ${formattedDate} Hora: ${formattedTime}</div>
          </div>
          <div class="separator"></div>
          <div>
            <div>Paciente: ${patient.name}</div>
            <div>DNI: ${patient.dni}</div>
            <div>Código HC: ${patient.patient_code}</div>
          </div>
          <div class="separator"></div>
          <div class="row bold">
            <span>DESCRIPCIÓN</span>
            <span>IMPORTE</span>
          </div>
          <div class="separator"></div>
          <div class="row">
            <span>${payment.concepto}</span>
            <span>S/. ${payment.monto_pagado.toFixed(2)}</span>
          </div>
          <div style="font-size: ${(config.font_size || 10) - 1}px; color: #666;">
            Pago: ${payment.pago_id} - ${payment.modalidad}
          </div>
          <div class="separator"></div>
          <div class="row bold">
            <span>TOTAL S/.</span>
            <span>${payment.monto_pagado.toFixed(2)}</span>
          </div>
          <div class="separator"></div>
          <div>
            <div>Cuenta: ${cuentaId}</div>
            <div>Adelanto: S/. ${payment.monto_adelanto.toFixed(2)}</div>
            <div>Saldo: S/. ${payment.saldo.toFixed(2)}</div>
          </div>
          <div class="separator"></div>
          <div class="center" style="font-size: ${(config.font_size || 10) - 1}px; margin-top: 4px;">
            <div>${config.footer_line1 || '¡Gracias por su preferencia!'}</div>
            <div>${config.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 300);
            };
          </script>
        </body>
        </html>
      `;
    };

    // Print copies sequentially with delay for thermal printer
    for (let i = 0; i < numCopies; i++) {
      await new Promise<void>((resolve) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) {
          toast({
            title: 'Error',
            description: 'Bloqueador de pop-ups activo. Permita las ventanas emergentes.',
            variant: 'destructive'
          });
          resolve();
          return;
        }
        printWindow.document.write(generateReceiptHTML());
        printWindow.document.close();
        setTimeout(() => resolve(), 1500);
      });
    }
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };

  const numeroComprobantePreview = config 
    ? `${config.correlative_prefix}-${String(config.correlative_current + 1).padStart(config.correlative_zeros, '0')}`
    : 'NV-000001';

  // Helper para formatear hora local
  const getCurrentLocalTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${min}`;
  };

  const companyName = config?.company_name_line1 || 'Centro de Especialidades Médicas';
  const companyName2 = config?.company_name_line2 || 'Latinoamericano';
  const ruc = config?.ruc || '20607644315';
  const address1 = config?.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa';
  const address2 = config?.address_line2 || 'Pornogoche';
  const address3 = config?.address_line3 || 'Paucarpata - Arequipa - Perú';
  const phone = config?.phone || '054-407301';
  const whatsapp = config?.whatsapp || '950293377';

  // MODO REIMPRESIÓN: Solo mostrar vista previa y permitir imprimir
  if (isReprintMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                <span>Reimprimir Comprobante - {payment.numero_comprobante}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="num-copies" className="text-sm whitespace-nowrap">
                    Nro de copias:
                  </Label>
                  <Input
                    id="num-copies"
                    type="number"
                    min="1"
                    max="10"
                    value={numCopies}
                    onChange={(e) => setNumCopies(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                    className="w-16 h-8"
                  />
                </div>
                <Button variant="default" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
            <div 
              ref={printRef}
              className="bg-white border rounded-lg shadow-lg"
              style={{
                width: config ? `${config.paper_width}mm` : '80mm',
                padding: config ? `${config.margin_top}mm ${config.margin_right}mm ${config.margin_bottom}mm ${config.margin_left}mm` : '2mm',
                fontSize: config ? `${config.font_size}px` : '8px',
                lineHeight: config?.line_height || '1.4',
                fontFamily: config?.font_family || 'Arial',
              }}
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="text-lg font-bold">{companyName}</div>
                <div className="text-base font-bold">{companyName2}</div>
              </div>

              {/* Company Info */}
              <div className="text-center space-y-0 text-xs mt-2">
                <div>RUC: {ruc}</div>
                <div>{address1}</div>
                <div>{address2}</div>
                <div>{address3}</div>
                <div>Tel: {phone} WhatsApp: {whatsapp}</div>
              </div>

              {/* Separator */}
              <div className="text-center my-2">
                <div>-----------------------------------------------</div>
                <div className="font-bold">{config?.document_title || 'NOTA DE VENTA'}</div>
                <div className="font-bold">N° {payment.numero_comprobante}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Info */}
              <div className="space-y-0 text-xs">
                <div>Fecha: {formatDate(payment.fecha_pago)} {getCurrentLocalTime()}</div>
                <div>Tipo: Pago por servicios</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Patient Info */}
              <div className="space-y-0 text-xs">
                <div>Paciente: {patient.name}</div>
                <div>DNI: {patient.dni}</div>
                <div>Código: {patient.patient_code}</div>
              </div>

              {/* Separator */}
              <div className="text-xs">-----------------------------------------------</div>

              {/* Items Header */}
              <div className="grid grid-cols-12 gap-1 font-bold text-xs">
                <span className="col-span-2">CÓD</span>
                <span className="col-span-5">DESCRIPCIÓN</span>
                <span className="col-span-2 text-right">CANT</span>
                <span className="col-span-3 text-right">TOTAL</span>
              </div>
              <div className="text-xs">-----------------------------------------------</div>

              {/* Item */}
              <div className="space-y-0 text-xs">
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-2">{payment.pago_id.slice(-4)}</span>
                  <span className="col-span-5 truncate">{payment.concepto}</span>
                  <span className="col-span-2 text-right">1</span>
                  <span className="col-span-3 text-right">S/. {payment.monto_pagado.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground pl-2">
                  Modalidad: {payment.modalidad}
                </div>
              </div>

              <div className="text-xs">-----------------------------------------------</div>

              {/* Totals */}
              <div className="space-y-0 text-xs">
                <div className="flex justify-between">
                  <span>Monto Total:</span>
                  <span>S/. {payment.monto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adelanto:</span>
                  <span>S/. {payment.monto_adelanto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>PAGADO S/.</span>
                  <span>{payment.monto_pagado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo:</span>
                  <span>S/. {payment.saldo.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs">-----------------------------------------------</div>

              {/* Account info */}
              <div className="text-xs">
                <div>Cuenta: {cuentaId}</div>
              </div>

              <div className="text-xs">-----------------------------------------------</div>

              {/* Footer */}
              <div className="text-center text-xs mt-2">
                <div>{config?.footer_line1 || '¡Gracias por su preferencia!'}</div>
                <div>{config?.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
                <div>{config?.footer_line3 || 'www.cesmedlatinoamericano.com'}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // MODO EMISIÓN: Formulario para emitir nuevo comprobante
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Emitir Comprobante - Pago {payment.pago_id}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tipoDocumento} onValueChange={setTipoDocumento} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="Nota de Venta" className="flex items-center gap-1 text-xs">
              <FileText className="h-4 w-4" />
              Nota de Venta
            </TabsTrigger>
            <TabsTrigger value="Boleta" className="flex items-center gap-1 text-xs">
              <Receipt className="h-4 w-4" />
              Boleta
            </TabsTrigger>
            <TabsTrigger value="Factura" className="flex items-center gap-1 text-xs">
              <Building2 className="h-4 w-4" />
              Factura
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Nota de Venta" className="space-y-4 mt-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                La Nota de Venta se generará automáticamente con los datos del pago.
              </p>
              <div className="text-xs text-primary font-medium">
                Número a asignar: {numeroComprobantePreview}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <span className="text-muted-foreground">Paciente:</span>
                  <p className="font-medium">{patient.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Importe:</span>
                  <p className="font-medium">S/. {payment.monto_pagado.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Concepto:</span>
                  <p className="font-medium">{payment.concepto}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium">{formatDate(payment.fecha_pago)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Label htmlFor="copies-emit" className="text-sm">Copias a imprimir:</Label>
                <Input
                  id="copies-emit"
                  type="number"
                  min="1"
                  max="10"
                  value={numCopies}
                  onChange={(e) => setNumCopies(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-16 h-8"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="Boleta" className="space-y-4 mt-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary">
                <strong>Boleta Electrónica</strong> - Registre los datos de la boleta ya emitida.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="boletaNumero">Nro. de Boleta *</Label>
                <Input
                  id="boletaNumero"
                  value={boletaNumero}
                  onChange={(e) => setBoletaNumero(e.target.value)}
                  placeholder="Ej: B001-00000001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boletaDni">DNI *</Label>
                <Input
                  id="boletaDni"
                  value={boletaDni}
                  onChange={(e) => setBoletaDni(e.target.value)}
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="boletaNombre">Nombre *</Label>
                <Input
                  id="boletaNombre"
                  value={boletaNombre}
                  onChange={(e) => setBoletaNombre(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>S/. {(payment.monto_pagado / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IGV (18%):</span>
                <span>S/. {(payment.monto_pagado - payment.monto_pagado / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>S/. {payment.monto_pagado.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="Factura" className="space-y-4 mt-4">
            <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3">
              <p className="text-sm">
                <strong>Factura Electrónica</strong> - Registre los datos de la factura ya emitida.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="facturaNumero">Nro. de Factura *</Label>
                <Input
                  id="facturaNumero"
                  value={facturaNumero}
                  onChange={(e) => setFacturaNumero(e.target.value)}
                  placeholder="Ej: F001-00000001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facturaRuc">RUC *</Label>
                <Input
                  id="facturaRuc"
                  value={facturaRuc}
                  onChange={(e) => setFacturaRuc(e.target.value)}
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facturaRazonSocial">Razón Social *</Label>
                <Input
                  id="facturaRazonSocial"
                  value={facturaRazonSocial}
                  onChange={(e) => setFacturaRazonSocial(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>S/. {(payment.monto_pagado / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IGV (18%):</span>
                <span>S/. {(payment.monto_pagado - payment.monto_pagado / 1.18).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>S/. {payment.monto_pagado.toFixed(2)}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleEmitir} disabled={isEmitting}>
            {isEmitting ? 'Emitiendo...' : 'Emitir Comprobante'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
