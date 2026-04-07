import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Plus, FolderTree, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export function ExpenseConceptsManager() {
  const [open, setOpen] = useState(false);
  const [newCategoriaName, setNewCategoriaName] = useState("");
  const [newCategoriaDesc, setNewCategoriaDesc] = useState("");
  const [newConceptoName, setNewConceptoName] = useState("");
  const [newConceptoDesc, setNewConceptoDesc] = useState("");
  const [newConceptoCategoriaId, setNewConceptoCategoriaId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categorías
  const { data: categorias = [] } = useQuery({
    queryKey: ["egreso-categorias-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egreso_categorias")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Fetch conceptos
  const { data: conceptos = [] } = useQuery({
    queryKey: ["egreso-conceptos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egreso_conceptos")
        .select("*, categoria:egreso_categorias(*)")
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  // Crear categoría
  const createCategoria = useMutation({
    mutationFn: async () => {
      if (!newCategoriaName.trim()) throw new Error("El nombre es requerido");
      const { error } = await supabase
        .from("egreso_categorias")
        .insert([{ nombre: newCategoriaName.trim(), descripcion: newCategoriaDesc.trim() || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-categorias"] });
      queryClient.invalidateQueries({ queryKey: ["egreso-categorias-all"] });
      setNewCategoriaName("");
      setNewCategoriaDesc("");
      toast({ title: "Categoría creada correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Crear concepto
  const createConcepto = useMutation({
    mutationFn: async () => {
      if (!newConceptoName.trim()) throw new Error("El nombre es requerido");
      if (!newConceptoCategoriaId) throw new Error("La categoría es requerida");
      const { error } = await supabase
        .from("egreso_conceptos")
        .insert([{
          nombre: newConceptoName.trim(),
          descripcion: newConceptoDesc.trim() || null,
          categoria_id: newConceptoCategoriaId,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-conceptos"] });
      queryClient.invalidateQueries({ queryKey: ["egreso-conceptos-all"] });
      setNewConceptoName("");
      setNewConceptoDesc("");
      setNewConceptoCategoriaId("");
      toast({ title: "Concepto creado correctamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Toggle activo categoría
  const toggleCategoria = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("egreso_categorias")
        .update({ activo: !activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-categorias"] });
      queryClient.invalidateQueries({ queryKey: ["egreso-categorias-all"] });
    },
  });

  // Toggle activo concepto
  const toggleConcepto = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("egreso_conceptos")
        .update({ activo: !activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["egreso-conceptos"] });
      queryClient.invalidateQueries({ queryKey: ["egreso-conceptos-all"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Gestionar conceptos y categorías">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Gestión de Conceptos y Categorías de Egreso
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categorias" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Categorías
            </TabsTrigger>
            <TabsTrigger value="conceptos" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Conceptos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="space-y-4 mt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="cat-name">Nueva Categoría</Label>
                <Input
                  id="cat-name"
                  value={newCategoriaName}
                  onChange={(e) => setNewCategoriaName(e.target.value)}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="cat-desc">Descripción (opcional)</Label>
                <Input
                  id="cat-desc"
                  value={newCategoriaDesc}
                  onChange={(e) => setNewCategoriaDesc(e.target.value)}
                  placeholder="Descripción"
                />
              </div>
              <Button onClick={() => createCategoria.mutate()} disabled={createCategoria.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.descripcion || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={cat.activo ? "default" : "secondary"}>
                        {cat.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCategoria.mutate({ id: cat.id, activo: cat.activo })}
                      >
                        {cat.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {categorias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No hay categorías registradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="conceptos" className="space-y-4 mt-4">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="con-name">Nuevo Concepto</Label>
                <Input
                  id="con-name"
                  value={newConceptoName}
                  onChange={(e) => setNewConceptoName(e.target.value)}
                  placeholder="Nombre del concepto"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="con-cat">Categoría</Label>
                <Select value={newConceptoCategoriaId} onValueChange={setNewConceptoCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {categorias.filter((c: any) => c.activo).map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="con-desc">Descripción (opcional)</Label>
                <Input
                  id="con-desc"
                  value={newConceptoDesc}
                  onChange={(e) => setNewConceptoDesc(e.target.value)}
                  placeholder="Descripción"
                />
              </div>
              <Button onClick={() => createConcepto.mutate()} disabled={createConcepto.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conceptos.map((con: any) => (
                  <TableRow key={con.id}>
                    <TableCell className="font-medium">{con.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{con.categoria?.nombre || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{con.descripcion || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={con.activo ? "default" : "secondary"}>
                        {con.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleConcepto.mutate({ id: con.id, activo: con.activo })}
                      >
                        {con.activo ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {conceptos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay conceptos registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
