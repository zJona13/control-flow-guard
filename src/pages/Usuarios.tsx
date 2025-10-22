import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Loader2, UserPlus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { authAPI, User } from "@/services/api";

type UserRole = "ADMIN" | "TI" | "CLINICO";

interface UserWithId extends User {
  id: string;
  activo: boolean;
  creado_en: string;
}

const Usuarios = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    nombres: "",
    apellidos: "",
    area: "" as UserRole,
  });

  const fetchUsers = async () => {
    try {
      const data = await authAPI.getUsers();
      setUsers(data as UserWithId[]);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      ADMIN: "Administrador",
      TI: "Tecnología de Información",
      CLINICO: "Personal Clínico",
    };
    return labels[role];
  };

  const getRoleVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      ADMIN: "destructive" as const,
      TI: "secondary" as const,
      CLINICO: "default" as const,
    };
    return variants[role];
  };

  const handleCreateUser = async () => {
    try {
      setCreating(true);
      
      await authAPI.register({
        email: newUser.email,
        password: newUser.password,
        nombres: newUser.nombres,
        apellidos: newUser.apellidos,
        area: newUser.area,
      });
      
      toast({
        title: "Éxito",
        description: "Usuario creado exitosamente",
        variant: "default",
      });

      setIsDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        nombres: "",
        apellidos: "",
        area: "" as UserRole,
      });
      fetchUsers(); // Recargar la lista
    } catch (error) {
      console.error("Error al crear usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: UserWithId) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setUpdating(true);
      
      await authAPI.updateUser(editingUser.id, {
        nombres: editingUser.nombres,
        apellidos: editingUser.apellidos,
        area: editingUser.area,
        activo: editingUser.activo,
      });
      
      toast({
        title: "Éxito",
        description: "Usuario actualizado exitosamente",
        variant: "default",
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers(); // Recargar la lista
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      setToggling(userId);
      
      const result = await authAPI.toggleUserStatus(userId);
      
      toast({
        title: "Éxito",
        description: result.message,
        variant: "default",
      });

      fetchUsers(); // Recargar la lista
    } catch (error) {
      console.error("Error al cambiar estado del usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del usuario",
        variant: "destructive",
      });
    } finally {
      setToggling(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administrar usuarios del sistema por rol</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Complete los datos del nuevo usuario del sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    placeholder="Nombres del usuario"
                    value={newUser.nombres}
                    onChange={(e) => setNewUser({ ...newUser, nombres: e.target.value })}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    placeholder="Apellidos del usuario"
                    value={newUser.apellidos}
                    onChange={(e) => setNewUser({ ...newUser, apellidos: e.target.value })}
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@essalud.gob.pe"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Rol</Label>
                <Select
                  value={newUser.area}
                  onValueChange={(value) => setNewUser({ ...newUser, area: value as UserRole })}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TI">Tecnología de Información</SelectItem>
                    <SelectItem value="CLINICO">Personal Clínico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Usuario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No se encontraron usuarios</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-primary">
                        {user.nombres} {user.apellidos}
                      </CardTitle>
                      <Badge variant={getRoleVariant(user.area)}>
                        {getRoleLabel(user.area)}
                      </Badge>
                      {!user.activo && (
                        <Badge variant="outline">Inactivo</Badge>
                      )}
                    </div>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                    <p className="text-sm text-foreground">
                      {new Date(user.creado_en).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm text-foreground">
                      {user.activo ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rol</p>
                    <p className="text-sm text-foreground">{getRoleLabel(user.area)}</p>
                  </div>
                </div>
                
                {/* Botones de acción */}
                <div className="mt-4 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleEditUser(user)}
                    disabled={updating}
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => handleToggleUserStatus(user.id)}
                    disabled={toggling === user.id}
                  >
                    {toggling === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {user.activo ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición de usuario */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique los datos del usuario</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nombres">Nombres</Label>
                  <Input
                    id="edit-nombres"
                    placeholder="Nombres del usuario"
                    value={editingUser.nombres}
                    onChange={(e) => setEditingUser({ ...editingUser, nombres: e.target.value })}
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-apellidos">Apellidos</Label>
                  <Input
                    id="edit-apellidos"
                    placeholder="Apellidos del usuario"
                    value={editingUser.apellidos}
                    onChange={(e) => setEditingUser({ ...editingUser, apellidos: e.target.value })}
                    disabled={updating}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-area">Rol</Label>
                <Select
                  value={editingUser.area}
                  onValueChange={(value) => setEditingUser({ ...editingUser, area: value as UserRole })}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TI">Tecnología de Información</SelectItem>
                    <SelectItem value="CLINICO">Personal Clínico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activo">Estado</Label>
                <Select
                  value={editingUser.activo ? "activo" : "inactivo"}
                  onValueChange={(value) => setEditingUser({ ...editingUser, activo: value === "activo" })}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  disabled={updating}
                  className="gap-2"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Edit className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
