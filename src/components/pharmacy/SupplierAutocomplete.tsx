import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
}

interface SupplierAutocompleteProps {
  value: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
  placeholder?: string;
}

export function SupplierAutocomplete({ value, onChange, placeholder = "Buscar proveedor..." }: SupplierAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSuppliers([]);
      return;
    }

    const searchSuppliers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pharmacy_suppliers')
          .select('id, name, contact_person, phone')
          .ilike('name', `%${debouncedSearch}%`)
          .eq('status', 'Activo')
          .limit(20);

        if (!error && data) {
          setSuppliers(data);
        }
      } catch (error) {
        console.error('Error buscando proveedores:', error);
      } finally {
        setLoading(false);
      }
    };

    searchSuppliers();
  }, [debouncedSearch]);

  const handleSelectSupplier = (supplier: Supplier) => {
    onChange(supplier);
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
          {value ? value.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Escriba nombre del proveedor..." 
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
            ) : suppliers.length === 0 ? (
              <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
            ) : (
              <CommandGroup>
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectSupplier(supplier);
                    }}
                    onSelect={() => handleSelectSupplier(supplier)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === supplier.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{supplier.name}</span>
                      {supplier.contact_person && (
                        <span className="text-xs text-muted-foreground">
                          Contacto: {supplier.contact_person}
                        </span>
                      )}
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
