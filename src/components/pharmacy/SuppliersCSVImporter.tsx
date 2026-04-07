import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ImportResults {
  total: number;
  success: number;
  errors: number;
  errorDetails: string[];
}

export function SuppliersCSVImporter({ onImportComplete }: { onImportComplete?: () => void }) {
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const { toast } = useToast();

  const handleImportFromFile = async () => {
    setIsImporting(true);
    setResults(null);

    try {
      const response = await fetch('/data/proveedores.csv');
      const csvText = await response.text();
      
      const lines = csvText.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1); // Skip header
      
      let success = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const line of dataLines) {
        if (!line.trim()) continue;

        const parts = line.split(';').map(p => p.trim());
        
        if (parts.length < 5) {
          errors++;
          errorDetails.push(`Línea inválida: ${line.substring(0, 50)}...`);
          continue;
        }

        const [supplierCode, contactPerson, phone, observations, specialty] = parts;

        try {
          const { error } = await supabase
            .from('pharmacy_suppliers')
            .upsert({
              name: supplierCode || 'Sin nombre',
              contact_person: contactPerson || null,
              phone: phone || null,
              email: null,
              address: null,
              observations: observations || null,
              specialty: specialty || null,
              status: 'Activo'
            }, {
              onConflict: 'name',
              ignoreDuplicates: !replaceExisting
            });

          if (error) throw error;
          success++;
        } catch (err: any) {
          errors++;
          errorDetails.push(`Error en ${supplierCode}: ${err.message}`);
        }
      }

      setResults({
        total: dataLines.length,
        success,
        errors,
        errorDetails: errorDetails.slice(0, 10)
      });

      toast({
        title: "Importación completada",
        description: `${success} proveedores importados correctamente, ${errors} errores`,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n').filter(line => line.trim());
        const dataLines = lines.slice(1);
        
        let success = 0;
        let errors = 0;
        const errorDetails: string[] = [];

        for (const line of dataLines) {
          if (!line.trim()) continue;

          const parts = line.split(';').map(p => p.trim());
          
          if (parts.length < 5) {
            errors++;
            errorDetails.push(`Línea inválida: ${line.substring(0, 50)}...`);
            continue;
          }

          const [supplierCode, contactPerson, phone, observations, specialty] = parts;

          try {
            const { error } = await supabase
              .from('pharmacy_suppliers')
              .upsert({
                name: supplierCode || 'Sin nombre',
                contact_person: contactPerson || null,
                phone: phone || null,
                email: null,
                address: null,
                observations: observations || null,
                specialty: specialty || null,
                status: 'Activo'
              }, {
                onConflict: 'name',
                ignoreDuplicates: !replaceExisting
              });

            if (error) throw error;
            success++;
          } catch (err: any) {
            errors++;
            errorDetails.push(`Error en ${supplierCode}: ${err.message}`);
          }
        }

        setResults({
          total: dataLines.length,
          success,
          errors,
          errorDetails: errorDetails.slice(0, 10)
        });

        toast({
          title: "Importación completada",
          description: `${success} proveedores importados correctamente, ${errors} errores`,
        });

        if (onImportComplete) {
          onImportComplete();
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const downloadTemplate = () => {
    const template = "PROVEERDOR;NOMBRE;TELEFONO;OBSERVACION;ESPECIALIDAD\nEjemplo S.A.;Juan Pérez;999888777;Entrega mensual;DERMATOLOGÍA\n";
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_proveedores.csv';
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Proveedores desde CSV</CardTitle>
        <CardDescription>
          Importa proveedores desde un archivo CSV con el formato: PROVEEDOR;NOMBRE;TELEFONO;OBSERVACION;ESPECIALIDAD
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 pb-2">
          <Switch
            id="replace-existing"
            checked={replaceExisting}
            onCheckedChange={setReplaceExisting}
          />
          <Label htmlFor="replace-existing" className="cursor-pointer">
            Reemplazar existentes
          </Label>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={downloadTemplate}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar Plantilla
          </Button>
          
          <Button
            onClick={handleImportFromFile}
            disabled={isImporting}
            variant="secondary"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? 'Importando...' : 'Importar Archivo Predeterminado'}
          </Button>

          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button
                disabled={isImporting}
                variant="default"
                asChild
              >
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar Archivo CSV
                </span>
              </Button>
            </label>
          </div>
        </div>

        {results && (
          <div className="space-y-2">
            <Alert variant={results.errors > 0 ? "destructive" : "default"}>
              <div className="flex items-start gap-2">
                {results.errors > 0 ? (
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-semibold mb-1">Resultados de la Importación:</div>
                    <div>Total procesado: {results.total}</div>
                    <div className="text-green-600">Exitosos: {results.success}</div>
                    {results.errors > 0 && (
                      <>
                        <div className="text-red-600">Errores: {results.errors}</div>
                        {results.errorDetails.length > 0 && (
                          <div className="mt-2">
                            <div className="font-semibold text-sm">Detalles de errores:</div>
                            <ul className="text-xs list-disc pl-4 mt-1">
                              {results.errorDetails.map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
