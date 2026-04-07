
import React from "react";
import { OpticsInventoryMovements } from "./OpticsInventoryMovements";

export function OpticsInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-700">
          Control de Inventario
        </h2>
        <p className="text-muted-foreground">
          Registra y controla todos los movimientos de inventario óptico
        </p>
      </div>
      <OpticsInventoryMovements />
    </div>
  );
}
