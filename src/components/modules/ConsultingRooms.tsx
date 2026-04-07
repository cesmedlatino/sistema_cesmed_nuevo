
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useConsultingRooms, useCreateConsultingRoom, useUpdateConsultingRoom, useDeleteConsultingRoom } from "@/hooks/useConsultingRooms";

export function ConsultingRooms() {
  const { data: consultingRooms = [], isLoading: loading } = useConsultingRooms();
  const createMutation = useCreateConsultingRoom();
  const updateMutation = useUpdateConsultingRoom();
  const deleteMutation = useDeleteConsultingRoom();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    floor: "",
    capacity: 1,
    status: "Disponible",
    equipment: [] as string[]
  });

  // Mock data for dropdowns
  const equipmentOptions = ["Computadora", "Camilla", "Escritorio", "Silla", "Lámpara"];
  const statusOptions = ["Disponible", "Ocupado", "Mantenimiento"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoom) {
        await updateMutation.mutateAsync({ id: editingRoom.id, updates: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving consulting room:', error);
    }
  };

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setFormData({
      name: room.name || "",
      floor: room.floor || "",
      capacity: room.capacity || 1,
      status: room.status || "Disponible",
      equipment: room.equipment || []
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting consulting room:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      floor: "",
      capacity: 1,
      status: "Disponible",
      equipment: []
    });
    setIsEditing(false);
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Home className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Consultorios</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {isEditing ? "Editar Consultorio" : "Registrar Nuevo Consultorio"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Consultorio</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Consultorio A"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="floor">Piso/Ubicación</Label>
                <Input
                  id="floor"
                  value={formData.floor}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                  placeholder="Ej: Primer Piso - Ala Norte"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacidad de Atención</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label>Estado</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Actualizar" : "Registrar"}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultorios Registrados ({consultingRooms.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando consultorios...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultingRooms.map((room) => (
                  <div key={room.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{room.name}</h3>
                        <p className="text-sm text-gray-600">ID: {room.id}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(room)} disabled={loading}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(room.id)} disabled={loading}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>Piso/Ubicación:</strong> {room.floor || 'No especificado'}</p>
                      <p><strong>Capacidad:</strong> {room.capacity} paciente(s)</p>
                      <p><strong>Estado:</strong> {room.status}</p>
                      {room.equipment && room.equipment.length > 0 && (
                        <p><strong>Equipamiento:</strong> {room.equipment.join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))}
                {consultingRooms.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay consultorios registrados aún. Registre su primer consultorio arriba.
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
