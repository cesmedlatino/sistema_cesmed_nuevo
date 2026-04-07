
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Plus, Edit, Trash2, Save, X, Upload } from "lucide-react";
import { useSpecialists } from "@/hooks/useSpecialists";
import { useMedicalSpecialties } from "@/hooks/useMedicalSpecialties";

export function Specialists() {
  const { data: specialists, loading, fetchData, createRecord, updateRecord, deleteRecord } = useSpecialists();
  const { data: specialties, fetchData: fetchSpecialties } = useMedicalSpecialties();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    license_number: "",
    professional_title: "",
    study_summary: "",
    years_of_experience: 0,
    status: "Activo",
    email: "",
    phone: "",
    specialty_id: "",
    photo_url: ""
  });

  const statusOptions = ["Activo", "Inactivo", "De Licencia"];

  useEffect(() => {
    fetchData();
    fetchSpecialties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSpecialist) {
        await updateRecord(editingSpecialist.id, formData);
      } else {
        await createRecord(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving specialist:', error);
    }
  };

  const handleEdit = (specialist: any) => {
    setEditingSpecialist(specialist);
    setFormData({
      first_name: specialist.first_name || "",
      last_name: specialist.last_name || "",
      dni: specialist.dni || "",
      license_number: specialist.license_number || "",
      professional_title: specialist.professional_title || "",
      study_summary: specialist.study_summary || "",
      years_of_experience: specialist.years_of_experience || 0,
      status: specialist.status || "Activo",
      email: specialist.email || "",
      phone: specialist.phone || "",
      specialty_id: specialist.specialty_id || "",
      photo_url: specialist.photo_url || ""
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
    } catch (error) {
      console.error('Error deleting specialist:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      dni: "",
      license_number: "",
      professional_title: "",
      study_summary: "",
      years_of_experience: 0,
      status: "Activo",
      email: "",
      phone: "",
      specialty_id: "",
      photo_url: ""
    });
    setIsEditing(false);
    setEditingSpecialist(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCheck className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Especialistas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {isEditing ? "Editar Especialista" : "Registrar Nuevo Especialista"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nombres</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Nombres del especialista"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">Apellidos</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Apellidos del especialista"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                      placeholder="Número de DNI"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="license_number">Número de Colegiatura</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                      placeholder="Ej: CMP-12345"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="professional_title">Título Profesional</Label>
                    <Input
                      id="professional_title"
                      value={formData.professional_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, professional_title: e.target.value }))}
                      placeholder="Ej: Médico Oftalmólogo"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="years_of_experience">Años de Experiencia</Label>
                    <Input
                      id="years_of_experience"
                      type="number"
                      min="0"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData(prev => ({ ...prev, years_of_experience: parseInt(e.target.value) || 0 }))}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="especialista@clinica.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Celular</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="987654321"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label>Especialidad Médica</Label>
                    <Select 
                      value={formData.specialty_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, specialty_id: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar especialidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((specialty) => (
                          <SelectItem key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>

                <div>
                  <Label htmlFor="study_summary">Reseña de Estudios</Label>
                  <Textarea
                    id="study_summary"
                    value={formData.study_summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, study_summary: e.target.value }))}
                    placeholder="Universidades, especializaciones, hospitales de práctica, etc."
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="photo">Fotografía del Especialista</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setFormData(prev => ({ ...prev, photo_url: url }));
                        }
                      }}
                      disabled={loading}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={loading}>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </Button>
                  </div>
                  {formData.photo_url && (
                    <div className="mt-2">
                      <img src={formData.photo_url} alt="Vista previa" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
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
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Especialistas Registrados ({specialists.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando especialistas...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {specialists.map((specialist) => (
                    <div key={specialist.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {specialist.photo_url && (
                            <img 
                              src={specialist.photo_url} 
                              alt={`${specialist.first_name} ${specialist.last_name}`}
                              className="w-12 h-12 object-cover rounded-full"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold">
                              {specialist.first_name} {specialist.last_name}
                            </h3>
                            <p className="text-sm text-gray-600">{specialist.professional_title}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(specialist)} disabled={loading}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(specialist.id)} disabled={loading}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <p><strong>Código:</strong> {specialist.specialist_code}</p>
                        <p><strong>Colegiatura:</strong> {specialist.license_number}</p>
                        <p><strong>Experiencia:</strong> {specialist.years_of_experience} años</p>
                        <p><strong>Estado:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${
                            specialist.status === 'Activo' ? 'bg-green-100 text-green-800' :
                            specialist.status === 'Inactivo' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {specialist.status}
                          </span>
                        </p>
                        {specialist.email && <p><strong>Email:</strong> {specialist.email}</p>}
                        {specialist.phone && <p><strong>Celular:</strong> {specialist.phone}</p>}
                        <p><strong>Especialidad:</strong> {(specialist as any).specialty?.name || 'No asignada'}</p>
                      </div>
                    </div>
                  ))}
                  {specialists.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No hay especialistas registrados aún. Registre el primer especialista arriba.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
