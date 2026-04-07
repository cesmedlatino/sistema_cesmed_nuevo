import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Medication {
  id: string;
  codigo: string;
  descripcion: string;
  precio_venta?: number;
  stock_actual: number;
  presentation: string;
}

interface MedicationAutocompleteProps {
  value: Medication | null;
  onChange: (medication: Medication | null) => void;
  placeholder?: string;
  formulaMagistralOnly?: boolean;
}

export function MedicationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Buscar producto...",
  formulaMagistralOnly = false
}: MedicationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setMedications([]);
      return;
    }

    const searchMedications = async () => {
      setLoading(true);
      try {
        const searchTerm = debouncedSearch.trim();
        let query = supabase
          .from('pharmacy_medications')
          .select('id, codigo, descripcion, precio_venta, stock_actual, presentation')
          .eq('status', 'Activo');

        if (formulaMagistralOnly) {
          query = query.eq('formula_magistral', true);
        }

        // Búsqueda mejorada: busca por código y descripción (coincidencia parcial, sin distinción de mayúsculas)
        const { data, error } = await query
          .or(`codigo.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%`)
          .order('codigo', { ascending: true })
          .limit(50);

        if (!error && data) {
          setMedications(data);
        } else if (error) {
          console.error('Error en query:', error);
          setMedications([]);
        }
      } catch (error) {
        console.error('Error buscando productos:', error);
        setMedications([]);
      } finally {
        setLoading(false);
      }
    };

    searchMedications();
  }, [debouncedSearch, formulaMagistralOnly]);

  const handleSelectMedication = (medication: Medication) => {
    onChange(medication);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {value
            ? `${value.codigo} - ${value.descripcion}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Escriba código o nombre del producto..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : search.length < 2 ? (
              <CommandEmpty>Escriba al menos 2 caracteres para buscar.</CommandEmpty>
            ) : medications.length === 0 ? (
              <CommandEmpty>No se encontraron productos.</CommandEmpty>
            ) : (
              <CommandGroup>
                {medications.map((medication) => (
                  <CommandItem
                    key={medication.id}
                    value={medication.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectMedication(medication);
                    }}
                    onSelect={() => handleSelectMedication(medication)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === medication.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{medication.codigo} - {medication.descripcion}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Stock: {medication.stock_actual}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {medication.presentation} - S/. {medication.precio_venta?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
