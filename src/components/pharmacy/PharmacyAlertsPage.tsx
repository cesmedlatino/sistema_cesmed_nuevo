import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Search } from "lucide-react";
import { usePharmacyAlerts } from "@/hooks/usePharmacyAlerts";
import { usePharmacyMedications } from "@/hooks/usePharmacyMedications";
import { Skeleton } from "@/components/ui/skeleton";
import { EditMedicationDialog } from "./EditMedicationDialog";

export const PharmacyAlertsPage = () => {
  const { data: alerts, isLoading } = usePharmacyAlerts();
  const { data: medications } = usePharmacyMedications();
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [expiringSearch, setExpiringSearch] = useState("");
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const lowStockAlerts = alerts?.filter(a => a.alert_type === 'low_stock') || [];
  const expiringAlerts = alerts?.filter(a => a.alert_type === 'near_expiry') || [];

  const filteredLowStock = lowStockAlerts.filter(alert =>
    alert.commercial_name.toLowerCase().includes(lowStockSearch.toLowerCase())
  );

  const filteredExpiring = expiringAlerts.filter(alert =>
    alert.commercial_name.toLowerCase().includes(expiringSearch.toLowerCase())
  );

  const handleAlertClick = (medicationId: string) => {
    const medication = medications?.find(m => m.id === medicationId);
    if (medication) {
      setSelectedMedication(medication);
      setIsEditDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alertas</h2>
          <p className="text-muted-foreground">
            Medicamentos que requieren atención
          </p>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Alertas</h2>
        <p className="text-muted-foreground">
          Productos que requieren atención
        </p>
      </div>

      <Tabs defaultValue="low_stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="low_stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Bajo
            <Badge variant="secondary">{filteredLowStock.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Por Vencer
            <Badge variant="secondary">{filteredExpiring.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="low_stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    Productos con Stock Bajo
                  </CardTitle>
                  <CardDescription>
                    Productos que están por debajo del nivel mínimo de stock
                  </CardDescription>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={lowStockSearch}
                  onChange={(e) => setLowStockSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredLowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {lowStockSearch ? "No se encontraron productos" : "No hay productos con stock bajo"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredLowStock.map((alert) => (
                    <div
                      key={alert.medication_id}
                      onClick={() => handleAlertClick(alert.medication_id)}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{alert.commercial_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock actual: {alert.current_stock} / Mínimo: {alert.min_stock_level}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {alert.current_stock} / {alert.min_stock_level}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Medicamentos Próximos a Vencer
                  </CardTitle>
                  <CardDescription>
                    Medicamentos que están próximos a su fecha de vencimiento
                  </CardDescription>
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={expiringSearch}
                  onChange={(e) => setExpiringSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredExpiring.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {expiringSearch ? "No se encontraron productos" : "No hay productos próximos a vencer"}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredExpiring.map((alert) => (
                    <div
                      key={alert.medication_id}
                      onClick={() => handleAlertClick(alert.medication_id)}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{alert.commercial_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Vence: {new Date(alert.expiration_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {alert.days_to_expiry} días
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditMedicationDialog
        medication={selectedMedication}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
};
