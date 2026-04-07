
import React from "react";
import { PharmacyReports } from "./PharmacyReports";

export function PharmacyReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-green-700">
          Reportes y Análisis
        </h2>
        <p className="text-muted-foreground">
          Genera reportes detallados del sistema de farmacia
        </p>
      </div>
      <PharmacyReports />
    </div>
  );
}
