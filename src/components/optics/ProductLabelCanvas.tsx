import React, { useRef, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { Loader2, Printer, Download } from "lucide-react";
import { OpticsProduct } from "@/hooks/useOpticsProducts";
import { useDefaultLabelTemplate, LabelTemplate } from "@/hooks/useOpticsLabelTemplates";
import { Canvas as FabricCanvas, Image as FabricImage, util } from "fabric";
import { Button } from "@/components/ui/button";

interface Props {
  product: OpticsProduct;
  className?: string;
  showPrintButton?: boolean;
}

const mmToPixels = (mm: number) => Math.round(mm * 3.7795275591);

export function ProductLabelCanvas({ product, className, showPrintButton = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const { data: template, isLoading: templateLoading } = useDefaultLabelTemplate();

  // Use published URL for QR so it works when scanned externally
  const productUrl = `https://sistema-integrado-cesmed.lovable.app/optics/product/${product.codigo}`;

  // Generate barcode canvas
  useEffect(() => {
    if (!barcodeCanvasRef.current || !product?.codigo) return;
    try {
      JsBarcode(barcodeCanvasRef.current, product.codigo, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 2,
        background: "#ffffff",
      });
    } catch (e) {
      console.warn("Barcode generation failed:", e);
    }
  }, [product?.codigo]);

  useEffect(() => {
    if (!product || !canvasRef.current || templateLoading || !template) return;

    let cancelled = false;

    const run = async () => {
      setCanvasReady(false);

      const targetCanvas = canvasRef.current;
      if (!targetCanvas) return;
      const targetCtx = targetCanvas.getContext("2d");
      if (!targetCtx) return;

      const baseWidth = mmToPixels(template.paperSize.width);
      const baseHeight = mmToPixels(template.paperSize.height);
      const printScale = 3;
      const savedZoom = typeof template.zoomUsed === "number" ? template.zoomUsed : 3;

      // Responsive display
      const maxDisplayWidth = 280;
      const displayScale = Math.min(maxDisplayWidth / baseWidth, 2);

      targetCanvas.width = baseWidth * printScale;
      targetCanvas.height = baseHeight * printScale;
      targetCanvas.style.width = `${baseWidth * displayScale}px`;
      targetCanvas.style.height = `${baseHeight * displayScale}px`;

      // Offscreen Fabric canvas
      const fabricEl = document.createElement("canvas");
      const fabricCanvas = new FabricCanvas(fabricEl, {
        width: baseWidth * savedZoom,
        height: baseHeight * savedZoom,
        backgroundColor: "#ffffff",
        selection: false,
      });

      try {
        const objects = await util.enlivenObjects(template.elements || []);

        objects.forEach((obj: any) => {
          if (!obj) return;
          const type = String(obj.type || "").toLowerCase();
          
          // Hide dashed rectangles (QR/barcode placeholder borders)
          if (type === "rect" && Array.isArray(obj.strokeDashArray)) {
            obj.set("visible", false);
          }
          
          if (type === "text" || type === "itext" || type === "i-text") {
            const raw = typeof obj.text === "string" ? obj.text : "";
            const upper = raw.trim().toUpperCase();
            if (upper === "QR" || upper === "CÓDIGO DE BARRAS") {
              obj.set("visible", false);
            } else {
              obj.set("text", replacePlaceholders(raw, product));
            }
          }
          obj.set({ selectable: false, evented: false });
          fabricCanvas.add(obj);
        });

        // Add QR image
        const qrTarget = findPlaceholderTarget(template, "QR");
        if (qrTarget) {
          const sourceCanvas = await waitForCanvas(qrCanvasRef.current, 60);
          if (sourceCanvas) {
            const { left, top, width, height } = qrTarget;
            const side = Math.min(width, height);
            const x = left + (width - side) / 2;
            const y = top + (height - side) / 2;

            const img = new FabricImage(sourceCanvas, {
              left: x,
              top: y,
              selectable: false,
              evented: false,
              objectCaching: false,
            });
            (img as any).imageSmoothing = false;
            img.scaleToWidth(side);
            img.scaleToHeight(side);
            fabricCanvas.add(img);
          }
        }

        // Add Barcode image
        const barcodeTarget = findPlaceholderTarget(template, "CÓDIGO DE BARRAS");
        if (barcodeTarget && barcodeCanvasRef.current) {
          // Wait a frame for barcode to render
          await new Promise((r) => requestAnimationFrame(r));
          const bc = barcodeCanvasRef.current;
          if (bc.width > 0 && bc.height > 0) {
            const { left, top, width, height } = barcodeTarget;
            const img = new FabricImage(bc, {
              left,
              top,
              selectable: false,
              evented: false,
              objectCaching: false,
            });
            img.scaleToWidth(width);
            // Maintain aspect ratio, but cap height
            const scaledHeight = (bc.height / bc.width) * width;
            if (scaledHeight > height) {
              img.scaleToHeight(height);
              const scaledWidth = (bc.width / bc.height) * height;
              img.set("left", left + (width - scaledWidth) / 2);
            } else {
              img.set("top", top + (height - scaledHeight) / 2);
            }
            fabricCanvas.add(img);
          }
        }

        fabricCanvas.renderAll();

        const multiplier = printScale / savedZoom;
        const dataUrl = fabricCanvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier,
        });

        await drawDataUrlToCanvas(targetCtx, dataUrl, targetCanvas.width, targetCanvas.height);
      } catch (e) {
        console.error("Label render failed:", e);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      } finally {
        fabricCanvas.dispose();
        if (!cancelled) setCanvasReady(true);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [template, templateLoading, product]);

  const findPlaceholderTarget = (
    tmpl: LabelTemplate,
    label: string
  ): { left: number; top: number; width: number; height: number } | null => {
    const upperLabel = label.toUpperCase();

    const labelText = (tmpl.elements || []).find(
      (el: any) =>
        String(el.type || "").toLowerCase() === "text" &&
        typeof el.text === "string" &&
        el.text.trim().toUpperCase() === upperLabel
    );

    const dashedRects = (tmpl.elements || []).filter(
      (el: any) =>
        String(el.type || "").toLowerCase() === "rect" &&
        Array.isArray(el.strokeDashArray)
    );

    if (!dashedRects.length) return null;

    const pick = () => {
      if (!labelText) {
        // For barcode, pick the second dashed rect if available; for QR, the first
        if (upperLabel === "CÓDIGO DE BARRAS" && dashedRects.length > 1) return dashedRects[1];
        return dashedRects[0];
      }
      const x = labelText.left || 0;
      const y = labelText.top || 0;
      const containing = dashedRects.find((r: any) => {
        const left = r.left || 0;
        const top = r.top || 0;
        const w = (r.width || 0) * (r.scaleX || 1);
        const h = (r.height || 0) * (r.scaleY || 1);
        return x >= left && x <= left + w && y >= top && y <= top + h;
      });
      return containing || dashedRects[0];
    };

    const rect = pick();
    return {
      left: rect.left || 0,
      top: rect.top || 0,
      width: (rect.width || 0) * (rect.scaleX || 1),
      height: (rect.height || 0) * (rect.scaleY || 1),
    };
  };

  const waitForCanvas = async (root: HTMLDivElement | null, maxFrames: number) => {
    for (let i = 0; i < maxFrames; i += 1) {
      const c = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (c) return c;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return null;
  };

  const drawDataUrlToCanvas = (
    ctx: CanvasRenderingContext2D,
    dataUrl: string,
    w: number,
    h: number
  ) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });

  const replacePlaceholders = (text: string, product: OpticsProduct): string => {
    const safe = typeof text === "string" ? text : "";
    return safe
      .replace("{CODIGO}", product.codigo || "")
      .replace("{NOMBRE}", product.nombre || "")
      .replace("{PRECIO}", `S/. ${(product.precio_venta || 0).toFixed(2)}`)
      .replace("{MARCA}", product.marca || "")
      .replace("{MODELO}", product.modelo || "");
  };

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No hay plantilla de etiqueta configurada
      </div>
    );
  }

  const handlePrint = () => {
    if (!canvasRef.current || !template) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Paper dimensions for thermal printer (30mm x 20mm)
    const paperWidth = template.paperSize.width;
    const paperHeight = template.paperSize.height;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta ${product.codigo}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: ${paperWidth}mm ${paperHeight}mm;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${paperWidth}mm;
              height: ${paperHeight}mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            body {
              display: block;
            }
            img {
              display: block;
              width: ${paperWidth}mm;
              height: ${paperHeight}mm;
              object-fit: fill;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
              image-rendering: pixelated;
            }
            @media print {
              html, body {
                width: ${paperWidth}mm;
                height: ${paperHeight}mm;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              img {
                width: 100%;
                height: 100%;
                page-break-after: avoid;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 100);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!canvasRef.current || !product) return;
    const link = document.createElement("a");
    link.download = `etiqueta-${product.codigo}.jpg`;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div className={className}>
      {/* Hidden QR canvas */}
      <div className="sr-only">
        <div ref={qrCanvasRef}>
          <QRCodeCanvas value={productUrl} size={256} level="L" includeMargin={false} />
        </div>
        <canvas ref={barcodeCanvasRef} />
      </div>

      {/* Visible label canvas */}
      <div className="flex flex-col items-center space-y-3">
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <canvas ref={canvasRef} />
        </div>
        {!canvasReady && (
          <div className="mt-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {showPrintButton && canvasReady && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Etiqueta
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDownload} title="Descargar JPG">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
