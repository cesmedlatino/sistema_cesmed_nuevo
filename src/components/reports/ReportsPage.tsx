import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeReport } from "./IncomeReport";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("ingresos");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-purple-700">
          Reportes
        </h1>
        <p className="text-muted-foreground">
          Centro de reportes y análisis del sistema integral
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="ingresos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Caja
          </TabsTrigger>
          <TabsTrigger value="estadisticas" className="flex items-center gap-2" disabled>
            <TrendingUp className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="analisis" className="flex items-center gap-2" disabled>
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingresos" className="mt-6">
          <IncomeReport />
        </TabsContent>

        <TabsContent value="estadisticas" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Próximamente: Estadísticas detalladas
          </div>
        </TabsContent>

        <TabsContent value="analisis" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Próximamente: Análisis avanzado
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
