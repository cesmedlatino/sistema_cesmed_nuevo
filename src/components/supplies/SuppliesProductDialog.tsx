import React, { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";

import {
  SuppliesProduct,
  useCreateSuppliesProduct,
  useUpdateSuppliesProduct,
} from "@/hooks/useSuppliesProducts";
import { usePharmacySuppliers } from "@/hooks/usePharmacySuppliers";
import { useNextMedicationCode } from "@/hooks/usePharmacyMedications";
import { useSuppliesCategories } from "@/hooks/useSuppliesCategories";
import { SuppliesCategoriesDialog } from "./SuppliesCategoriesDialog";
import { Settings } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: SuppliesProduct | null;
}

type FormValues = {
  codigo: string;
  descripcion: string;
  category: string;
  presentation: string;
  ubicacion: string;
  stock_actual: number;
  min_stock_level: number;
  purchase_price: number;
  precio_venta: number;
  supplier_id: string;
  laboratorio: string;
};

export function SuppliesProductDialog({ open, onOpenChange, product }: Props) {
  const NONE_VALUE = "__none__";
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const createProduct = useCreateSuppliesProduct();
  const updateProduct = useUpdateSuppliesProduct();
  const { data: suppliers } = usePharmacySuppliers();
  const { data: nextCode, refetch: refetchNextCode } = useNextMedicationCode();
  const { data: categoriesRows, isLoading: loadingCategories } = useSuppliesCategories();
  const { userData } = useUserPermissions();
  const isAdmin = userData?.rol === "administrador";

  const categoryOptions = useMemo(() => {
    const rows = (categoriesRows || []).filter((c) => c.is_active);
    return rows.map((c) => c.name).filter(Boolean);
  }, [categoriesRows]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      codigo: "",
      descripcion: "",
      category: "",
      presentation: "",
      ubicacion: "",
      stock_actual: 0,
      min_stock_level: 5,
      purchase_price: 0,
      precio_venta: 0,
      supplier_id: "",
      laboratorio: "",
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        codigo: product.codigo || "",
        descripcion: product.descripcion || "",
        category: product.category || "",
        presentation: product.presentation || "",
        ubicacion: product.ubicacion || "",
        stock_actual: product.stock_actual || 0,
        min_stock_level: product.min_stock_level || 5,
        purchase_price: product.purchase_price || 0,
        precio_venta: product.precio_venta || 0,
        supplier_id: product.supplier_id || "",
        laboratorio: product.laboratorio || "",
      });
    } else {
      reset({
        codigo: "",
        descripcion: "",
        category: "",
        presentation: "",
        ubicacion: "",
        stock_actual: 0,
        min_stock_level: 5,
        purchase_price: 0,
        precio_venta: 0,
        supplier_id: "",
        laboratorio: "",
      });
    }
  }, [product, reset]);

  // Asegura que el código automático se recalcula al abrir (evita duplicados en catálogos >1000).
  useEffect(() => {
    if (open && !product?.id) refetchNextCode();
  }, [open, product?.id, refetchNextCode]);

  // Autocomplete de código (misma secuencia de Farmacia) para NUEVO suministro
  useEffect(() => {
    if (!product?.id && open && nextCode) {
      setValue("codigo", nextCode);
    }
  }, [nextCode, open, product?.id, setValue]);

  // Set default category when opening NEW dialog and categories have loaded
  useEffect(() => {
    if (!product?.id && open && categoryOptions.length) {
      const current = watch("category");
      if (!current) setValue("category", categoryOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id, categoryOptions.length]);

  const onSubmit = async (data: FormValues) => {
    const payload = {
      codigo: data.codigo || undefined,
      descripcion: data.descripcion?.trim() || "",
      category: data.category,
      presentation: data.presentation?.trim() || "",
      ubicacion: data.ubicacion?.trim() || "",
      stock_actual: Number(data.stock_actual) || 0,
      min_stock_level: Number(data.min_stock_level) || 5,
      purchase_price: Number(data.purchase_price) || 0,
      precio_venta: Number(data.precio_venta) || 0,
      supplier_id: data.supplier_id ? data.supplier_id : null,
      laboratorio: data.laboratorio?.trim() || null,
    };

    if (product?.id) {
      await updateProduct.mutateAsync({ id: product.id, ...payload });
    } else {
      await createProduct.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Suministro" : "Nuevo Suministro"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código (Automático)</Label>
              <Input id="codigo" {...register("codigo")} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categoría *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={isAdmin ? "Gestionar categorías" : "Solo administradores"}
                  onClick={() => setCategoriesOpen(true)}
                  disabled={!isAdmin}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCategories ? (
                    <SelectItem value="__loading__" disabled>
                      Cargando categorías...
                    </SelectItem>
                  ) : categoryOptions.length ? (
                    categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__empty__" disabled>
                      No hay categorías activas
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              rows={2}
              placeholder="Ej: Gasas estériles 10x10"
              {...register("descripcion", { required: true })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presentation">Presentación</Label>
              <Input id="presentation" placeholder="Caja, bolsa, unidad..." {...register("presentation")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input id="ubicacion" placeholder="Estante / almacén" {...register("ubicacion")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select
                value={watch("supplier_id") || NONE_VALUE}
                onValueChange={(v) => setValue("supplier_id", v === NONE_VALUE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sin proveedor</SelectItem>
                  {(suppliers || []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="laboratorio">Laboratorio</Label>
              <Input id="laboratorio" {...register("laboratorio")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_actual">Stock</Label>
              <Input id="stock_actual" type="number" min={0} step={1} {...register("stock_actual", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Stock mínimo</Label>
              <Input id="min_stock_level" type="number" min={0} step={1} {...register("min_stock_level", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">P. compra</Label>
              <Input id="purchase_price" type="number" min={0} step="0.01" {...register("purchase_price", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_venta">P. venta</Label>
              <Input id="precio_venta" type="number" min={0} step="0.01" {...register("precio_venta", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
              {product ? "Guardar cambios" : "Crear suministro"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <SuppliesCategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </Dialog>
  );
}
