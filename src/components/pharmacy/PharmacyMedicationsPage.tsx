
import React from "react";
import { PharmacyMedicationsList } from "./PharmacyMedicationsList";

export function PharmacyMedicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Gestión de Productos
        </h2>
        <p className="text-muted-foreground">
          Administra el catálogo completo de productos
        </p>
      </div>
      <PharmacyMedicationsList />
    </div>
  );
}
