import React, { useEffect, useState } from "react";
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
import { useCreateOpticsProduct, useUpdateOpticsProduct, OpticsProduct } from "@/hooks/useOpticsProducts";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useOpticsProductTypes } from "@/hooks/useOpticsProductTypes";
import { useNextOpticsCode } from "@/hooks/useOpticsNextCode";
import { Settings2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpticsProductTypesManager } from "./OpticsProductTypesManager";
import { useQueryClient } from "@tanstack/react-query";

const GENDERS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "unisex", label: "Unisex" },
  { value: "nino", label: "Niño" },
];

const LENS_TYPES = [
  { value: "monofocal", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "progresivo", label: "Progresivo" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: OpticsProduct | null;
}

export function OpticsProductDialog({ open, onOpenChange, product }: Props) {
  const createProduct = useCreateOpticsProduct();
  const updateProduct = useUpdateOpticsProduct();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: productTypes } = useOpticsProductTypes();
  const { data: nextCode, refetch: refetchNextCode } = useNextOpticsCode();
  const queryClient = useQueryClient();
  
  const [showTypesManager, setShowTypesManager] = useState(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      codigo: "",
      nombre: "",
      tipo: "montura",
      marca: "",
      modelo: "",
      descripcion: "",
      precio_compra: 0,
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 5,
      ubicacion: "",
      proveedor_id: "",
      material: "",
      color: "",
      tamanio: "",
      genero: "",
      indice_refraccion: "",
      tratamiento: "",
      tipo_lente: "",
    },
  });

  const selectedType = watch("tipo");
  const isMontura = selectedType === "montura" || selectedType === "gafas_sol";
  const isLentes = selectedType === "lentes_contacto" || selectedType === "lentes_graduados";

  useEffect(() => {
    if (product) {
      reset({
        codigo: product.codigo || "",
        nombre: product.nombre || "",
        tipo: product.tipo || "montura",
        marca: product.marca || "",
        modelo: product.modelo || "",
        descripcion: product.descripcion || "",
        precio_compra: product.precio_compra || 0,
        precio_venta: product.precio_venta || 0,
        stock_actual: product.stock_actual || 0,
        stock_minimo: product.stock_minimo || 5,
        ubicacion: product.ubicacion || "",
        proveedor_id: product.proveedor_id || "",
        material: product.material || "",
        color: product.color || "",
        tamanio: product.tamanio || "",
        genero: product.genero || "",
        indice_refraccion: product.indice_refraccion || "",
        tratamiento: product.tratamiento || "",
        tipo_lente: product.tipo_lente || "",
      });
    } else {
      reset({
        codigo: "",
        nombre: "",
        tipo: "montura",
        marca: "",
        modelo: "",
        descripcion: "",
        precio_compra: 0,
        precio_venta: 0,
        stock_actual: 0,
        stock_minimo: 5,
        ubicacion: "",
        proveedor_id: "",
        material: "",
        color: "",
        tamanio: "",
        genero: "",
        indice_refraccion: "",
        tratamiento: "",
        tipo_lente: "",
      });
      // Refetch next code when opening dialog for new product
      refetchNextCode();
    }
  }, [product, reset, refetchNextCode]);

  // Set next code when available and creating new product
  useEffect(() => {
    if (!product && open && nextCode) {
      setValue("codigo", nextCode);
    }
  }, [nextCode, open, product, setValue]);

  const onSubmit = async (data: any) => {
    const productData = {
      ...data,
      precio_compra: parseFloat(data.precio_compra) || 0,
      precio_venta: parseFloat(data.precio_venta) || 0,
      stock_actual: parseInt(data.stock_actual) || 0,
      stock_minimo: parseInt(data.stock_minimo) || 5,
      proveedor_id: data.proveedor_id || null,
      status: "Activo",
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
      // Invalidate next code query to get fresh code for next product
      queryClient.invalidateQueries({ queryKey: ["next-optics-code"] });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Código, Tipo, Nombre */}
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-1 space-y-1.5">
              <Label htmlFor="codigo" className="text-xs">Código {!product && "(auto)"}</Label>
              <Input
                id="codigo"
                placeholder="Auto"
                {...register("codigo")}
                className="font-mono h-9"
                readOnly={!product}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="tipo" className="text-xs">Tipo *</Label>
              <div className="flex gap-1">
                <Select
                  value={watch("tipo")}
                  onValueChange={(value) => setValue("tipo", value)}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes?.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setShowTypesManager(true)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gestionar tipos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="col-span-3 space-y-1.5">
              <Label htmlFor="nombre" className="text-xs">Nombre del Producto *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Montura Ray-Ban Aviator"
                {...register("nombre", { required: true })}
                className="h-9"
              />
            </div>
          </div>

          {/* Dialog para gestionar tipos */}
          <OpticsProductTypesManager
            open={showTypesManager}
            onOpenChange={setShowTypesManager}
            onTypeCreated={(value) => setValue("tipo", value)}
          />

          {/* Row 2: Marca, Modelo, Proveedor */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="marca" className="text-xs">Marca</Label>
              <Input id="marca" placeholder="Ej: Ray-Ban" {...register("marca")} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modelo" className="text-xs">Modelo</Label>
              <Input id="modelo" placeholder="Ej: RB3025" {...register("modelo")} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedor_id" className="text-xs">Proveedor</Label>
              <Select
                value={watch("proveedor_id")}
                onValueChange={(value) => setValue("proveedor_id", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Precios y Stock */}
          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="precio_compra" className="text-xs">P. Compra (S/.)</Label>
              <Input
                id="precio_compra"
                type="number"
                step="0.01"
                {...register("precio_compra")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precio_venta" className="text-xs">P. Venta (S/.)</Label>
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
              <Label htmlFor="stock_minimo" className="text-xs">Stock Mín.</Label>
              <Input
                id="stock_minimo"
                type="number"
                {...register("stock_minimo")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ubicacion" className="text-xs">Ubicación</Label>
              <Input id="ubicacion" placeholder="Estante A-1" {...register("ubicacion")} className="h-9" />
            </div>
          </div>

          {/* Campos específicos para monturas */}
          {isMontura && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <h4 className="font-medium text-xs text-muted-foreground mb-2">Detalles de Montura</h4>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="material" className="text-xs">Material</Label>
                  <Input id="material" placeholder="Acetato, Metal" {...register("material")} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color" className="text-xs">Color</Label>
                  <Input id="color" placeholder="Negro, Dorado" {...register("color")} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tamanio" className="text-xs">Tamaño</Label>
                  <Input id="tamanio" placeholder="52-18-140" {...register("tamanio")} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="genero" className="text-xs">Género</Label>
                  <Select
                    value={watch("genero")}
                    onValueChange={(value) => setValue("genero", value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos para lentes */}
          {isLentes && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <h4 className="font-medium text-xs text-muted-foreground mb-2">Detalles de Lentes</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="indice_refraccion" className="text-xs">Índice de Refracción</Label>
                  <Input id="indice_refraccion" placeholder="1.56, 1.67" {...register("indice_refraccion")} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_lente" className="text-xs">Tipo de Lente</Label>
                  <Select
                    value={watch("tipo_lente")}
                    onValueChange={(value) => setValue("tipo_lente", value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {LENS_TYPES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tratamiento" className="text-xs">Tratamiento</Label>
                  <Input id="tratamiento" placeholder="Antirreflejo, Blue Block" {...register("tratamiento")} className="h-9" />
                </div>
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="descripcion" className="text-xs">Descripción / Notas</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción adicional del producto..."
              {...register("descripcion")}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
              {product ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
