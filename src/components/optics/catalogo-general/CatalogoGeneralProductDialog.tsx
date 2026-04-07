import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import {
  useCreateCatalogoItem,
  useUpdateCatalogoItem,
  useNextCatalogoCode,
  CatalogoGeneralItem,
} from "@/hooks/useCatalogoGeneral";

const CATALOGOS = [
  { value: "Farmacia", label: "Farmacia" },
  { value: "Inventario General", label: "Inventario General" },
];

const CLASIFICACIONES_FARMACIA = [
  { value: "Producto de Oftalmología", label: "Producto de Oftalmología" },
  { value: "Producto de Dermatología", label: "Producto de Dermatología" },
  { value: "Fórmula Magistral", label: "Fórmula Magistral" },
  { value: "Medicamento General", label: "Medicamento General" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: CatalogoGeneralItem | null;
}

export function CatalogoGeneralProductDialog({ open, onOpenChange, product }: Props) {
  const createItem = useCreateCatalogoItem();
  const updateItem = useUpdateCatalogoItem();
  const { data: nextCode, refetch: refetchNextCode } = useNextCatalogoCode();

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      codigo: "",
      catalogo: "Inventario General",
      nombre: "",
      clasificacion: "",
      marca: "",
      modelo: "",
      serie: "",
      precio_venta: 0,
      stock_actual: 0,
      ubicacion: "",
      observacion: "",
    },
  });

  const selectedCatalogo = watch("catalogo");

  useEffect(() => {
    if (product) {
      reset({
        codigo: product.codigo || "",
        catalogo: product.catalogo || "Inventario General",
        nombre: product.nombre || "",
        clasificacion: product.clasificacion || "",
        marca: product.marca || "",
        modelo: product.modelo || "",
        serie: product.serie || "",
        precio_venta: product.precio_venta || 0,
        stock_actual: product.stock_actual || 0,
        ubicacion: product.ubicacion || "",
        observacion: product.observacion || "",
      });
    } else {
      reset({
        codigo: "",
        catalogo: "Inventario General",
        nombre: "",
        clasificacion: "",
        marca: "",
        modelo: "",
        serie: "",
        precio_venta: 0,
        stock_actual: 0,
        ubicacion: "",
        observacion: "",
      });
      refetchNextCode();
    }
  }, [product, reset, refetchNextCode]);

  useEffect(() => {
    if (!product && open && nextCode) {
      setValue("codigo", nextCode);
    }
  }, [nextCode, open, product, setValue]);

  const onSubmit = async (data: any) => {
    const itemData = {
      ...data,
      precio_venta: parseFloat(data.precio_venta) || 0,
      stock_actual: parseInt(data.stock_actual) || 0,
      status: "Activo",
    };

    if (product) {
      await updateItem.mutateAsync({ id: product.id, ...itemData });
    } else {
      await createItem.mutateAsync(itemData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Código, Catálogo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="codigo" className="text-xs">Código {!product && "(auto)"}</Label>
              <Input
                id="codigo"
                placeholder="Auto"
                {...register("codigo")}
                className="font-mono h-9"
                maxLength={10}
                readOnly={!product}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="catalogo" className="text-xs">Catálogo *</Label>
              <Select
                value={watch("catalogo")}
                onValueChange={(value) => {
                  setValue("catalogo", value);
                  if (value !== "Farmacia") {
                    setValue("clasificacion", "");
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {CATALOGOS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clasificacion" className="text-xs">
                Clasificación {selectedCatalogo === "Farmacia" && "*"}
              </Label>
              {selectedCatalogo === "Farmacia" ? (
                <Select
                  value={watch("clasificacion")}
                  onValueChange={(value) => setValue("clasificacion", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASIFICACIONES_FARMACIA.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="clasificacion"
                  placeholder="Clasificación libre"
                  {...register("clasificacion")}
                  className="h-9"
                />
              )}
            </div>
          </div>

          {/* Row 2: Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="text-xs">Nombre del Producto *</Label>
            <Input
              id="nombre"
              placeholder="Nombre del producto, mobiliario o equipo"
              {...register("nombre", { required: true })}
              className="h-9"
            />
          </div>

          {/* Row 3: Marca, Modelo, Serie */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="marca" className="text-xs">Marca</Label>
              <Input id="marca" placeholder="Marca" {...register("marca")} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo" className="text-xs">Modelo</Label>
              <Input id="modelo" placeholder="Modelo" {...register("modelo")} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serie" className="text-xs">Serie</Label>
              <Input id="serie" placeholder="Serie" {...register("serie")} className="h-9" />
            </div>
          </div>

          {/* Row 4: Precio, Stock, Ubicación */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="precio_venta" className="text-xs">Precio de Venta (S/.)</Label>
              <Input
                id="precio_venta"
                type="number"
                step="0.01"
                {...register("precio_venta")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock_actual" className="text-xs">Stock Actual</Label>
              <Input
                id="stock_actual"
                type="number"
                {...register("stock_actual")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ubicacion" className="text-xs">Ubicación</Label>
              <Input id="ubicacion" placeholder="Almacén, Estante..." {...register("ubicacion")} className="h-9" />
            </div>
          </div>

          {/* Row 5: Observación */}
          <div className="space-y-1.5">
            <Label htmlFor="observacion" className="text-xs">Observación</Label>
            <Textarea
              id="observacion"
              placeholder="Observaciones adicionales..."
              {...register("observacion")}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {product ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
