import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Helper para formatear fecha local sin problemas de zona horaria
const formatLocalDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
};

// Helper para obtener la hora actual local
const getCurrentLocalTime = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
};

// Helper para crear abreviatura del usuario (3 letras nombre + 3 letras apellido)
const getUserAbbreviation = (nombres: string, apellidos: string) => {
  const firstPart = (nombres || "").substring(0, 3).toUpperCase();
  const lastPart = (apellidos || "").substring(0, 3).toUpperCase();
  return firstPart + lastPart;
};

interface PaymentReceiptPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroComprobante: string;
  tipoComprobante: string;
  fecha: string;
  paciente: { nombre: string; dni?: string } | null;
  concepto: string;
  modalidad: string;
  importe: number;
  adelanto?: number;
  saldo?: number;
}

export function PaymentReceiptPreview({
  open,
  onOpenChange,
  numeroComprobante,
  tipoComprobante,
  fecha,
  paciente,
  concepto,
  modalidad,
  importe,
  adelanto,
  saldo
}: PaymentReceiptPreviewProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [numCopies, setNumCopies] = useState<number>(2);
  const [userAbbr, setUserAbbr] = useState<string>("");
  const [config, setConfig] = useState<any>(null);

  // Obtener configuración del comprobante y usuario actual
  useEffect(() => {
    const fetchData = async () => {
      // Obtener configuración
      const { data: configData } = await supabase
        .from("comprobante_config")
        .select("*")
        .limit(1)
        .single();
      
      if (configData) {
        setConfig(configData);
      }

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuarioData } = await supabase
        .from("usuario")
        .select("personal:personal_id(nombres, apellidos)")
        .eq("auth_user_id", user.id)
        .single();

      if (usuarioData?.personal) {
        const personal = usuarioData.personal as { nombres: string; apellidos: string };
        setUserAbbr(getUserAbbreviation(personal.nombres, personal.apellidos));
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handlePrint = async () => {
    if (!printRef.current) return;

    const paperWidth = Number(config?.paper_width) || 80;
    const marginTop = Number(config?.margin_top) || 2;
    const marginRight = Number(config?.margin_right) || 2;
    const marginBottom = Number(config?.margin_bottom) || 2;
    const marginLeft = Number(config?.margin_left) || 2;

    const printContent = printRef.current.innerHTML;

    if (config?.default_printer) {
      toast({
        title: 'Imprimiendo...',
        description: `Enviando ${numCopies} ${numCopies === 1 ? 'copia' : 'copias'} a: ${config.default_printer}`,
      });
    }

    for (let i = 0; i < numCopies; i++) {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de impresión. Verifique el bloqueador de popups.',
          variant: 'destructive',
        });
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Comprobante - ${numeroComprobante}</title>
            <style>
              @page {
                size: ${paperWidth}mm auto;
                margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
              }
              
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body {
                margin: 0;
                padding: 0;
                font-family: ${config?.font_family || 'Arial'};
                font-size: ${config?.font_size || 8}px;
                line-height: ${config?.line_height || '1.4'};
              }
              
              .receipt {
                width: ${paperWidth}mm;
                max-width: ${paperWidth}mm;
                padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
              }
              
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-lg { font-size: 1.2em; }
              .text-base { font-size: 1em; }
              .text-xs { font-size: 0.85em; }
              .font-bold { font-weight: bold; }
              .space-y-1 > * + * { margin-top: 4px; }
              .space-y-2 > * + * { margin-top: 8px; }
              .space-y-0 > * + * { margin-top: 0; }
              
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
              .gap-1 { gap: 4px; }
              .text-gray-600 { color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt space-y-2">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 100);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      if (i < numCopies - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  const companyName = config?.company_name_line1 || 'Centro de Especialidades Médicas';
  const companyName2 = config?.company_name_line2 || 'Latinoamericano';
  const ruc = config?.ruc || '20607644315';
  const address1 = config?.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa';
  const address2 = config?.address_line2 || 'Pornogocha';
  const address3 = config?.address_line3 || 'Paucarpata - Arequipa - Perú';
  const phone = config?.phone || '054-407301';
  const whatsapp = config?.whatsapp || '950293377';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - Comprobante de Pago</span>
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
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardContent className="p-6">
            <div 
              ref={printRef}
              className="mx-auto space-y-2 bg-white border rounded-lg shadow-lg"
              style={{
                width: config ? `${config.paper_width}mm` : '80mm',
                minHeight: '200mm',
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
              <div className="text-center space-y-0 text-xs">
                <div>RUC: {ruc}</div>
                <div>{address1}</div>
                <div>{address2}</div>
                <div>{address3}</div>
                <div>Tel: {phone} WhatsApp: {whatsapp}</div>
              </div>

              {/* Separator */}
              <div className="text-center">
                <div>-----------------------------------------------</div>
                <div className="font-bold">{tipoComprobante?.toUpperCase() || 'NOTA DE VENTA'}</div>
                <div className="font-bold">N° {numeroComprobante}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Info */}
              <div className="space-y-0">
                <div>Fecha: {formatLocalDate(fecha)} {getCurrentLocalTime()} {userAbbr}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Patient Info */}
              {paciente && (
                <div className="space-y-0">
                  <div>Paciente: {paciente.nombre}</div>
                  {paciente.dni && <div>DNI: {paciente.dni}</div>}
                </div>
              )}

              {/* Separator */}
              <div>-----------------------------------------------</div>

              {/* Items Header */}
              <div className="grid grid-cols-2 gap-1 font-bold text-xs">
                <span>CONCEPTO</span>
                <span className="text-right">IMPORTE</span>
              </div>
              <div>-----------------------------------------------</div>

              {/* Item */}
              <div className="space-y-0">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span>{concepto}</span>
                  <span className="text-right">S/. {importe.toFixed(2)}</span>
                </div>
                {modalidad && (
                  <div className="text-xs text-gray-600">
                    Modalidad: {modalidad}
                  </div>
                )}
              </div>

              <div>-----------------------------------------------</div>

              {/* Total */}
              <div className="flex justify-between font-bold">
                <span>TOTAL S/.</span>
                <span>{importe.toFixed(2)}</span>
              </div>

              {/* Adelanto y Saldo */}
              {(adelanto !== undefined && adelanto > 0) && (
                <div className="flex justify-between text-xs">
                  <span>ADELANTO S/.</span>
                  <span>{adelanto.toFixed(2)}</span>
                </div>
              )}
              {(saldo !== undefined && saldo > 0) && (
                <div className="flex justify-between text-xs">
                  <span>SALDO PEND. S/.</span>
                  <span>{saldo.toFixed(2)}</span>
                </div>
              )}

              <div>-----------------------------------------------</div>

              {/* Footer */}
              <div className="text-center text-xs">
                <div>{config?.footer_line1 || '¡Gracias por su preferencia!'}</div>
                <div>{config?.footer_line2 || 'Síguenos en redes sociales @cesmed.pe'}</div>
                <div>{config?.footer_line3 || 'www.cesmedlatinoamericano.com'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
