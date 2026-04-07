import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Users, Search, Edit, Trash2, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PersonalMember {
  id: string;
  nombres: string;
  apellidos: string;
  documento_identidad: string;
  cargo: string;
  fecha_nacimiento?: string;
  sexo?: string;
  fecha_ingreso: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface Usuario {
  id: string;
  email: string;
  rol: string;
  activo: boolean;
  personal_id: string;
  auth_user_id: string;
}

export function Staff() {
  const [personalMembers, setPersonalMembers] = useState<PersonalMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<PersonalMember | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingPersonal, setDeletingPersonal] = useState<PersonalMember | null>(null);
  const [personalUser, setPersonalUser] = useState<Usuario | null>(null);
  const [showUserDeleteDialog, setShowUserDeleteDialog] = useState(false);
  const [showPersonalDeleteDialog, setShowPersonalDeleteDialog] = useState(false);
  const { toast } = useToast();

  const [personalFormData, setPersonalFormData] = useState({
    nombres: "",
    apellidos: "",
    documento_identidad: "",
    cargo: "",
    fecha_nacimiento: "",
    sexo: "",
    estado: "activo"
  });

  useEffect(() => {
    fetchPersonal();
  }, []);

  const fetchPersonal = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPersonalMembers(data || []);
    } catch (error) {
      console.error('Error fetching personal:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el personal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingPersonal) {
        const { error } = await supabase
          .from('personal')
          .update({
            ...personalFormData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPersonal.id);

        if (error) throw error;
        toast({
          title: "Personal actualizado",
          description: "La información del personal se ha actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('personal')
          .insert({
            ...personalFormData,
            fecha_ingreso: new Date().toISOString().split('T')[0]
          });

        if (error) throw error;
        toast({
          title: "Personal agregado",
          description: "El nuevo miembro del personal se ha agregado correctamente.",
        });
      }

      resetPersonalForm();
      fetchPersonal();
    } catch (error: any) {
      console.error('Error saving personal:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la información del personal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPersonalForm = () => {
    setPersonalFormData({
      nombres: "",
      apellidos: "",
      documento_identidad: "",
      cargo: "",
      fecha_nacimiento: "",
      sexo: "",
      estado: "activo"
    });
    setEditingPersonal(null);
    setShowForm(false);
  };

  const handleEditPersonal = (personal: PersonalMember) => {
    setPersonalFormData({
      nombres: personal.nombres,
      apellidos: personal.apellidos,
      documento_identidad: personal.documento_identidad,
      cargo: personal.cargo,
      fecha_nacimiento: personal.fecha_nacimiento || "",
      sexo: personal.sexo || "",
      estado: personal.estado
    });
    setEditingPersonal(personal);
    setShowForm(true);
  };

  const handleDeactivatePersonal = async (personal: PersonalMember) => {
    try {
      const newEstado = personal.estado === 'activo' ? 'inactivo' : 'activo';
      
      const { error } = await supabase
        .from('personal')
        .update({ 
          estado: newEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', personal.id);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Personal ${newEstado === 'activo' ? 'activado' : 'desactivado'} correctamente.`,
      });

      fetchPersonal();
    } catch (error: any) {
      console.error('Error updating personal status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del personal.",
        variant: "destructive",
      });
    }
  };

  const checkPersonalUser = async (personal: PersonalMember) => {
    try {
      const { data: usuario, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('personal_id', personal.id)
        .maybeSingle();

      if (error) throw error;

      setDeletingPersonal(personal);
      setPersonalUser(usuario);

      if (usuario) {
        setShowUserDeleteDialog(true);
      } else {
        setShowPersonalDeleteDialog(true);
      }
    } catch (error: any) {
      console.error('Error checking personal user:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar la información del personal.",
        variant: "destructive",
      });
    }
  };

  const deletePersonalUser = async () => {
    if (!personalUser) return;

    try {
      // Eliminar de Auth si existe
      if (personalUser.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(personalUser.auth_user_id);
        if (authError) {
          console.warn('Error eliminando usuario de Auth:', authError);
        }
      }

      // Eliminar registro de la tabla usuario
      const { error: dbError } = await supabase
        .from('usuario')
        .delete()
        .eq('id', personalUser.id);

      if (dbError) throw dbError;

      toast({
        title: "Usuario eliminado",
        description: `Usuario ${personalUser.email} eliminado correctamente.`,
      });

      setShowUserDeleteDialog(false);
      setShowPersonalDeleteDialog(true);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    }
  };

  const deletePersonal = async () => {
    if (!deletingPersonal) return;

    try {
      const { error } = await supabase
        .from('personal')
        .delete()
        .eq('id', deletingPersonal.id);

      if (error) throw error;

      toast({
        title: "Personal eliminado",
        description: `${deletingPersonal.nombres} ${deletingPersonal.apellidos} ha sido eliminado del sistema.`,
      });

      setShowPersonalDeleteDialog(false);
      setDeletingPersonal(null);
      setPersonalUser(null);
      fetchPersonal();
    } catch (error: any) {
      console.error('Error deleting personal:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el personal.",
        variant: "destructive",
      });
    }
  };

  const filteredPersonal = personalMembers.filter(personal =>
    personal.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    personal.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    personal.documento_identidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    personal.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && personalMembers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
        </div>
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">Cargando personal...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
        </div>
        <Button 
          onClick={() => {
            resetPersonalForm();
            setShowForm(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Agregar Personal
        </Button>
      </div>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-800">
              {editingPersonal ? "Editar Personal" : "Agregar Nuevo Personal"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handlePersonalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  value={personalFormData.nombres}
                  onChange={(e) => setPersonalFormData({...personalFormData, nombres: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={personalFormData.apellidos}
                  onChange={(e) => setPersonalFormData({...personalFormData, apellidos: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="documento_identidad">Documento de Identidad *</Label>
                <Input
                  id="documento_identidad"
                  value={personalFormData.documento_identidad}
                  onChange={(e) => setPersonalFormData({...personalFormData, documento_identidad: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cargo">Cargo *</Label>
                <Select value={personalFormData.cargo} onValueChange={(value) => setPersonalFormData({...personalFormData, cargo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Médico">Médico</SelectItem>
                    <SelectItem value="Enfermera">Enfermera</SelectItem>
                    <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Recepcionista">Recepcionista</SelectItem>
                    <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                    <SelectItem value="Seguridad">Seguridad</SelectItem>
                    <SelectItem value="Limpieza">Limpieza</SelectItem>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={personalFormData.fecha_nacimiento}
                  onChange={(e) => setPersonalFormData({...personalFormData, fecha_nacimiento: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={personalFormData.sexo} onValueChange={(value) => setPersonalFormData({...personalFormData, sexo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select value={personalFormData.estado} onValueChange={(value) => setPersonalFormData({...personalFormData, estado: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="licencia">De Licencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                  {loading ? "Guardando..." : editingPersonal ? "Actualizar" : "Agregar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetPersonalForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-800">Lista de Personal ({personalMembers.length})</CardTitle>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPersonal.map((personal) => (
                  <tr key={personal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {personal.documento_identidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {personal.nombres} {personal.apellidos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {personal.cargo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {personal.sexo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={personal.estado === 'activo' ? 'default' : 'secondary'}>
                        {personal.estado}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPersonal(personal)}
                          title="Editar personal"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivatePersonal(personal)}
                          title={personal.estado === 'activo' ? 'Desactivar personal' : 'Activar personal'}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => checkPersonalUser(personal)}
                          title="Eliminar personal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para confirmar eliminación de usuario */}
      <AlertDialog open={showUserDeleteDialog} onOpenChange={setShowUserDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuario asociado encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              El personal {deletingPersonal?.nombres} {deletingPersonal?.apellidos} tiene un usuario del sistema asociado ({personalUser?.email}).
              Para evitar inconsistencias, es necesario eliminar primero el usuario.
              <br /><br />
              ¿Desea eliminar el usuario <strong>{personalUser?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUserDeleteDialog(false);
              setDeletingPersonal(null);
              setPersonalUser(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePersonalUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para confirmar eliminación de personal */}
      <AlertDialog open={showPersonalDeleteDialog} onOpenChange={setShowPersonalDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación de personal</AlertDialogTitle>
            <AlertDialogDescription>
              {personalUser ? (
                <>
                  Usuario <strong>{personalUser.email}</strong> eliminado correctamente.
                  <br /><br />
                  ¿Desea eliminar también el personal <strong>{deletingPersonal?.nombres} {deletingPersonal?.apellidos}</strong>?
                  <br />
                  Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  ¿Está seguro que desea eliminar el personal <strong>{deletingPersonal?.nombres} {deletingPersonal?.apellidos}</strong>?
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowPersonalDeleteDialog(false);
              setDeletingPersonal(null);
              setPersonalUser(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePersonal}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, eliminar personal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
