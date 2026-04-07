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
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PagoItem {
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

interface PatientAccount {
  cuenta_id: string;
  patient_id: string;
  patient_name: string;
  patient_dni: string;
  patient_code: string;
  fecha_cuenta: string;
  estado: string;
  pagos: PagoItem[];
  monto_total: number;
  monto_adelantado: number;
  saldo_pendiente: number;
  comprobante_emitido: boolean;
  fecha_emision?: string;
  numero_comprobante?: string;
  tipo_comprobante?: string;
}

interface AccountReceiptPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: PatientAccount;
}

export function AccountReceiptPrintDialog({
  open,
  onOpenChange,
  account
}: AccountReceiptPrintDialogProps) {
  const [config, setConfig] = useState<any>(null);
  const [numCopies, setNumCopies] = useState(2);
  const [userAbbr, setUserAbbr] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('comprobante_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) setConfig(data);
    };

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
        const firstPart = (personal.nombres || "").substring(0, 3).toUpperCase();
        const lastPart = (personal.apellidos || "").substring(0, 3).toUpperCase();
        setUserAbbr(firstPart + lastPart);
      }
    };

    if (open) {
      loadConfig();
      fetchUserInfo();
    }
  }, [open]);

  const formatLocalDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  };

  const getCurrentLocalTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
      const formattedDate = formatLocalDate(account.fecha_cuenta);
      const formattedTime = getCurrentLocalTime();

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comprobante - ${account.numero_comprobante || 'Sin número'}</title>
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
            .text-right { text-align: right; }
            .text-xs { font-size: ${(config.font_size || 10) - 2}px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: ${(config.font_size || 10) + 4}px; font-weight: bold;">${config.company_name_line1 || 'Centro de Especialidades Médicas'}</div>
            <div style="font-size: ${(config.font_size || 10) + 2}px; font-weight: bold;">${config.company_name_line2 || 'Latinoamericano'}</div>
          </div>
          <div class="center" style="font-size: ${(config.font_size || 10) - 1}px; margin-top: 4px;">
            <div>RUC: ${config.ruc || '20607644315'}</div>
            <div>${config.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa'}</div>
            <div>${config.address_line2 || 'Pornogoche'}</div>
            <div>${config.address_line3 || 'Paucarpata - Arequipa - Perú'}</div>
            <div>Tel: ${config.phone || '054-407301'} WhatsApp: ${config.whatsapp || '950293377'}</div>
          </div>
          <div class="separator"></div>
          <div class="center bold">
            <div>${config.document_title || 'NOTA DE VENTA'}</div>
            <div>N° ${account.numero_comprobante}</div>
          </div>
          <div class="separator"></div>
          <div>
            <div>Fecha: ${formattedDate} ${formattedTime} ${userAbbr}</div>
          </div>
          <div class="separator"></div>
          <div>
            <div>Paciente: ${account.patient_name}</div>
            <div>DNI: ${account.patient_dni}</div>
            <div>Código: ${account.patient_code}</div>
          </div>
          <div class="separator"></div>
          <div class="row bold text-xs">
            <span style="flex: 3;">DESCRIPCIÓN</span>
            <span style="flex: 1; text-align: right;">IMPORTE</span>
          </div>
          <div class="separator"></div>
          ${account.pagos.map(pago => `
            <div class="row text-xs">
              <span style="flex: 3;">${pago.concepto}</span>
              <span style="flex: 1; text-align: right;">S/. ${pago.monto_pagado.toFixed(2)}</span>
            </div>
            <div style="font-size: ${(config.font_size || 10) - 3}px; color: #666; margin-left: 4px;">
              ${pago.pago_id} - ${pago.modalidad}
            </div>
          `).join('')}
          <div class="separator"></div>
          <div class="row bold">
            <span>TOTAL S/.</span>
            <span>${account.monto_total.toFixed(2)}</span>
          </div>
          <div class="separator"></div>
          <div class="text-xs">
            <div>Adelanto: S/. ${account.monto_adelantado.toFixed(2)}</div>
            <div>Saldo Pendiente: S/. ${account.saldo_pendiente.toFixed(2)}</div>
          </div>
          <div class="separator"></div>
          <div class="center" style="font-size: ${(config.font_size || 10) - 1}px; margin-top: 4px;">
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

    // Print copies sequentially
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

  const companyName = config?.company_name_line1 || 'Centro de Especialidades Médicas';
  const companyName2 = config?.company_name_line2 || 'Latinoamericano';
  const ruc = config?.ruc || '20607644315';
  const address1 = config?.address_line1 || 'Domicilio: Mz. G Lote. 17 Coop. Villa';
  const address2 = config?.address_line2 || 'Pornogoche';
  const address3 = config?.address_line3 || 'Paucarpata - Arequipa - Perú';
  const phone = config?.phone || '054-407301';
  const whatsapp = config?.whatsapp || '950293377';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <span>Reimprimir Comprobante - {account.numero_comprobante}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="num-copies-account" className="text-sm whitespace-nowrap">
                  Nro de copias:
                </Label>
                <Input
                  id="num-copies-account"
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
              <div className="font-bold">N° {account.numero_comprobante}</div>
              <div>-----------------------------------------------</div>
            </div>

            {/* Info */}
            <div className="space-y-0 text-xs">
              <div>Fecha: {formatLocalDate(account.fecha_cuenta)} {getCurrentLocalTime()} {userAbbr}</div>
              <div>-----------------------------------------------</div>
            </div>

            {/* Patient Info */}
            <div className="space-y-0 text-xs">
              <div>Paciente: {account.patient_name}</div>
              <div>DNI: {account.patient_dni}</div>
              <div>Código: {account.patient_code}</div>
            </div>

            {/* Separator */}
            <div className="my-1">-----------------------------------------------</div>

            {/* Items Header */}
            <div className="grid grid-cols-12 gap-1 font-bold text-xs">
              <span className="col-span-7">DESCRIPCIÓN</span>
              <span className="col-span-5 text-right">IMPORTE</span>
            </div>
            <div>-----------------------------------------------</div>

            {/* Items */}
            {account.pagos.map((pago, index) => (
              <div key={index} className="space-y-0">
                <div className="grid grid-cols-12 gap-1 text-xs">
                  <span className="col-span-7">{pago.concepto}</span>
                  <span className="col-span-5 text-right">S/. {pago.monto_pagado.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground pl-2">
                  {pago.pago_id} - {pago.modalidad}
                </div>
              </div>
            ))}

            <div>-----------------------------------------------</div>

            {/* Total */}
            <div className="flex justify-between font-bold">
              <span>TOTAL S/.</span>
              <span>{account.monto_total.toFixed(2)}</span>
            </div>

            <div>-----------------------------------------------</div>

            {/* Balance */}
            <div className="text-xs space-y-0">
              <div className="flex justify-between">
                <span>Adelanto:</span>
                <span>S/. {account.monto_adelantado.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saldo Pendiente:</span>
                <span>S/. {account.saldo_pendiente.toFixed(2)}</span>
              </div>
            </div>

            <div>-----------------------------------------------</div>

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
