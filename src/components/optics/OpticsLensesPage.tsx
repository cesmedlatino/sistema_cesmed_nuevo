
import React from "react";
import { OpticsLensesList } from "./OpticsLensesList";

export function OpticsLensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-700">
          Gestión de Lunas
        </h2>
        <p className="text-muted-foreground">
          Administra el inventario completo de lunas y lentes ópticos
        </p>
      </div>
      <OpticsLensesList />
    </div>
  );
}
