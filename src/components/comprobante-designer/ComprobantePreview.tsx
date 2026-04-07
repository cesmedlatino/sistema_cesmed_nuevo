import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComprobanteConfig } from './ComprobanteDesigner';
import { Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComprobantePreviewProps {
  config: ComprobanteConfig;
}

// Datos de ejemplo para la vista previa
const SAMPLE_DATA = {
  numeroComprobante: '202511-123456',
  fecha: new Date().toLocaleDateString('es-PE'),
  hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  cajero: 'Usuario Demo',
  paciente: {
    nombre: 'Juan Pérez García',
    dni: '12345678',
    codigo: 'PAC-001',
  },
  pagos: [
    {
      concepto: 'Consulta Oftalmológica',
      pagoId: 'PAG-001',
      modalidad: 'Efectivo',
      monto: 80.00,
    },
    {
      concepto: 'Examen de Vista',
      pagoId: 'PAG-002',
      modalidad: 'Tarjeta',
      monto: 50.00,
    },
  ],
  montoTotal: 130.00,
  adelanto: 130.00,
  saldo: 0.00,
  cuentaId: 'CTA-001',
};

export function ComprobantePreview({ config }: ComprobantePreviewProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const subtotal = SAMPLE_DATA.montoTotal;
  const igv = config.show_igv ? (subtotal * config.igv_rate) / 100 : 0;
  const total = subtotal + igv;

  // Generar número de comprobante con el correlativo configurado
  const numeroComprobante = `${config.correlative_prefix}-${String(config.correlative_current + 1).padStart(config.correlative_zeros, '0')}`;

  const handlePrint = () => {
    if (!printRef.current) return;

    // Validar dimensiones del papel
    const paperWidth = Number(config.paper_width) || 80;
    const paperHeight = Number(config.paper_height) || 297;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;

    console.log('Configuración de impresión:', {
      paperWidth,
      paperHeight,
      margins: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
      font: config.font_family,
      fontSize: config.font_size
    });

    // Crear estilos para la impresión
    const printStyles = `
      @page {
        size: ${paperWidth}mm ${paperHeight}mm portrait;
        margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
      }
      
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body * {
          visibility: hidden;
        }
        
        #printable-comprobante,
        #printable-comprobante * {
          visibility: visible;
        }
        
        #printable-comprobante {
          position: absolute;
          left: 0;
          top: 0;
          width: ${paperWidth}mm;
          max-width: ${paperWidth}mm;
          font-family: ${config.font_family};
          font-size: ${config.font_size}px;
          line-height: ${config.line_height};
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
      }
    `;

    // Crear un elemento style temporal
    const styleSheet = document.createElement('style');
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);

    // Clonar el contenido para imprimir
    const printableContent = printRef.current.cloneNode(true) as HTMLElement;
    printableContent.id = 'printable-comprobante';
    printableContent.style.cssText = `
      width: ${paperWidth}mm;
      max-width: ${paperWidth}mm;
      font-family: ${config.font_family};
      font-size: ${config.font_size}px;
      line-height: ${config.line_height};
      box-sizing: border-box;
    `;

    // Agregar al body temporalmente
    document.body.appendChild(printableContent);

    // Mostrar mensaje con la impresora configurada
    if (config.default_printer) {
      toast({
        title: 'Imprimiendo...',
        description: `Enviando a: ${config.default_printer}`,
      });
    }

    // Imprimir
    window.print();

    // Limpiar después de imprimir
    setTimeout(() => {
      document.body.removeChild(printableContent);
      document.head.removeChild(styleSheet);
    }, 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vista Previa del Comprobante</CardTitle>
          <Button onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Prueba
          </Button>
        </div>
        {config.default_printer && (
          <p className="text-sm text-muted-foreground mt-2">
            Impresora: {config.default_printer} | Papel: {config.paper_width}mm × {config.paper_height}mm
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div 
          ref={printRef}
          className="mx-auto space-y-2 bg-white border rounded-lg shadow-lg"
          style={{
            width: `${config.paper_width}mm`,
            minHeight: `${config.paper_height}mm`,
            padding: `${config.margin_top}mm ${config.margin_right}mm ${config.margin_bottom}mm ${config.margin_left}mm`,
            fontSize: `${config.font_size}px`,
            lineHeight: config.line_height,
            fontFamily: config.font_family,
          }}
        >
          {/* Header Logo and Name */}
          <div className="text-center space-y-1">
            <div className="text-lg font-bold">{config.company_name_line1}</div>
            <div className="text-base font-bold">{config.company_name_line2}</div>
          </div>

          {/* Company Info */}
          <div className="text-center space-y-0 text-xs">
            <div>{config.company_legal_name}</div>
            <div className="mt-1">RUC: {config.ruc}</div>
            <div>{config.address_line1}</div>
            <div>{config.address_line2}</div>
            <div>{config.address_line3}</div>
            <div>Tel: {config.phone}    WhatsApp: {config.whatsapp}</div>
          </div>

          {/* Separator */}
          <div className="text-center">
            <div>-----------------------------------------------</div>
            <div className="font-bold">{config.document_title}</div>
            <div className="font-bold">N° {numeroComprobante}</div>
            <div>-----------------------------------------------</div>
          </div>

          {/* Date and Cashier */}
          <div className="space-y-0">
            <div>Fecha: {SAMPLE_DATA.fecha}    Hora: {SAMPLE_DATA.hora}</div>
            <div>Cajero(a): {SAMPLE_DATA.cajero}</div>
            <div>-----------------------------------------------</div>
          </div>

          {/* Patient Info */}
          <div className="space-y-0">
            <div>Paciente: {SAMPLE_DATA.paciente.nombre}</div>
            <div>DNI: {SAMPLE_DATA.paciente.dni}</div>
            <div>Código HC: {SAMPLE_DATA.paciente.codigo}</div>
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
          {SAMPLE_DATA.pagos.map((pago, index) => (
            <div key={index}>
              <div className="flex justify-between">
                <span>01</span>
                <span className="flex-1 px-2">{pago.concepto}</span>
                <span>{pago.monto.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600 pl-6">
                Pago: {pago.pagoId} - {pago.modalidad}
              </div>
            </div>
          ))}

          <div>-----------------------------------------------</div>

          {/* Totals */}
          <div className="space-y-0">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            {config.show_igv && (
              <div className="flex justify-between">
                <span>IGV ({config.igv_rate}%)</span>
                <span>{igv.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>TOTAL {config.currency_symbol}</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          <div>-----------------------------------------------</div>

          {/* Payment Info */}
          <div className="space-y-0">
            <div>Cuenta: {SAMPLE_DATA.cuentaId}</div>
            <div>Adelanto de Confirmación:</div>
            <div>Formas de Pago: {[...new Set(SAMPLE_DATA.pagos.map(p => p.modalidad))].join(', ')}</div>
          </div>

          <div>-----------------------------------------------</div>

          {/* Payment Breakdown */}
          <div className="space-y-0">
            <div className="flex justify-between">
              <span>+ Adelanto</span>
              <span>{SAMPLE_DATA.adelanto.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Saldo</span>
              <span>{SAMPLE_DATA.saldo.toFixed(2)}</span>
            </div>
          </div>

          <div>-----------------------------------------------</div>

          {/* Appointment Info */}
          <div>Turno: {SAMPLE_DATA.fecha} {SAMPLE_DATA.hora}</div>

          <div>-----------------------------------------------</div>

          {/* Footer */}
          <div className="text-center space-y-1">
            <div>{config.footer_line1}</div>
            <div>{config.footer_line2}</div>
            <div>{config.footer_line3}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
