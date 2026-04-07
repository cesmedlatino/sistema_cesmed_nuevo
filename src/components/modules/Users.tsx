
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Users as UsersIcon, Search, Lock, Eye, EyeOff, Edit, Trash2, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PersonalMember {
  id: string;
  nombres: string;
  apellidos: string;
  documento_identidad: string;
  cargo: string;
  estado: string;
}

interface Usuario {
  id: string;
  email: string;
  rol: string;
  activo: boolean;
  personal_id: string;
  auth_user_id: string;
  personal: PersonalMember;
}

// Interfaces para la respuesta de la función RPC
interface ValidationResult {
  success: boolean;
  error?: string;
  personal_id?: string;
  email?: string;
  rol?: string;
  personal_data?: {
    nombres: string;
    apellidos: string;
    documento_identidad: string;
    cargo: string;
  };
}

// Roles predefinidos del sistema
const SYSTEM_ROLES = [
  { id: 'administrador', name: 'Administrador', description: 'Acceso completo al sistema' },
  { id: 'especialista', name: 'Especialista', description: 'Médico especialista' },
  { id: 'asistente', name: 'Asistente', description: 'Personal de apoyo' },
  { id: 'recepcionista', name: 'Recepcionista', description: 'Atención al cliente' }
];

export function UsersManagement() {
  const [personalMembers, setPersonalMembers] = useState<PersonalMember[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const { toast } = useToast();

  const [userFormData, setUserFormData] = useState({
    email: "",
    password: ""
  });

  const [editFormData, setEditFormData] = useState({
    email: "",
    rol: "",
    newPassword: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Obtener personal activo sin usuario
      const { data: personalData, error: personalError } = await supabase
        .from('personal')
        .select('*')
        .eq('estado', 'activo')
        .order('nombres');

      if (personalError) throw personalError;

      // Obtener usuarios existentes con información del personal
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuario')
        .select(`
          *,
          personal:personal_id (
            id,
            nombres,
            apellidos,
            documento_identidad,
            cargo,
            estado
          )
        `)
        .order('created_at', { ascending: false });

      if (usuariosError) throw usuariosError;

      // Filtrar personal que no tiene usuario
      const personalIds = usuariosData?.map(u => u.personal_id) || [];
      const personalSinUsuario = personalData?.filter(p => !personalIds.includes(p.id)) || [];

      setPersonalMembers(personalSinUsuario);
      setUsuarios(usuariosData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateUserData = async (email: string, personalId: string, excludeUserId?: string) => {
    // Verificar si el email ya existe (excluyendo el usuario actual en edición)
    let emailQuery = supabase.from('usuario').select('id').eq('email', email);
    if (excludeUserId) {
      emailQuery = emailQuery.neq('id', excludeUserId);
    }
    
    const { data: existingUser } = await emailQuery.single();
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Verificar si el personal ya tiene usuario (excluyendo el usuario actual en edición)
    let personalQuery = supabase.from('usuario').select('id').eq('personal_id', personalId);
    if (excludeUserId) {
      personalQuery = personalQuery.neq('id', excludeUserId);
    }
    
    const { data: existingPersonalUser } = await personalQuery.single();
    if (existingPersonalUser) {
      throw new Error('Este miembro del personal ya tiene un usuario asignado');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPersonal || !selectedRole || !userFormData.email || !userFormData.password) {
      toast({
        title: "Error",
        description: "Debe completar todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Obtener datos del personal seleccionado
      const selectedPersonalData = personalMembers.find(p => p.id === selectedPersonal);
      
      if (!selectedPersonalData) {
        throw new Error('No se encontró el personal seleccionado');
      }

      console.log('Creando usuario via Edge Function para:', selectedPersonalData.nombres);

      // Usar la Edge Function para crear el usuario con service_role
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: userFormData.email,
          password: userFormData.password,
          personal_id: selectedPersonal,
          rol: selectedRole,
          user_metadata: {
            nombres: selectedPersonalData.nombres,
            apellidos: selectedPersonalData.apellidos,
            documento_identidad: selectedPersonalData.documento_identidad,
            cargo: selectedPersonalData.cargo,
            rol: selectedRole
          }
        }
      });

      if (error) {
        console.error('Error en Edge Function:', error);
        throw new Error('Error al crear usuario: ' + error.message);
      }

      if (data?.error) {
        console.error('Error retornado por Edge Function:', data.error);
        throw new Error(data.error);
      }

      console.log('Usuario creado exitosamente:', data);

      toast({
        title: "Usuario creado",
        description: `Usuario ${userFormData.email} creado correctamente para ${selectedPersonalData.nombres} ${selectedPersonalData.apellidos}.`,
      });

      // Resetear formulario
      setUserFormData({ email: "", password: "" });
      setSelectedPersonal("");
      setSelectedRole("");
      setShowCreateUserForm(false);
      
      // Recargar datos
      fetchData();
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      let errorMessage = "No se pudo crear el usuario.";
      
      if (error.message?.includes('User already registered') || error.message?.includes('already registered')) {
        errorMessage = "Este email ya está registrado en el sistema.";
      } else if (error.message?.includes('already has a user') || error.message?.includes('ya tiene un usuario')) {
        errorMessage = "Este miembro del personal ya tiene un usuario asignado.";
      } else if (error.message?.includes('Personal no encontrado')) {
        errorMessage = "El personal seleccionado no existe.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error al crear usuario",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (usuario: Usuario) => {
    setEditingUser(usuario);
    setEditFormData({
      email: usuario.email,
      rol: usuario.rol,
      newPassword: ""
    });
    setShowEditUserForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);

    try {
      await validateUserData(editFormData.email, editingUser.personal_id, editingUser.id);

      // Actualizar datos en la tabla usuario
      const { error: dbError } = await supabase
        .from('usuario')
        .update({
          email: editFormData.email,
          rol: editFormData.rol,
        })
        .eq('id', editingUser.id);

      if (dbError) throw dbError;

      // Si hay nueva contraseña, actualizarla en Auth
      if (editFormData.newPassword && editingUser.auth_user_id) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingUser.auth_user_id,
          { 
            password: editFormData.newPassword,
            email: editFormData.email
          }
        );

        if (passwordError) {
          console.warn('Error actualizando contraseña:', passwordError);
          // No lanzar error aquí, la actualización de datos fue exitosa
        }
      }

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario se han actualizado correctamente.",
      });

      setShowEditUserForm(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (usuarioId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('usuario')
        .update({ activo: !currentStatus })
        .eq('id', usuarioId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`,
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (usuario: Usuario) => {
    try {
      // Eliminar de Auth si existe
      if (usuario.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(usuario.auth_user_id);
        if (authError) {
          console.warn('Error eliminando usuario de Auth:', authError);
        }
      }

      // Eliminar registro de la tabla usuario
      const { error: dbError } = await supabase
        .from('usuario')
        .delete()
        .eq('id', usuario.id);

      if (dbError) throw dbError;

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado completamente del sistema.",
      });

      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (usuario: Usuario) => {
    if (!usuario.auth_user_id) {
      toast({
        title: "Error",
        description: "No se puede restablecer la contraseña para este usuario.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generar contraseña temporal
      const tempPassword = 'Temp' + Math.random().toString(36).slice(-8) + '!';
      
      const { error } = await supabase.auth.admin.updateUserById(
        usuario.auth_user_id,
        { password: tempPassword }
      );

      if (error) throw error;

      toast({
        title: "Contraseña restablecida",
        description: `Nueva contraseña temporal: ${tempPassword}`,
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "No se pudo restablecer la contraseña.",
        variant: "destructive",
      });
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.personal.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.personal.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.personal.documento_identidad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && usuarios.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        </div>
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="text-center">Cargando usuarios...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        </div>
        <Button 
          onClick={() => setShowCreateUserForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={personalMembers.length === 0}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {personalMembers.length === 0 && !showCreateUserForm && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-orange-800">
              No hay personal disponible para crear usuarios. Todo el personal activo ya tiene acceso al sistema.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulario de creación */}
      {showCreateUserForm && (
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-800">Crear Nuevo Usuario</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="personal">Personal *</Label>
                <Select value={selectedPersonal} onValueChange={setSelectedPersonal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar personal" />
                  </SelectTrigger>
                  <SelectContent>
                    {personalMembers.map((personal) => (
                      <SelectItem key={personal.id} value={personal.id}>
                        {personal.nombres} {personal.apellidos} - {personal.cargo} (Doc: {personal.documento_identidad})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="role">Rol en el Sistema *</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {SYSTEM_ROLES.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                  {loading ? "Creando..." : "Crear Usuario"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateUserForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulario de edición */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editFormData.rol} onValueChange={(value) => setEditFormData({...editFormData, rol: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.newPassword}
                onChange={(e) => setEditFormData({...editFormData, newPassword: e.target.value})}
                placeholder="Dejar vacío para mantener actual"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowEditUserForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-purple-800">Usuarios del Sistema ({usuarios.length})</CardTitle>
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar usuarios..."
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Personal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.personal.nombres} {usuario.personal.apellidos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.personal.documento_identidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.personal.cargo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Badge variant="outline">
                        {SYSTEM_ROLES.find(r => r.id === usuario.rol)?.name || usuario.rol}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(usuario)}
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatus(usuario.id, usuario.activo)}
                          title={usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {usuario.activo ? <UserX className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetPassword(usuario)}
                          title="Restablecer contraseña"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará completamente el usuario del sistema, pero el personal seguirá existiendo.
                                Podrás crear un nuevo usuario para este personal más tarde. ¿Continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(usuario)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
