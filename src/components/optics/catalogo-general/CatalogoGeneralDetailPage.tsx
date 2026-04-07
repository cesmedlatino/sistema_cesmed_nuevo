import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, QrCode } from "lucide-react";
import {
  useCatalogoGeneralByCodigo,
  useDeleteCatalogoItem,
} from "@/hooks/useCatalogoGeneral";
import { CatalogoGeneralProductDialog } from "./CatalogoGeneralProductDialog";
import { GeneralProductLabelCanvas } from "./GeneralProductLabelCanvas";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CatalogoGeneralDetailPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useCatalogoGeneralByCodigo(codigo || "");
  const deleteItem = useDeleteCatalogoItem();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (product) {
      try {
        await deleteItem.mutateAsync(product.id);
        navigate("/optics/catalogo-general");
      } catch { /* handled */ }
    }
    setDeleteOpen(false);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando producto...</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/optics/catalogo-general")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/optics/catalogo-general")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-blue-700">{product.nombre}</h2>
            <p className="text-sm text-muted-foreground font-mono">{product.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono font-medium">{product.codigo}</span>
              <span className="text-muted-foreground">Catálogo:</span>
              <Badge variant={product.catalogo === "Farmacia" ? "default" : "secondary"}>
                {product.catalogo}
              </Badge>
              <span className="text-muted-foreground">Nombre:</span>
              <span>{product.nombre}</span>
              <span className="text-muted-foreground">Clasificación:</span>
              <span>{product.clasificacion || "—"}</span>
              <span className="text-muted-foreground">Marca:</span>
              <span>{product.marca || "—"}</span>
              <span className="text-muted-foreground">Modelo:</span>
              <span>{product.modelo || "—"}</span>
              <span className="text-muted-foreground">Serie:</span>
              <span>{product.serie || "—"}</span>
              <span className="text-muted-foreground">Precio Venta:</span>
              <span>S/. {(product.precio_venta || 0).toFixed(2)}</span>
              <span className="text-muted-foreground">Stock Actual:</span>
              <span className="font-bold">{product.stock_actual}</span>
              <span className="text-muted-foreground">Ubicación:</span>
              <span>{product.ubicacion || "—"}</span>
              <span className="text-muted-foreground">Observación:</span>
              <span>{product.observacion || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Label from template */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Etiqueta del Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <GeneralProductLabelCanvas product={product} showPrintButton />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CatalogoGeneralProductDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{product.nombre}" del catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
