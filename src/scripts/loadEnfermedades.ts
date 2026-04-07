import { supabase } from "@/integrations/supabase/client";

export async function loadEnfermedadesFromCSV() {
  try {
    // Fetch the CSV file
    const response = await fetch('/data/enfermedades.csv');
    const csvText = await response.text();
    
    // Parse CSV (skip header, split by lines)
    const lines = csvText.split('\n').slice(1); // Skip header
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 500;
    const enfermedades: Array<{
      cie10_clase: string;
      clase: string;
      cie10_enfermedad: string;
      nombre_enfermedad: string;
      vista_cie10: string;
    }> = [];
    
    for (const line of lines) {
      if (!line.trim()) continue; // Skip empty lines
      
      // Split by semicolon
      const parts = line.split(';');
      if (parts.length < 4) continue; // Skip invalid lines
      
      const [cie10_clase, clase, cie10_enfermedad, nombre_enfermedad] = parts;
      
      enfermedades.push({
        cie10_clase: cie10_clase.trim(),
        clase: clase.trim(),
        cie10_enfermedad: cie10_enfermedad.trim(),
        nombre_enfermedad: nombre_enfermedad.trim(),
        vista_cie10: `${cie10_clase.trim()} - ${clase.trim()}`
      });
    }
    
    console.log(`Parsed ${enfermedades.length} enfermedades from CSV`);
    
    // First, truncate the table
    const { error: deleteError } = await supabase
      .from('enfermedades')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Error deleting existing enfermedades:', deleteError);
      throw deleteError;
    }
    
    // Insert in batches
    let insertedCount = 0;
    for (let i = 0; i < enfermedades.length; i += batchSize) {
      const batch = enfermedades.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('enfermedades')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        throw insertError;
      }
      
      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount} / ${enfermedades.length} enfermedades`);
    }
    
    console.log(`Successfully loaded ${insertedCount} enfermedades`);
    return { success: true, count: insertedCount };
    
  } catch (error) {
    console.error('Error loading enfermedades:', error);
    return { success: false, error };
  }
}
