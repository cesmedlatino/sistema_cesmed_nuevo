import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { loadEnfermedadesFromCSV } from "@/scripts/loadEnfermedades";

export default function LoadEnfermedades() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    count?: number;
    error?: any;
  } | null>(null);

  const handleLoad = async () => {
    setLoading(true);
    setResult(null);
    
    const loadResult = await loadEnfermedadesFromCSV();
    setResult(loadResult);
    setLoading(false);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Cargar Enfermedades CIE-10</CardTitle>
          <CardDescription>
            Esta herramienta carga las enfermedades desde el archivo CSV oficial al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Esta operación eliminará todas las enfermedades actuales y las reemplazará con los datos del CSV.
              El proceso puede tomar varios minutos.
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={handleLoad}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Cargando enfermedades..." : "Cargar Enfermedades desde CSV"}
          </Button>
          
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.success
                  ? `Se cargaron exitosamente ${result.count} enfermedades`
                  : `Error al cargar enfermedades: ${result.error?.message || "Error desconocido"}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
