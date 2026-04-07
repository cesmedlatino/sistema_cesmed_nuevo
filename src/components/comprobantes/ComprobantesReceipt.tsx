import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Printer, 
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
}

interface PatientAccount {
  cuenta_id: string;
  patient: Patient;
  fecha_cuenta: string;
  estado: string;
  pagos: {
    id: string;
    pago_id: string;
    concepto: string;
    monto: number;
    monto_pagado: number;
    modalidad: string;
    fecha_pago: string;
  }[];
  monto_total: number;
  monto_adelantado: number;
  saldo_pendiente: number;
  comprobante_emitido: boolean;
  fecha_emision?: string;
  numero_comprobante?: string;
}

interface ComprobantesReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  account: PatientAccount;
  onComprobanteEmitido: (numeroComprobante: string) => void;
}

export function ComprobantesReceipt({
  isOpen,
  onClose,
  account,
  onComprobanteEmitido
}: ComprobantesReceiptProps) {
  const [emitting, setEmitting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [numCopies, setNumCopies] = useState(3);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Cargar la configuración de comprobantes
  React.useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('comprobante_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setConfig(data);
      }
    };
    loadConfig();
  }, []);

  // Generar número de comprobante de vista previa
  const numeroComprobantePreview = config 
    ? `${config.correlative_prefix}-${String(config.correlative_current + 1).padStart(config.correlative_zeros, '0')}`
    : 'COMP-000001';

  const handleEmitirComprobante = async () => {
    setEmitting(true);
    try {
      // Usar fecha local en lugar de UTC para evitar problemas de zona horaria
      const today = new Date();
      const fechaEmision = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Create documento de pago - El número se generará automáticamente con el trigger
      // Incluimos los nuevos campos tipo_documento y estado_documento
      const { data: docData, error: docError } = await supabase
        .from('documento_de_pago')
        .insert({
          patient_id: account.patient.id,
          importe_total: account.monto_adelantado,
          fecha_emision: fechaEmision,
          estado: 'emitido',
          tipo_documento: 'Nota de Venta',
          estado_documento: account.estado || 'Pendiente',
          observaciones: `Comprobante para cuenta ${account.cuenta_id} con pagos: ${account.pagos.map(p => p.pago_id).join(', ')}`
        } as any)
        .select('numero_documento, id')
        .single();

      if (docError) throw docError;

      const numeroComprobanteGenerado = docData?.numero_documento;
      const documentoId = docData?.id;

      // Actualizar todos los pagos de la cuenta con referencia al documento
      const pagoIds = account.pagos.map(p => p.id);
      const { error: pagoError } = await supabase
        .from('pagos')
        .update({
          documento_pago_id: documentoId
        } as any)
        .in('id', pagoIds);

      if (pagoError) throw pagoError;

      onComprobanteEmitido(numeroComprobanteGenerado || '');
    } catch (error) {
      console.error('Error al emitir comprobante:', error);
      toast({
        title: 'Error',
        description: 'Error al emitir el comprobante. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setEmitting(false);
    }
  };

  const handlePrint = async () => {
    if (!config) return;

    const paperWidth = Number(config.paper_width) || 80;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;
    const fontSize = Number(config.font_size) || 10;
    const fontFamily = config.font_family || 'Courier New, monospace';
    const lineHeight = config.line_height || '1.3';

    toast({
      title: 'Imprimiendo...',
      description: `Enviando ${numCopies} copia(s)${config.default_printer ? ` a: ${config.default_printer}` : ''}`,
    });

    // Generate HTML content for thermal receipt
    const generateReceiptHTML = () => {
      const modalidades = [...new Set(account.pagos.map(p => p.modalidad))].join(', ');
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('es-PE');
      const formattedTime = currentDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      const itemsHTML = account.pagos.map(pago => `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>01</span>
          <span style="flex: 1; padding: 0 8px; text-align: left;">${pago.concepto}</span>
          <span style="text-align: right;">${pago.monto.toFixed(2)}</span>
        </div>
        <div style="font-size: ${fontSize - 1}px; color: #666; padding-left: 20px;">
          Pago: ${pago.pago_id} - ${pago.modalidad}
        </div>
      `).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Nota de Venta - ${account.numero_comprobante || numeroComprobantePreview}</title>
          <style>
            @page { 
              size: ${paperWidth}mm auto; 
              margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; 
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: ${fontFamily}; 
              font-size: ${fontSize}px; 
              line-height: ${lineHeight};
              width: ${paperWidth}mm;
              max-width: ${paperWidth}mm;
              padding: 2mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .separator { 
              border-top: 1px dashed #000; 
              margin: 4px 0; 
            }
            .row { 
              display: flex; 
              justify-content: space-between; 
              margin: 2px 0; 
            }
            .header-title { font-size: ${fontSize + 4}px; font-weight: bold; margin-bottom: 2px; }
            .header-subtitle { font-size: ${fontSize + 2}px; font-weight: bold; }
            .small { font-size: ${fontSize - 1}px; }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="center">
            <div class="header-title">${config.company_name_line1 || 'Centro de Especialidades Médicas'}</div>
            <div class="header-subtitle">${config.company_name_line2 || 'Latinoamericano'}</div>
          </div>

          <!-- Company Info -->
          <div class="center small" style="margin-top: 4px;">
            <div>${config.company_legal_name || 'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L'}</div>
            <div>RUC: ${config.ruc || '20607644315'}</div>
            <div>${config.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa Pornogoche'}</div>
            <div>${config.address_line2 || 'Paucarpata - Arequipa - Perú'}</div>
            <div>Tel: ${config.phone || '054-407301'} WhatsApp: ${config.whatsapp || '950293377'}</div>
          </div>

          <div class="separator"></div>

          <!-- Document Title -->
          <div class="center bold">
            <div>${config.document_title || 'NOTA DE VENTA'}</div>
            <div>N° ${account.numero_comprobante || numeroComprobantePreview}</div>
          </div>

          <div class="separator"></div>

          <!-- Date/Time -->
          <div>
            <div>Fecha: ${formattedDate} Hora: ${formattedTime}</div>
            <div>Cajero(a): Usuario</div>
          </div>

          <div class="separator"></div>

          <!-- Patient Info -->
          <div>
            <div>Paciente: ${account.patient.first_name} ${account.patient.last_name}</div>
            <div>DNI: ${account.patient.dni}</div>
            <div>Código HC: ${account.patient.patient_code}</div>
          </div>

          <div class="separator"></div>

          <!-- Items Header -->
          <div class="row bold">
            <span>CANT.</span>
            <span style="flex: 1; text-align: center;">DESCRIPCIÓN</span>
            <span>IMPORTE</span>
          </div>

          <div class="separator"></div>

          <!-- Items -->
          ${itemsHTML}

          <div class="separator"></div>

          <!-- Totals -->
          <div class="row">
            <span>SUBTOTAL</span>
            <span>${account.monto_total.toFixed(2)}</span>
          </div>
          <div class="row bold">
            <span>TOTAL ${config.currency_symbol || 'S/.'}</span>
            <span>${account.monto_total.toFixed(2)}</span>
          </div>

          <div class="separator"></div>

          <!-- Account Info -->
          <div>
            <div>Cuenta: ${account.cuenta_id}</div>
            <div>Adelanto de Confirmación:</div>
            <div>Formas de Pago: ${modalidades}</div>
          </div>

          <div class="separator"></div>

          <!-- Payment Breakdown -->
          <div class="row">
            <span>+ Adelanto</span>
            <span>${account.monto_adelantado.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>- Saldo</span>
            <span>${account.saldo_pendiente.toFixed(2)}</span>
          </div>

          <div class="separator"></div>

          <!-- Turno -->
          <div>Turno: ${formattedDate} ${formattedTime}</div>

          <div class="separator"></div>

          <!-- Footer -->
          <div class="center small" style="margin-top: 4px;">
            <div>${config.footer_line1 || '¡Gracias por su preferencia!'}</div>
            <div>${config.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
            <div>${config.footer_line3 || 'www.cesmedlatinoamericano.com'}</div>
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

    // Print multiple copies with delay for paper cutter
    const printCopy = (_copyIndex: number) => {
      return new Promise<void>((resolve) => {
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

        // Wait for this copy to finish before next
        setTimeout(() => resolve(), 1500);
      });
    };

    // Print copies sequentially with delay
    for (let i = 0; i < numCopies; i++) {
      await printCopy(i);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vista Previa del Comprobante</DialogTitle>
          </DialogHeader>
          
          <div 
            ref={printRef}
            className="mx-auto space-y-2 bg-white border rounded-lg shadow-lg"
            style={{
              width: config ? `${config.paper_width}mm` : '80mm',
              minHeight: config ? `${config.paper_height}mm` : '297mm',
              padding: config ? `${config.margin_top}mm ${config.margin_right}mm ${config.margin_bottom}mm ${config.margin_left}mm` : '2mm',
              fontSize: config ? `${config.font_size}px` : '8px',
              lineHeight: config?.line_height || '1.2',
              fontFamily: config?.font_family || 'Arial',
            }}
          >
            {/* Header Logo and Name */}
            <div className="text-center space-y-1">
              <div className="text-lg font-bold">{config?.company_name_line1 || 'Centro de Especialidades Médicas'}</div>
              <div className="text-base font-bold">{config?.company_name_line2 || 'Latinoamericano'}</div>
            </div>

            {/* Company Info */}
            <div className="text-center space-y-0 text-xs">
              <div>{config?.company_legal_name || 'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L'}</div>
              <div className="mt-1">RUC: {config?.ruc || '20607644315'}</div>
              <div>{config?.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa Pornogoche'}</div>
              <div>{config?.address_line2 || 'Paucarpata - Arequipa - Perú'}</div>
              <div>Tel: {config?.phone || '054-407301'}    WhatsApp: {config?.whatsapp || '950293377'}</div>
            </div>

            {/* Separator */}
            <div className="text-center">
              <div>-----------------------------------------------</div>
              <div className="font-bold">{config?.document_title || 'NOTA DE VENTA'}</div>
              <div className="font-bold">N° {account.numero_comprobante || numeroComprobantePreview}</div>
              <div>-----------------------------------------------</div>
            </div>

            {/* Date and Cashier */}
            <div className="space-y-0">
              <div>Fecha: {new Date().toLocaleDateString('es-PE')}    Hora: {new Date().toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'})}</div>
              <div>Cajero(a): Usuario</div>
              <div>-----------------------------------------------</div>
            </div>

            {/* Patient Info */}
            <div className="space-y-0">
              <div>Paciente: {account.patient.first_name} {account.patient.last_name}</div>
              <div>DNI: {account.patient.dni}</div>
              <div>Código HC: {account.patient.patient_code}</div>
            </div>

            {/* Separator */}
            <div>-----------------------------------------------</div>

            {/* Services Table Header */}
            <div className="flex justify-between font-bold">
              <span>CANT.</span>
              <span>DESCRIPCIÓN</span>
              <span>IMPORTE</span>
            </div>
            <div>-----------------------------------------------</div>

            {/* Services/Payments */}
            {account.pagos.map((pago, index) => (
              <div key={index}>
                <div className="flex justify-between">
                  <span>01</span>
                  <span className="flex-1 px-2">{pago.concepto}</span>
                  <span>{pago.monto.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-600 pl-6">
                  Pago: {pago.pago_id} - {pago.modalidad}
                </div>
              </div>
            ))}

            <div>-----------------------------------------------</div>

            {/* Totals */}
            <div className="space-y-0">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{account.monto_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>TOTAL {config?.currency_symbol || 'S/.'}</span>
                <span>{account.monto_total.toFixed(2)}</span>
              </div>
            </div>

            <div>-----------------------------------------------</div>

            {/* Payment Info */}
            <div className="space-y-0">
              <div>Cuenta: {account.cuenta_id}</div>
              <div>Adelanto de Confirmación:</div>
              <div>Formas de Pago: {[...new Set(account.pagos.map(p => p.modalidad))].join(', ')}</div>
            </div>

            <div>-----------------------------------------------</div>

            {/* Payment Breakdown */}
            <div className="space-y-0">
              <div className="flex justify-between">
                <span>+ Adelanto</span>
                <span>{account.monto_adelantado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- Saldo</span>
                <span>{account.saldo_pendiente.toFixed(2)}</span>
              </div>
            </div>

            <div>-----------------------------------------------</div>

            {/* Appointment Info */}
            <div>Turno: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'})}</div>

            <div>-----------------------------------------------</div>

            {/* Footer */}
            <div className="text-center space-y-1">
              <div>{config?.footer_line1 || '¡Gracias por su preferencia!'}</div>
              <div>{config?.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
              <div>{config?.footer_line3 || 'www.cesmedlatinoamericano.com'}</div>
            </div>
          </div>
          {/* Botones de acción */}
          <div className="flex items-center gap-4 justify-between print:hidden mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="numCopies" className="text-sm whitespace-nowrap">Nro de copias:</Label>
              <Input
                id="numCopies"
                type="number"
                min={1}
                max={10}
                value={numCopies}
                onChange={(e) => setNumCopies(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-16 h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button
                onClick={handleEmitirComprobante}
                disabled={emitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {emitting ? 'Emitiendo...' : 'Emitir Comprobante'}
              </Button>
            </div>
          </div>
        </DialogContent>
    </Dialog>
  );
}