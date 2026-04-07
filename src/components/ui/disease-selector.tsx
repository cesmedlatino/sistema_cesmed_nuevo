
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Enfermedad {
  id: string;
  vista_cie10: string;
  cie10_enfermedad: string;
  nombre_enfermedad: string;
}

interface DiseaseSelectorProps {
  selectedDiseases: string[];
  onDiseasesChange: (diseases: string[]) => void;
  placeholder?: string;
  allowFreeText?: boolean;
}

export function DiseaseSelector({ selectedDiseases, onDiseasesChange, placeholder, allowFreeText = false }: DiseaseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [diseases, setDiseases] = useState<Enfermedad[]>([]);
  const [suggestions, setSuggestions] = useState<Enfermedad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!allowFreeText && searchTerm.length >= 2) {
      searchDiseases(searchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, allowFreeText]);

  const searchDiseases = async (term: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('enfermedades')
        .select('id, vista_cie10, cie10_enfermedad, nombre_enfermedad')
        .or(`nombre_enfermedad.ilike.%${term}%,vista_cie10.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching diseases:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addDisease = (disease: Enfermedad) => {
    if (!selectedDiseases.includes(disease.vista_cie10)) {
      onDiseasesChange([...selectedDiseases, disease.vista_cie10]);
    }
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const removeDisease = (diseaseToRemove: string) => {
    onDiseasesChange(selectedDiseases.filter(disease => disease !== diseaseToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allowFreeText && e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      if (!selectedDiseases.includes(searchTerm.trim())) {
        onDiseasesChange([...selectedDiseases, searchTerm.trim()]);
      }
      setSearchTerm("");
    }
  };

  return (
    <div className="space-y-2">
      <Label>Enfermedades Crónicas</Label>
      
      {/* Selected diseases */}
      {selectedDiseases.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedDiseases.map((disease, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {disease}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => removeDisease(disease)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder={allowFreeText ? "Escribe y presiona Enter para agregar..." : (placeholder || "Buscar enfermedades (ej: C100, tumor maligno...)")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => !allowFreeText && searchTerm.length >= 2 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>

        {/* Suggestions dropdown */}
        {!allowFreeText && showSuggestions && (
          <Card className="absolute z-50 w-full mt-1 border bg-white shadow-lg">
            <ScrollArea className="max-h-60">
              {isLoading ? (
                <div className="p-3 text-center text-gray-500">Buscando...</div>
              ) : suggestions.length > 0 ? (
                <div className="p-1">
                  {suggestions.map((disease) => (
                    <div
                      key={disease.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                      onClick={() => addDisease(disease)}
                    >
                      <div className="font-medium">{disease.nombre_enfermedad}</div>
                      <div className="text-xs text-gray-500">{disease.vista_cie10}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-gray-500">
                  No se encontraron enfermedades
                </div>
              )}
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}
