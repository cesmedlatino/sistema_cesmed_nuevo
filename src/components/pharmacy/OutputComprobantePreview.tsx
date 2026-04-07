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
interface MedicationItem {
  codigo: string;
  descripcion: string;
  quantity: number;
  sale_cost_per_unit: number;
  total: number;
  comments?: string;
}

interface OutputComprobantePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroComprobante: string;
  fecha: string;
  tipoSalida: string;
  paciente?: { first_name: string; last_name: string; dni: string; patient_code: string } | null;
  proveedor?: { name: string } | null;
  medications: MedicationItem[];
  total: number;
  config?: any;
}

export function OutputComprobantePreview({
  open,
  onOpenChange,
  numeroComprobante,
  fecha,
  tipoSalida,
  paciente,
  proveedor,
  medications,
  total,
  config
}: OutputComprobantePreviewProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [numCopies, setNumCopies] = useState<number>(2);
  const [userAbbr, setUserAbbr] = useState<string>("");

  // Obtener información del usuario actual
  useEffect(() => {
    const fetchUserInfo = async () => {
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
      fetchUserInfo();
    }
  }, [open]);

  const handlePrint = async () => {
    if (!printRef.current || !config) return;

    // Validar dimensiones del papel
    const paperWidth = Number(config.paper_width) || 80;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;

    // Obtener el HTML del contenido
    const printContent = printRef.current.innerHTML;

    // Mostrar mensaje con la impresora configurada
    if (config.default_printer) {
      toast({
        title: 'Imprimiendo...',
        description: `Enviando ${numCopies} ${numCopies === 1 ? 'copia' : 'copias'} a: ${config.default_printer}`,
      });
    }

    // Imprimir cada copia en una ventana separada
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
                font-family: ${config.font_family || 'Arial'};
                font-size: ${config.font_size || 8}px;
                line-height: ${config.line_height || '1.4'};
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
              .grid-cols-12 { grid-template-columns: repeat(12, 1fr); }
              .col-span-2 { grid-column: span 2; }
              .col-span-3 { grid-column: span 3; }
              .col-span-5 { grid-column: span 5; }
              .gap-1 { gap: 4px; }
              .text-gray-600 { color: #666; }
              .pl-4 { padding-left: 16px; }
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

      // Esperar antes de abrir la siguiente ventana
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
            <span>Vista Previa - Comprobante de Salida</span>
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
                minHeight: config ? `${config.paper_height}mm` : '297mm',
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
                <div className="font-bold">COMPROBANTE DE SALIDA DE FARMACIA</div>
                <div className="font-bold">N° {numeroComprobante}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Info */}
              <div className="space-y-0">
                <div>Fecha: {formatLocalDate(fecha)} {getCurrentLocalTime()} {userAbbr}</div>
                <div>Tipo: {tipoSalida}</div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Patient/Supplier Info */}
              {paciente && (
                <div className="space-y-0">
                  <div>Paciente: {paciente.first_name} {paciente.last_name}</div>
                  <div>DNI: {paciente.dni}</div>
                  <div>Código: {paciente.patient_code}</div>
                </div>
              )}
              
              {proveedor && (
                <div className="space-y-0">
                  <div>Proveedor: {proveedor.name}</div>
                </div>
              )}

              {/* Separator */}
              <div>-----------------------------------------------</div>

              {/* Items Header */}
              <div className="grid grid-cols-12 gap-1 font-bold text-xs">
                <span className="col-span-2">CÓD</span>
                <span className="col-span-5">DESCRIPCIÓN</span>
                <span className="col-span-2 text-right">CANT</span>
                <span className="col-span-3 text-right">TOTAL</span>
              </div>
              <div>-----------------------------------------------</div>

              {/* Items */}
              {medications.map((item, index) => (
                <div key={index} className="space-y-0">
                  <div className="grid grid-cols-12 gap-1 text-xs">
                    <span className="col-span-2">{item.codigo}</span>
                    <span className="col-span-5">{item.descripcion}</span>
                    <span className="col-span-2 text-right">{item.quantity}</span>
                    <span className="col-span-3 text-right">S/. {item.total.toFixed(2)}</span>
                  </div>
                  {item.comments && (
                    <div className="text-xs text-gray-600 pl-4">
                      Obs: {item.comments}
                    </div>
                  )}
                </div>
              ))}

              <div>-----------------------------------------------</div>

              {/* Total */}
              <div className="flex justify-between font-bold">
                <span>TOTAL S/.</span>
                <span>{total.toFixed(2)}</span>
              </div>

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
