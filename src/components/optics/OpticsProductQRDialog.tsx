import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OpticsProduct } from "@/hooks/useOpticsProducts";
import { ProductLabelCanvas } from "./ProductLabelCanvas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: OpticsProduct | null;
}

export function OpticsProductQRDialog({ open, onOpenChange, product }: Props) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Etiqueta del Producto</DialogTitle>
        </DialogHeader>

        <ProductLabelCanvas 
          product={product} 
          showPrintButton={true}
          className="flex flex-col items-center"
        />
      </DialogContent>
    </Dialog>
  );
}
