import React, { useRef, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { Loader2, Printer, Download } from "lucide-react";
import { useGeneralLabelTemplate, LabelTemplate } from "@/hooks/useOpticsLabelTemplates";
import { Canvas as FabricCanvas, Image as FabricImage, util } from "fabric";
import { Button } from "@/components/ui/button";

interface CatalogoProduct {
  codigo: string;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  precio_venta?: number | null;
  catalogo?: string;
  clasificacion?: string | null;
  [key: string]: any;
}

interface Props {
  product: CatalogoProduct;
  className?: string;
  showPrintButton?: boolean;
}

const mmToPixels = (mm: number) => Math.round(mm * 3.7795275591);

export function GeneralProductLabelCanvas({ product, className, showPrintButton = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const { data: template, isLoading: templateLoading } = useGeneralLabelTemplate();

  const productUrl = `${window.location.origin}/optics/catalogo-general/${product.codigo}`;

  useEffect(() => {
    if (!barcodeCanvasRef.current || !product?.codigo) return;
    try {
      JsBarcode(barcodeCanvasRef.current, product.codigo, {
        format: "CODE39",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
        textMargin: 2,
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

      const maxDisplayWidth = 280;
      const displayScale = Math.min(maxDisplayWidth / baseWidth, 2);

      targetCanvas.width = baseWidth * printScale;
      targetCanvas.height = baseHeight * printScale;
      targetCanvas.style.width = `${baseWidth * displayScale}px`;
      targetCanvas.style.height = `${baseHeight * displayScale}px`;

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

        const qrTarget = findPlaceholderTarget(template, "QR");
        if (qrTarget) {
          const sourceCanvas = await waitForCanvas(qrCanvasRef.current, 60);
          if (sourceCanvas) {
            const { left, top, width, height } = qrTarget;
            const side = Math.min(width, height);
            const x = left + (width - side) / 2;
            const y = top + (height - side) / 2;

            const img = new FabricImage(sourceCanvas, {
              left: x, top: y,
              selectable: false, evented: false, objectCaching: false,
            });
            (img as any).imageSmoothing = false;
            img.scaleToWidth(side);
            img.scaleToHeight(side);
            fabricCanvas.add(img);
          }
        }

        const barcodeTarget = findPlaceholderTarget(template, "CÓDIGO DE BARRAS");
        if (barcodeTarget && barcodeCanvasRef.current) {
          await new Promise((r) => requestAnimationFrame(r));
          const bc = barcodeCanvasRef.current;
          if (bc.width > 0 && bc.height > 0) {
            const { left, top, width, height } = barcodeTarget;
            const img = new FabricImage(bc, {
              left, top, selectable: false, evented: false, objectCaching: false,
            });
            img.scaleToWidth(width);
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
        const dataUrl = fabricCanvas.toDataURL({ format: "png", quality: 1, multiplier });

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
    return () => { cancelled = true; };
  }, [template, templateLoading, product]);

  const findPlaceholderTarget = (
    tmpl: LabelTemplate, label: string
  ): { left: number; top: number; width: number; height: number } | null => {
    const upperLabel = label.toUpperCase();
    const labelText = (tmpl.elements || []).find(
      (el: any) => String(el.type || "").toLowerCase() === "text" &&
        typeof el.text === "string" && el.text.trim().toUpperCase() === upperLabel
    );
    const dashedRects = (tmpl.elements || []).filter(
      (el: any) => String(el.type || "").toLowerCase() === "rect" && Array.isArray(el.strokeDashArray)
    );
    if (!dashedRects.length) return null;

    const pick = () => {
      if (!labelText) {
        if (upperLabel === "CÓDIGO DE BARRAS" && dashedRects.length > 1) return dashedRects[1];
        return dashedRects[0];
      }
      const x = labelText.left || 0;
      const y = labelText.top || 0;
      const containing = dashedRects.find((r: any) => {
        const l = r.left || 0; const t = r.top || 0;
        const w = (r.width || 0) * (r.scaleX || 1);
        const h = (r.height || 0) * (r.scaleY || 1);
        return x >= l && x <= l + w && y >= t && y <= t + h;
      });
      return containing || dashedRects[0];
    };

    const rect = pick();
    return {
      left: rect.left || 0, top: rect.top || 0,
      width: (rect.width || 0) * (rect.scaleX || 1),
      height: (rect.height || 0) * (rect.scaleY || 1),
    };
  };

  const waitForCanvas = async (root: HTMLDivElement | null, maxFrames: number) => {
    for (let i = 0; i < maxFrames; i++) {
      const c = root?.querySelector("canvas") as HTMLCanvasElement | null;
      if (c) return c;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return null;
  };

  const drawDataUrlToCanvas = (ctx: CanvasRenderingContext2D, dataUrl: string, w: number, h: number) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); resolve(); };
      img.onerror = () => resolve();
      img.src = dataUrl;
    });

  const replacePlaceholders = (text: string, prod: CatalogoProduct): string => {
    return (text || "")
      .replace("{CODIGO}", prod.codigo || "")
      .replace("{NOMBRE}", prod.nombre || "")
      .replace("{PRECIO}", `S/. ${(prod.precio_venta || 0).toFixed(2)}`)
      .replace("{MARCA}", prod.marca || "")
      .replace("{MODELO}", prod.modelo || "");
  };

  if (templateLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!template) {
    return <div className="text-center text-sm text-muted-foreground py-4">No hay plantilla de etiqueta para Catálogo General. Configúrala en el Diseñador de Etiquetas.</div>;
  }

  const handlePrint = () => {
    if (!canvasRef.current || !template) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const pw = template.paperSize.width;
    const ph = template.paperSize.height;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Etiqueta ${product.codigo}</title><style>*{margin:0;padding:0;box-sizing:border-box}@page{size:${pw}mm ${ph}mm;margin:0}html,body{width:${pw}mm;height:${ph}mm;margin:0;padding:0;overflow:hidden}img{display:block;width:${pw}mm;height:${ph}mm;object-fit:fill}@media print{html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style></head><body><img src="${dataUrl}"/><script>window.onload=function(){setTimeout(function(){window.print();window.close()},100)}</script></body></html>`);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `etiqueta-${product.codigo}.jpg`;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div className={className}>
      <div className="sr-only">
        <div ref={qrCanvasRef}>
          <QRCodeCanvas value={productUrl} size={256} level="L" includeMargin={false} />
        </div>
        <canvas ref={barcodeCanvasRef} />
      </div>

      <div className="flex flex-col items-center space-y-3">
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <canvas ref={canvasRef} />
        </div>
        {!canvasReady && <div className="mt-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
        {showPrintButton && canvasReady && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir Etiqueta
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
