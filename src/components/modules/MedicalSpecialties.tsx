
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope, Plus, Edit, Trash2, Save } from "lucide-react";
import { useMedicalSpecialties } from "@/hooks/useMedicalSpecialties";

export function MedicalSpecialties() {
  const { data: specialties, loading, fetchData, createRecord, updateRecord, deleteRecord } = useMedicalSpecialties();
  const [newSpecialty, setNewSpecialty] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const addSpecialty = async () => {
    if (newSpecialty.trim()) {
      try {
        await createRecord({
          name: newSpecialty.trim(),
          description: newSpecialty.trim()
        });
        setNewSpecialty("");
      } catch (error) {
        console.error('Error adding specialty:', error);
      }
    }
  };

  const startEdit = (specialty: any) => {
    setEditingId(specialty.id);
    setEditingDescription(specialty.name || specialty.description || '');
  };

  const saveEdit = async () => {
    if (editingDescription.trim() && editingId) {
      try {
        await updateRecord(editingId, {
          name: editingDescription.trim(),
          description: editingDescription.trim()
        });
        setEditingId(null);
        setEditingDescription("");
      } catch (error) {
        console.error('Error updating specialty:', error);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDescription("");
  };

  const removeSpecialty = async (id: string) => {
    try {
      await deleteRecord(id);
    } catch (error) {
      console.error('Error removing specialty:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Especialidades Médicas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Specialty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nueva Especialidad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newSpecialty">Descripción de la Especialidad</Label>
              <Input
                id="newSpecialty"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="ej. Cardiología, Neurología"
                onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                disabled={loading}
              />
            </div>
            <Button 
              onClick={addSpecialty} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Especialidad
            </Button>
          </CardContent>
        </Card>

        {/* Current Specialties */}
        <Card>
          <CardHeader>
            <CardTitle>Especialidades Actuales ({specialties.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando especialidades...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {specialties.map((specialty) => (
                  <div key={specialty.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      {editingId === specialty.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                            disabled={loading}
                          />
                          <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700" disabled={loading}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={loading}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-500">ID: {specialty.id}</span>
                            <p className="font-medium">{specialty.name || specialty.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(specialty)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeSpecialty(specialty.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {specialties.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay especialidades agregadas aún. Agregue su primera especialidad arriba.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
