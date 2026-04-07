import { useRef, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper para formatear fecha local sin problemas de zona horaria
const formatLocalDate = (dateString: string) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
};

// Helper para extraer la hora de un timestamp
const formatTimeFromTimestamp = (timestamp: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
};

// Helper para crear abreviatura del usuario (3 letras nombre + 3 letras apellido)
const getUserAbbreviation = (nombres: string, apellidos: string) => {
  const firstPart = (nombres || "").substring(0, 3).toUpperCase();
  const lastPart = (apellidos || "").substring(0, 3).toUpperCase();
  return firstPart + lastPart;
};
interface ComprobanteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comprobante: any;
}

export function ComprobanteDetailsDialog({
  open,
  onOpenChange,
  comprobante,
}: ComprobanteDetailsDialogProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<any>(null);
  const [userAbbr, setUserAbbr] = useState<string>("");

  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from("comprobante_config")
        .select("*")
        .single();

      if (error) {
        console.error("Error al cargar configuración:", error);
        return;
      }

      setConfig(data);
    };

    // Obtener información del usuario que creó el comprobante
    const fetchUserInfo = async () => {
      if (!comprobante?.created_by) return;

      const { data: usuarioData } = await supabase
        .from("usuario")
        .select("personal:personal_id(nombres, apellidos)")
        .eq("auth_user_id", comprobante.created_by)
        .single();

      if (usuarioData?.personal) {
        const personal = usuarioData.personal as { nombres: string; apellidos: string };
        setUserAbbr(getUserAbbreviation(personal.nombres, personal.apellidos));
      }
    };

    if (open) {
      fetchConfig();
      fetchUserInfo();
    }
  }, [open, comprobante?.created_by]);

  if (!comprobante) return null;

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "S/. 0.00";
    return `S/. ${amount.toFixed(2)}`;
  };

  const medications = Array.isArray(comprobante.medications)
    ? comprobante.medications
    : [];

  const handlePrint = () => {
    if (!printRef.current || !config) return;

    // Validar dimensiones del papel
    const paperWidth = Number(config.paper_width) || 80;
    const marginTop = Number(config.margin_top) || 2;
    const marginRight = Number(config.margin_right) || 2;
    const marginBottom = Number(config.margin_bottom) || 2;
    const marginLeft = Number(config.margin_left) || 2;

    // Obtener el HTML del contenido
    const printContent = printRef.current.innerHTML;

    // Crear ventana de impresión independiente
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'No se pudo abrir la ventana de impresión. Verifique el bloqueador de popups.',
        variant: 'destructive',
      });
      return;
    }

    // Escribir el HTML completo en la nueva ventana
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante - ${comprobante.nro_comprobante || ''}</title>
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
              page-break-after: always;
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
            .col-span-6 { grid-column: span 6; }
            .gap-1 { gap: 4px; }
            .break-words { word-break: break-word; }
            .italic { font-style: italic; }
            .pl-2 { padding-left: 8px; }
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
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Mostrar mensaje con la impresora configurada
    if (config.default_printer) {
      toast({
        title: 'Imprimiendo...',
        description: `Enviando a: ${config.default_printer}`,
      });
    }
  };

  const companyName = config?.company_name_line1 || "Centro de Especialidades Médicas";
  const companyName2 = config?.company_name_line2 || "Latinoamericano";
  const ruc = config?.ruc || "20607644315";
  const address1 = config?.address_line1 || "Domicilio: Mz. G Lote. 17 Coop. Villa";
  const address2 = config?.address_line2 || "Pornogocha";
  const address3 = config?.address_line3 || "Paucarpata - Arequipa - Perú";
  const phone = config?.phone || "054-407301";
  const whatsapp = config?.whatsapp || "950293377";
  const footerLine1 = config?.footer_line1 || "¡Gracias por su preferencia!";
  const footerLine2 = config?.footer_line2 || "Síguenos en redes sociales @cesmed.pe";
  const footerLine3 = config?.footer_line3 || "www.cesmedlatinoamericano.com";

  const isAnulado = comprobante.comments === "ANULADO";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa - Comprobante de Farmacia</span>
            {!isAnulado && (
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="p-6">
            <div
              ref={printRef}
              className="mx-auto space-y-2 bg-white border rounded-lg shadow-lg"
              style={{
                width: config ? `${config.paper_width}mm` : "80mm",
                minHeight: config ? `${config.paper_height}mm` : "297mm",
                padding: config
                  ? `${config.margin_top}mm ${config.margin_right}mm ${config.margin_bottom}mm ${config.margin_left}mm`
                  : "2mm",
                fontSize: config ? `${config.font_size}px` : "8px",
                lineHeight: config?.line_height || "1.4",
                fontFamily: config?.font_family || "Arial",
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
                <div>
                  Tel: {phone} WhatsApp: {whatsapp}
                </div>
              </div>

              {/* Separator */}
              <div className="text-center">
                <div>-----------------------------------------------</div>
                <div className="font-bold">COMPROBANTE DE SALIDA DE FARMACIA</div>
                <div className="font-bold">
                  N° {comprobante.nro_comprobante || "-"}
                </div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Estado */}
              {isAnulado && (
                <div className="text-center">
                  <div className="font-bold text-base">*** ANULADO ***</div>
                  <div>-----------------------------------------------</div>
                </div>
              )}

              {/* Info */}
              <div className="space-y-0">
                <div>
                  Fecha: {formatLocalDate(comprobante.date)} {formatTimeFromTimestamp(comprobante.created_at)} {userAbbr}
                </div>
                <div>
                  Tipo: {comprobante.tipo_salida || "Salida por comprobante"}
                </div>
                <div>-----------------------------------------------</div>
              </div>

              {/* Patient Info */}
              {comprobante.patient && (
                <div className="space-y-0">
                  <div>
                    Paciente: {comprobante.patient.first_name}{" "}
                    {comprobante.patient.last_name}
                  </div>
                  <div>DNI: {comprobante.patient.dni}</div>
                  <div>Código: {comprobante.patient.patient_code}</div>
                </div>
              )}

              {/* Separator */}
              <div>-----------------------------------------------</div>

              {/* Items Header */}
              <div className="grid grid-cols-12 gap-1 font-bold text-xs">
                <div className="col-span-6">Descripción</div>
                <div className="col-span-2 text-right">Cant.</div>
                <div className="col-span-2 text-right">P.Unit</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              <div>-----------------------------------------------</div>

              {/* Items */}
              {medications.length === 0 ? (
                <div className="text-center text-xs">
                  No hay productos registrados
                </div>
              ) : (
                medications.map((med: any, index: number) => {
                  const quantity = med.quantity || med.cantidad || 0;
                  const unitPrice =
                    med.unit_price ||
                    med.precio_unitario ||
                    med.sale_cost_per_unit ||
                    0;
                  const subtotal =
                    med.subtotal || quantity * unitPrice || 0;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="grid grid-cols-12 gap-1 text-xs">
                        <div className="col-span-6 break-words">
                          {med.descripcion || med.name || "-"}
                        </div>
                        <div className="col-span-2 text-right">{quantity}</div>
                        <div className="col-span-2 text-right">
                          {unitPrice.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right">
                          {subtotal.toFixed(2)}
                        </div>
                      </div>
                      {(med.presentation || med.presentacion) && (
                        <div className="text-xs italic pl-2">
                          {med.presentation || med.presentacion}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Separator */}
              <div>-----------------------------------------------</div>

              {/* Total */}
              <div className="font-bold text-base text-right">
                TOTAL: {formatCurrency(comprobante.total)}
              </div>

              {/* Separator */}
              <div>-----------------------------------------------</div>

              {/* Footer */}
              <div className="text-center space-y-0 text-xs">
                <div>{footerLine1}</div>
                <div>{footerLine2}</div>
                <div>{footerLine3}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
