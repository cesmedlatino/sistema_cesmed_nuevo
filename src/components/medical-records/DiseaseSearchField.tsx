import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { X, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Enfermedad {
  id: string;
  vista_cie10: string;
  cie10_enfermedad: string;
  nombre_enfermedad: string;
}

interface DiseaseSearchFieldProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  className?: string;
}

export function DiseaseSearchField({ 
  value, 
  onChange, 
  placeholder = "Buscar enfermedad (CIE-10)...",
  multiple = false,
  className
}: DiseaseSearchFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Enfermedad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert value to array for consistent handling
  const selectedDiseases = multiple 
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : [];
  const singleValue = !multiple ? (typeof value === 'string' ? value : '') : '';

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchDiseases(searchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchDiseases = async (term: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('enfermedades')
        .select('id, vista_cie10, cie10_enfermedad, nombre_enfermedad')
        .or(`nombre_enfermedad.ilike.%${term}%,vista_cie10.ilike.%${term}%,cie10_enfermedad.ilike.%${term}%`)
        .limit(15);

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
    const displayValue = `${disease.vista_cie10} - ${disease.nombre_enfermedad}`;
    
    if (multiple) {
      if (!selectedDiseases.includes(displayValue)) {
        onChange([...selectedDiseases, displayValue]);
      }
    } else {
      onChange(displayValue);
    }
    
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const removeDisease = (diseaseToRemove: string) => {
    if (multiple) {
      onChange(selectedDiseases.filter(d => d !== diseaseToRemove));
    } else {
      onChange('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // For single value mode, also update the actual value if not searching
    if (!multiple && newValue.length < 2) {
      onChange(newValue);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected diseases for multiple mode */}
      {multiple && selectedDiseases.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedDiseases.map((disease, index) => (
            <Badge key={index} variant="secondary" className="gap-1 text-xs">
              {disease}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeDisease(disease)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={multiple ? searchTerm : (searchTerm || singleValue)}
          onChange={handleInputChange}
          onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
          className="pl-10 pr-8 bg-background"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!multiple && singleValue && !searchTerm && (
          <X 
            className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-destructive" 
            onClick={() => {
              onChange('');
              setSearchTerm('');
            }}
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg">
          <ScrollArea className="max-h-64">
            {suggestions.length > 0 ? (
              <div className="p-1">
                {suggestions.map((disease) => (
                  <div
                    key={disease.id}
                    className="p-2 hover:bg-muted cursor-pointer rounded text-sm transition-colors"
                    onClick={() => addDisease(disease)}
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 text-xs font-mono">
                        {disease.cie10_enfermedad}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm leading-tight">{disease.nombre_enfermedad}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{disease.vista_cie10}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm.length >= 2 ? (
              <div className="p-3 text-center text-muted-foreground text-sm">
                No se encontraron enfermedades
              </div>
            ) : null}
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
