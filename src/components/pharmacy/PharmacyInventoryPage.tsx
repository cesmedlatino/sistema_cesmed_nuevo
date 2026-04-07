import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PharmacyInventoryTable } from "./PharmacyInventoryTable";
import { PharmacyEntriesTable } from "./PharmacyEntriesTable";
import { PharmacyOutputsTable } from "./PharmacyOutputsTable";
import { CSVImporter } from "./CSVImporter";

export function PharmacyInventoryPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pharmacy-medications"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy-entries"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy-outputs"] });
    toast({
      title: "Actualizado",
      description: "Los datos se han actualizado correctamente.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Control de Inventario
        </h2>
        <p className="text-muted-foreground">
          Visualiza el inventario completo y registra entradas y salidas
        </p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="entries">Entradas</TabsTrigger>
          <TabsTrigger value="outputs">Salidas</TabsTrigger>
          <TabsTrigger value="import">Importar CSV</TabsTrigger>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <PharmacyInventoryTable />
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <PharmacyEntriesTable />
        </TabsContent>

        <TabsContent value="outputs" className="space-y-4">
          <PharmacyOutputsTable />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <CSVImporter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
