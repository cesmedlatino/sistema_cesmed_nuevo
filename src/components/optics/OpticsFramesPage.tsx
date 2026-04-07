
import React from "react";
import { OpticsFramesList } from "./OpticsFramesList";

export function OpticsFramesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-700">
          Gestión de Monturas
        </h2>
        <p className="text-muted-foreground">
          Administra el catálogo completo de monturas ópticas
        </p>
      </div>
      <OpticsFramesList />
    </div>
  );
}
