import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { useCreateCatalogoItem } from "@/hooks/useCatalogoGeneral";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUIRED_HEADERS = ["Código", "Catálogo", "Nombre", "Clasificación", "Marca", "Stock"];
const ALL_HEADERS = ["Código", "Catálogo", "Nombre", "Clasificación", "Marca", "Modelo", "Serie", "Precio de Venta", "Stock", "Ubicación", "Observación"];

interface ParsedRow {
  codigo: string;
  catalogo: string;
  nombre: string;
  clasificacion: string;
  marca: string;
  modelo: string;
  serie: string;
  precio_venta: number;
  stock_actual: number;
  ubicacion: string;
  observacion: string;
  valid: boolean;
  errors: string[];
}

export function CatalogoGeneralImportDialog({ open, onOpenChange }: Props) {
  const [pastedData, setPastedData] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const createItem = useCreateCatalogoItem();
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([ALL_HEADERS]);
    // Mark required columns with styling comment
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Catalogo_General.xlsx");
  };

  const normalizeCatalogo = (value: string): string => {
    const lower = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes("farmacia")) return "Farmacia";
    if (lower.includes("inventario") && lower.includes("general")) return "Inventario General";
    if (lower.includes("catalogo") && lower.includes("general")) return "Inventario General";
    return value;
  };

  const validateRow = (row: any): ParsedRow => {
    const errors: string[] = [];
    const codigo = String(row["Código"] || "").trim();
    const rawCatalogo = String(row["Catálogo"] || row["Catalogo"] || "").trim();
    const catalogo = normalizeCatalogo(rawCatalogo);
    const nombre = String(row["Nombre"] || "").trim();
    const clasificacion = String(row["Clasificación"] || row["Clasificacion"] || "").trim();
    const marca = String(row["Marca"] || "").trim();
    const stock = parseInt(row["Stock"]) || 0;

    if (!codigo) errors.push("Código requerido");
    if (!catalogo || !["Farmacia", "Inventario General"].includes(catalogo)) errors.push("Catálogo inválido");
    if (!nombre) errors.push("Nombre requerido");
    if (!clasificacion) errors.push("Clasificación requerida");
    if (!marca) errors.push("Marca requerida");

    return {
      codigo,
      catalogo,
      nombre,
      clasificacion,
      marca,
      modelo: String(row["Modelo"] || "").trim(),
      serie: String(row["Serie"] || "").trim(),
      precio_venta: parseFloat(row["Precio de Venta"] || row["Precio de venta"] || "0") || 0,
      stock_actual: stock,
      ubicacion: String(row["Ubicación"] || row["Ubicacion"] || "").trim(),
      observacion: String(row["Observación"] || row["Observacion"] || "").trim(),
      valid: errors.length === 0,
      errors,
    };
  };

  const handlePaste = useCallback((text: string) => {
    setPastedData(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split("\t").map(h => h.trim());
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || "";
      });
      rows.push(validateRow(rowObj));
    }

    setParsedRows(rows);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const rows = data.map((row: any) => validateRow(row));
      setParsedRows(rows);
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        await createItem.mutateAsync({
          codigo: row.codigo,
          catalogo: row.catalogo,
          nombre: row.nombre,
          clasificacion: row.clasificacion || undefined,
          marca: row.marca || undefined,
          modelo: row.modelo || undefined,
          serie: row.serie || undefined,
          precio_venta: row.precio_venta,
          stock_actual: row.stock_actual,
          ubicacion: row.ubicacion || undefined,
          observacion: row.observacion || undefined,
          status: "Activo",
        });
        success++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    toast({
      title: "Importación completada",
      description: `${success} productos importados${failed > 0 ? `, ${failed} con error` : ""}.`,
    });
    if (success > 0) {
      onOpenChange(false);
      setParsedRows([]);
      setPastedData("");
    }
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Productos al Catálogo General</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descargar Plantilla XLS
            </Button>
            <div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Archivo
                </label>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              O pega los datos con encabezados (copiados desde Excel). Columnas obligatorias: {REQUIRED_HEADERS.join(", ")}
            </p>
            <Textarea
              placeholder="Pega aquí los datos copiados desde Excel (con encabezados)..."
              value={pastedData}
              onChange={(e) => handlePaste(e.target.value)}
              rows={4}
            />
          </div>

          {parsedRows.length > 0 && (
            <>
              <div className="flex gap-2 items-center">
                {validCount > 0 && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {validCount} válidos
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {invalidCount} con errores
                  </Badge>
                )}
              </div>

              <div className="max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Código</TableHead>
                      <TableHead className="text-xs">Catálogo</TableHead>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Clasificación</TableHead>
                      <TableHead className="text-xs">Marca</TableHead>
                      <TableHead className="text-xs">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx} className={row.valid ? "" : "bg-red-50"}>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-xs text-red-500">{row.errors.join(", ")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{row.codigo}</TableCell>
                        <TableCell className="text-xs">{row.catalogo}</TableCell>
                        <TableCell className="text-xs">{row.nombre}</TableCell>
                        <TableCell className="text-xs">{row.clasificacion}</TableCell>
                        <TableCell className="text-xs">{row.marca}</TableCell>
                        <TableCell className="text-xs">{row.stock_actual}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setParsedRows([]); setPastedData(""); }}>
                  Limpiar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || importing}
                >
                  {importing ? "Importando..." : `Importar ${validCount} producto(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
