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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Printer, FileText, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface EmitirDocumentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  onDocumentoEmitido: (numero: string, tipo: string) => void;
}

export function EmitirDocumentoDialog({ 
  open, 
  onOpenChange, 
  payment, 
  onDocumentoEmitido 
}: EmitirDocumentoDialogProps) {
  const [tipoDocumento, setTipoDocumento] = useState('Nota de Venta');
  const [isEmitting, setIsEmitting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Campos para Boleta
  const [boletaNumero, setBoletaNumero] = useState('');
  const [boletaDni, setBoletaDni] = useState('');
  const [boletaNombre, setBoletaNombre] = useState('');
  const [boletaDireccion, setBoletaDireccion] = useState('');
  const [boletaEmail, setBoletaEmail] = useState('');
  const [boletaTelefono, setBoletaTelefono] = useState('');

  // Campos para Factura
  const [facturaNumero, setFacturaNumero] = useState('');
  const [facturaRuc, setFacturaRuc] = useState('');
  const [facturaRazonSocial, setFacturaRazonSocial] = useState('');
  const [facturaDireccion, setFacturaDireccion] = useState('');
  const [facturaEmail, setFacturaEmail] = useState('');
  const [facturaTelefono, setFacturaTelefono] = useState('');
  const [facturaFormaPago, setFacturaFormaPago] = useState('Contado');
  const [facturaCondicionPago, setFacturaCondicionPago] = useState('');
  const [facturaFechaVencimiento, setFacturaFechaVencimiento] = useState('');
  

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

  // Cargar datos del paciente y pre-llenar formularios
  useEffect(() => {
    const loadPatientData = async () => {
      if (payment?.patient_id && open) {
        const { data: patient } = await supabase
          .from('patients')
          .select('*')
          .eq('id', payment.patient_id)
          .single();
        
        if (patient) {
          const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
          
          // Pre-llenar campos de Boleta
          setBoletaDni(patient.dni || '');
          setBoletaNombre(fullName);
          setBoletaDireccion(patient.address || '');
          setBoletaEmail(patient.email || '');
          setBoletaTelefono(patient.phone || '');
          
          // Pre-llenar campos de Factura
          setFacturaRazonSocial(fullName);
          setFacturaDireccion(patient.address || '');
          setFacturaEmail(patient.email || '');
          setFacturaTelefono(patient.phone || '');
        }
      }
    };
    
    if (open) {
      loadPatientData();
      // Reset invoice numbers when dialog opens
      setBoletaNumero('');
      setFacturaNumero('');
    }
  }, [payment?.patient_id, open]);

  const calcularIGV = (monto: number) => {
    const igvRate = 0.18;
    const subtotal = monto / (1 + igvRate);
    const igv = monto - subtotal;
    return { subtotal, igv };
  };

  const handleEmitir = async () => {
    if (!payment) return;
    setIsEmitting(true);

    try {
      const today = new Date();
      const fechaEmision = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      let documentData: any = {
        patient_id: payment.patient_id,
        importe_total: payment.monto_pagado,
        fecha_emision: fechaEmision,
        estado: 'emitido',
        tipo_documento: tipoDocumento,
        estado_documento: payment.estado_pago || 'Pendiente',
        observaciones: `Comprobante para pago ${payment.pago_id}`,
        forma_pago: 'Contado',
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
          cliente_email: boletaEmail,
          cliente_telefono: boletaTelefono,
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
          cliente_email: facturaEmail,
          cliente_telefono: facturaTelefono,
          serie: 'F001',
          subtotal,
          igv,
          forma_pago: facturaFormaPago,
          condicion_pago: facturaCondicionPago || null,
          fecha_vencimiento: facturaFechaVencimiento || null,
        };
      }

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
        title: 'Documento emitido',
        description: `${tipoDocumento} ${docData.numero_documento} emitida correctamente`,
      });

      queryClient.invalidateQueries({ queryKey: ['payments'] });
      onDocumentoEmitido(docData.numero_documento, tipoDocumento);

      if (tipoDocumento === 'Nota de Venta') {
        setShowPreview(true);
      } else {
        onOpenChange(false);
      }
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

  const handlePrint = () => {
    if (!printRef.current || !config) return;

    const paperWidth = Number(config.paper_width) || 80;
    const paperHeight = Number(config.paper_height) || 297;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = printRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tipoDocumento}</title>
        <style>
          @page {
            size: ${paperWidth}mm ${paperHeight}mm portrait;
            margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
          }
          body {
            font-family: ${config.font_family || 'Arial'};
            font-size: ${config.font_size || 12}px;
            line-height: ${config.line_height || '1.2'};
            margin: 0;
            padding: 0;
          }
          .receipt-content {
            width: ${paperWidth - marginLeft - marginRight}mm;
          }
        </style>
      </head>
      <body>
        <div class="receipt-content">${content}</div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const numeroComprobantePreview = config 
    ? `${config.correlative_prefix}-${String(config.correlative_current + 1).padStart(config.correlative_zeros, '0')}`
    : 'NV-000001';

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Emitir Comprobante
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <Tabs value={tipoDocumento} onValueChange={setTipoDocumento} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Nota de Venta" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Nota de Venta
              </TabsTrigger>
              <TabsTrigger value="Boleta" className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                Boleta
              </TabsTrigger>
              <TabsTrigger value="Factura" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Factura
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Nota de Venta" className="space-y-4 mt-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  La Nota de Venta se generará automáticamente con los datos del pago seleccionado.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Paciente:</span>
                    <p className="font-medium">{payment?.patient_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Importe:</span>
                    <p className="font-medium">S/. {payment?.monto_pagado?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Concepto:</span>
                    <p className="font-medium">{payment?.concept_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p className="font-medium">{payment?.fecha_pago ? formatDate(payment.fecha_pago) : '-'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Boleta" className="space-y-4 mt-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-primary">
                  <strong>Boleta de Venta Electrónica</strong> - Registre los datos de la boleta ya emitida.
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
                  <Label htmlFor="boletaDni">DNI / Documento *</Label>
                  <Input
                    id="boletaDni"
                    value={boletaDni}
                    onChange={(e) => setBoletaDni(e.target.value)}
                    placeholder="Ingrese DNI"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boletaNombre">Nombre Completo *</Label>
                  <Input
                    id="boletaNombre"
                    value={boletaNombre}
                    onChange={(e) => setBoletaNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="boletaDireccion">Dirección</Label>
                  <Input
                    id="boletaDireccion"
                    value={boletaDireccion}
                    onChange={(e) => setBoletaDireccion(e.target.value)}
                    placeholder="Dirección del cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boletaEmail">Email</Label>
                  <Input
                    id="boletaEmail"
                    type="email"
                    value={boletaEmail}
                    onChange={(e) => setBoletaEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boletaTelefono">Teléfono</Label>
                  <Input
                    id="boletaTelefono"
                    value={boletaTelefono}
                    onChange={(e) => setBoletaTelefono(e.target.value)}
                    placeholder="999999999"
                  />
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg mt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>S/. {(payment?.monto_pagado / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGV (18%):</span>
                  <span>S/. {(payment?.monto_pagado - payment?.monto_pagado / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>S/. {payment?.monto_pagado?.toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Factura" className="space-y-4 mt-4">
              <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-secondary-foreground">
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
                    placeholder="20XXXXXXXXX"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facturaRazonSocial">Razón Social *</Label>
                  <Input
                    id="facturaRazonSocial"
                    value={facturaRazonSocial}
                    onChange={(e) => setFacturaRazonSocial(e.target.value)}
                    placeholder="Nombre de la empresa"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="facturaDireccion">Dirección Fiscal *</Label>
                  <Input
                    id="facturaDireccion"
                    value={facturaDireccion}
                    onChange={(e) => setFacturaDireccion(e.target.value)}
                    placeholder="Dirección fiscal de la empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facturaEmail">Email</Label>
                  <Input
                    id="facturaEmail"
                    type="email"
                    value={facturaEmail}
                    onChange={(e) => setFacturaEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facturaTelefono">Teléfono</Label>
                  <Input
                    id="facturaTelefono"
                    value={facturaTelefono}
                    onChange={(e) => setFacturaTelefono(e.target.value)}
                    placeholder="999999999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facturaFormaPago">Forma de Pago</Label>
                  <Select value={facturaFormaPago} onValueChange={setFacturaFormaPago}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Contado">Contado</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {facturaFormaPago === 'Crédito' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="facturaCondicionPago">Condición de Pago</Label>
                      <Input
                        id="facturaCondicionPago"
                        value={facturaCondicionPago}
                        onChange={(e) => setFacturaCondicionPago(e.target.value)}
                        placeholder="Ej: 30 días"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facturaFechaVencimiento">Fecha de Vencimiento</Label>
                      <Input
                        id="facturaFechaVencimiento"
                        type="date"
                        value={facturaFechaVencimiento}
                        onChange={(e) => setFacturaFechaVencimiento(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="bg-muted/30 p-3 rounded-lg mt-4">
                <div className="flex justify-between text-sm">
                  <span>Op. Gravada:</span>
                  <span>S/. {(payment?.monto_pagado / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IGV (18%):</span>
                  <span>S/. {(payment?.monto_pagado - payment?.monto_pagado / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Importe Total:</span>
                  <span>S/. {payment?.monto_pagado?.toFixed(2)}</span>
                </div>
              </div>
            </TabsContent>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEmitir} disabled={isEmitting}>
                <Receipt className="h-4 w-4 mr-2" />
                {isEmitting 
                  ? (tipoDocumento === 'Nota de Venta' ? 'Emitiendo...' : 'Registrando...') 
                  : (tipoDocumento === 'Nota de Venta' 
                      ? 'Emitir Nota de Venta' 
                      : `Registrar ${tipoDocumento}`)}
              </Button>
            </div>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div 
              ref={printRef}
              className="mx-auto space-y-2 bg-white border rounded-lg shadow-lg p-4"
              style={{
                width: config ? `${config.paper_width}mm` : '80mm',
                fontSize: config ? `${config.font_size}px` : '12px',
                lineHeight: config?.line_height || '1.2',
                fontFamily: config?.font_family || 'Arial',
              }}
            >
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="text-lg font-bold">{config?.company_name_line1 || 'Centro de Especialidades Médicas'}</div>
                <div className="text-base font-bold">{config?.company_name_line2 || 'Latinoamericano'}</div>
              </div>

              {/* Company Info */}
              <div className="text-center space-y-0 text-xs">
                <div>{config?.company_legal_name || 'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L'}</div>
                <div className="mt-1">RUC: {config?.ruc || '20607644315'}</div>
                <div>{config?.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa'}</div>
                <div>{config?.address_line2 || 'Pornogocha'}</div>
                <div>{config?.address_line3 || 'Paucarpata - Arequipa - Perú'}</div>
                <div>Tel: {config?.phone || '054-407301'} WhatsApp: {config?.whatsapp || '950293377'}</div>
              </div>

              {/* Separator */}
              <div className="text-center">
                <div>-----------------------------------------------</div>
                <div className="font-bold">{config?.document_title || 'NOTA DE VENTA'}</div>
                <div className="font-bold">N° {numeroComprobantePreview}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Date */}
              <div className="space-y-0">
                <div>Fecha: {new Date().toLocaleDateString('es-PE')} Hora: {new Date().toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'})}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Patient Info */}
              <div className="space-y-0">
                <div>Paciente: {payment?.patient_name}</div>
              </div>

              <div>-----------------------------------------------</div>

              {/* Services */}
              <div className="flex justify-between font-bold">
                <span>CANT.</span>
                <span>DESCRIPCIÓN</span>
                <span>IMPORTE</span>
              </div>
              <div>-----------------------------------------------</div>
              <div className="flex justify-between">
                <span>01</span>
                <span className="flex-1 px-2">{payment?.concept_name}</span>
                <span>{payment?.monto_pagado?.toFixed(2)}</span>
              </div>

              <div>-----------------------------------------------</div>

              {/* Totals */}
              <div className="flex justify-between font-bold">
                <span>TOTAL S/.</span>
                <span>{payment?.monto_pagado?.toFixed(2)}</span>
              </div>

              <div>-----------------------------------------------</div>

              {/* Footer */}
              <div className="text-center space-y-1">
                <div>{config?.footer_line1 || '¡Gracias por su preferencia!'}</div>
                <div>{config?.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
                <div>{config?.footer_line3 || 'www.cesmedlatinoamericano.com'}</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
