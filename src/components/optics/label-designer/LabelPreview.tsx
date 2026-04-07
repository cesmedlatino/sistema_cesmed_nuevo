import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { Canvas as FabricCanvas } from "fabric";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: FabricCanvas | null;
  width: number;
  height: number;
}

export function LabelPreview({ open, onOpenChange, canvas, width, height }: Props) {
  const handlePrint = () => {
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Etiqueta</title>
          <style>
            @page {
              size: ${width}mm ${height}mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              width: ${width}mm;
              height: ${height}mm;
              object-fit: contain;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
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

  const handleDownload = () => {
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 3,
    });

    const link = document.createElement("a");
    link.download = `etiqueta-${width}x${height}mm.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vista Previa de Etiqueta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-8">
            <div className="border-2 border-dashed border-muted-foreground/30 bg-white shadow-lg p-1">
              {canvas && (
                <img 
                  src={canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 })}
                  alt="Vista previa"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Tamaño: {width} × {height} mm
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PNG
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
