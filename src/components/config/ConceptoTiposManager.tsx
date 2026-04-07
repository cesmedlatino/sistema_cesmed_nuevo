import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ConceptoTipo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipos: ConceptoTipo[];
  onTiposChange: (tipos: ConceptoTipo[]) => void;
}

const DEFAULT_TIPOS: ConceptoTipo[] = [
  { id: "consulta", nombre: "Consulta", activo: true },
  { id: "procedimiento", nombre: "Procedimiento", activo: true },
  { id: "medicamento", nombre: "Medicamento", activo: true },
  { id: "examen", nombre: "Examen", activo: true },
  { id: "otros", nombre: "Otros", activo: true },
];

const STORAGE_KEY = "concepto_tipos";

export function loadConceptoTipos(): ConceptoTipo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error loading concepto tipos:", e);
  }
  return DEFAULT_TIPOS;
}

export function saveConceptoTipos(tipos: ConceptoTipo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tipos));
}

export function ConceptoTiposManager({ open, onOpenChange, tipos, onTiposChange }: Props) {
  const { toast } = useToast();
  const [newTipo, setNewTipo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddTipo = () => {
    if (!newTipo.trim()) return;

    const id = newTipo.trim().toLowerCase().replace(/\s+/g, "_");
    
    if (tipos.some((t) => t.id === id)) {
      toast({
        title: "Tipo duplicado",
        description: "Ya existe un tipo con ese nombre.",
        variant: "destructive",
      });
      return;
    }

    const updatedTipos = [...tipos, { id, nombre: newTipo.trim(), activo: true }];
    onTiposChange(updatedTipos);
    saveConceptoTipos(updatedTipos);
    setNewTipo("");

    toast({
      title: "Tipo agregado",
      description: `Se ha agregado el tipo "${newTipo.trim()}".`,
    });
  };

  const handleStartEdit = (tipo: ConceptoTipo) => {
    setEditingId(tipo.id);
    setEditingName(tipo.nombre);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingId) return;

    const updatedTipos = tipos.map((t) =>
      t.id === editingId ? { ...t, nombre: editingName.trim() } : t
    );
    onTiposChange(updatedTipos);
    saveConceptoTipos(updatedTipos);
    setEditingId(null);
    setEditingName("");

    toast({
      title: "Tipo actualizado",
      description: "El tipo se ha actualizado correctamente.",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleToggleActivo = (id: string) => {
    const updatedTipos = tipos.map((t) =>
      t.id === id ? { ...t, activo: !t.activo } : t
    );
    onTiposChange(updatedTipos);
    saveConceptoTipos(updatedTipos);
  };

  const handleDelete = (id: string) => {
    // Soft delete by marking as inactive
    const updatedTipos = tipos.map((t) =>
      t.id === id ? { ...t, activo: false } : t
    );
    onTiposChange(updatedTipos);
    saveConceptoTipos(updatedTipos);

    toast({
      title: "Tipo desactivado",
      description: "El tipo ha sido desactivado.",
    });
  };

  const activeTipos = tipos.filter((t) => t.activo);
  const inactiveTipos = tipos.filter((t) => !t.activo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Tipos de Concepto</DialogTitle>
          <DialogDescription>
            Agrega, edita o desactiva los tipos de concepto disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new type */}
          <div className="flex gap-2">
            <Input
              placeholder="Nuevo tipo..."
              value={newTipo}
              onChange={(e) => setNewTipo(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTipo()}
            />
            <Button onClick={handleAddTipo} disabled={!newTipo.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Active types list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipos Activos</Label>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {activeTipos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay tipos activos
                </p>
              ) : (
                <div className="space-y-2">
                  {activeTipos.map((tipo) => (
                    <div
                      key={tipo.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      {editingId === tipo.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8"
                            onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium capitalize">{tipo.nombre}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(tipo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(tipo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Inactive types */}
          {inactiveTipos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Tipos Inactivos
              </Label>
              <div className="flex flex-wrap gap-2">
                {inactiveTipos.map((tipo) => (
                  <Badge
                    key={tipo.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleToggleActivo(tipo.id)}
                  >
                    {tipo.nombre}
                    <Plus className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Haz clic para reactivar un tipo
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
