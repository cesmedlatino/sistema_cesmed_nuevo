import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  useOpticsProductTypes,
  useCreateOpticsProductType,
  useUpdateOpticsProductType,
  useDeleteOpticsProductType,
} from "@/hooks/useOpticsProductTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeCreated?: (value: string) => void;
}

export function OpticsProductTypesManager({ open, onOpenChange, onTypeCreated }: Props) {
  const { data: productTypes, isLoading } = useOpticsProductTypes();
  const createProductType = useCreateOpticsProductType();
  const updateProductType = useUpdateOpticsProductType();
  const deleteProductType = useDeleteOpticsProductType();

  const [newTypeName, setNewTypeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (newTypeName.trim()) {
      const result = await createProductType.mutateAsync({
        value: newTypeName.trim(),
        label: newTypeName.trim(),
      });
      onTypeCreated?.(result.value);
      setNewTypeName("");
    }
  };

  const handleStartEdit = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditingValue(currentLabel);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async () => {
    if (editingId && editingValue.trim()) {
      await updateProductType.mutateAsync({ id: editingId, label: editingValue.trim() });
      setEditingId(null);
      setEditingValue("");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProductType.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Tipos de Producto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new type */}
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo tipo de producto..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                size="icon"
                disabled={!newTypeName.trim() || createProductType.isPending}
                onClick={handleCreate}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Types table */}
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : productTypes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        No hay tipos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    productTypes?.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell>
                          {editingId === type.id ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            type.label
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === type.id ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleSaveEdit}
                                disabled={updateProductType.isPending}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleStartEdit(type.id, type.label)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(type.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el tipo de producto. Los productos existentes con este tipo no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
