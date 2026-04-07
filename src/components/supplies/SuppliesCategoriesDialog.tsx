import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";
import {
  useCreateSuppliesCategory,
  useDeleteSuppliesCategory,
  useSuppliesCategories,
  useUpdateSuppliesCategory,
} from "@/hooks/useSuppliesCategories";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuppliesCategoriesDialog({ open, onOpenChange }: Props) {
  const { userData } = useUserPermissions();
  const isAdmin = userData?.rol === "administrador";

  const { data: categories, isLoading } = useSuppliesCategories();
  const createCategory = useCreateSuppliesCategory();
  const updateCategory = useUpdateSuppliesCategory();
  const deleteCategory = useDeleteSuppliesCategory();

  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const list = categories || [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, filter]);

  const handleCreate = async () => {
    await createCategory.mutateAsync(newName);
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gestionar categorías de suministros</DialogTitle>
        </DialogHeader>

        {!isAdmin ? (
          <div className="text-sm text-muted-foreground">
            Solo los administradores pueden crear/editar categorías.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="newCategory">Nueva categoría</Label>
            <div className="flex gap-2">
              <Input
                id="newCategory"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Insumos de esterilización"
                disabled={!isAdmin}
              />
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!isAdmin || !newName.trim() || createCategory.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter">Buscar</Label>
            <Input
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar categorías..."
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando categorías...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay categorías</div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.is_active ? "Activa" : "Inactiva"}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Activo</span>
                    <Switch
                      checked={c.is_active}
                      disabled={!isAdmin || updateCategory.isPending}
                      onCheckedChange={(checked) => updateCategory.mutate({ id: c.id, is_active: checked })}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    disabled={!isAdmin || deleteCategory.isPending}
                    onClick={() => deleteCategory.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
