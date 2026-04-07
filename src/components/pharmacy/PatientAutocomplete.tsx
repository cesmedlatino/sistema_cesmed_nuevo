import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  patient_code: string;
}

interface PatientAutocompleteProps {
  value: Patient | null;
  onChange: (patient: Patient | null) => void;
  placeholder?: string;
}

export function PatientAutocomplete({ value, onChange, placeholder = "Buscar paciente..." }: PatientAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setPatients([]);
      return;
    }

    const searchPatients = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, dni, patient_code')
          .or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,dni.ilike.%${debouncedSearch}%`)
          .limit(20);

        if (!error && data) {
          // Deduplicar por nombre completo, mantener el registro más reciente
          const uniquePatients = data.reduce((acc: Patient[], patient) => {
            const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
            const existingIndex = acc.findIndex(p => 
              `${p.first_name} ${p.last_name}`.toLowerCase() === fullName
            );
            if (existingIndex === -1) {
              acc.push(patient);
            }
            return acc;
          }, []);
          setPatients(uniquePatients);
        }
      } catch (error) {
        console.error('Error buscando pacientes:', error);
      } finally {
        setLoading(false);
      }
    };

    searchPatients();
  }, [debouncedSearch]);

  const handleSelectPatient = (patient: Patient) => {
    onChange(patient);
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
            ? `${value.first_name} ${value.last_name} - DNI: ${value.dni}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Escriba nombre o DNI..." 
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
            ) : patients.length === 0 ? (
              <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
            ) : (
              <CommandGroup>
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectPatient(patient);
                    }}
                    onSelect={() => handleSelectPatient(patient)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{patient.first_name} {patient.last_name}</span>
                      <span className="text-xs text-muted-foreground">
                        DNI: {patient.dni} - Código: {patient.patient_code}
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
