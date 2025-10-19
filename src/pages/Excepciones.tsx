import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, AlertCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ExceptionStatus = "open" | "in_progress" | "closed";
type ExceptionCategory = "backup_failure" | "inappropriate_access" | "config_error" | "policy_violation" | "network_issue";

interface Exception {
  id: string;
  description: string;
  category: ExceptionCategory;
  status: ExceptionStatus;
  responsible: string;
  dueDate: string;
  createdDate: string;
  actions: string;
}

const Excepciones = () => {
  const [exceptions, setExceptions] = useState<Exception[]>([
    {
      id: "EXC-001",
      description: "Falla en backup diario de base de datos principal",
      category: "backup_failure",
      status: "open",
      responsible: "Juan Pérez",
      dueDate: "2025-10-23",
      createdDate: "2025-10-21",
      actions: "",
    },
    {
      id: "EXC-002",
      description: "Acceso no autorizado detectado en sistema de registros",
      category: "inappropriate_access",
      status: "in_progress",
      responsible: "María González",
      dueDate: "2025-10-22",
      createdDate: "2025-10-18",
      actions: "Revisión de logs completada. Implementando cambios de seguridad.",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newException, setNewException] = useState({
    description: "",
    category: "" as ExceptionCategory,
  });

  const getCategoryLabel = (category: ExceptionCategory) => {
    const labels = {
      backup_failure: "Falla de Backup",
      inappropriate_access: "Acceso Inapropiado",
      config_error: "Error de Configuración",
      policy_violation: "Violación de Política",
      network_issue: "Problema de Red",
    };
    return labels[category];
  };

  const getStatusLabel = (status: ExceptionStatus) => {
    const labels = {
      open: "Abierto",
      in_progress: "En Progreso",
      closed: "Cerrado",
    };
    return labels[status];
  };

  const getStatusVariant = (status: ExceptionStatus): "destructive" | "warning" | "default" => {
    const variants = {
      open: "destructive" as const,
      in_progress: "warning" as const,
      closed: "default" as const,
    };
    return variants[status];
  };

  const handleCreateException = () => {
    if (!newException.description || !newException.category) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const newExc: Exception = {
      id: `EXC-${String(exceptions.length + 1).padStart(3, "0")}`,
      description: newException.description,
      category: newException.category,
      status: "open",
      responsible: "Asignación automática",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdDate: new Date().toISOString().split("T")[0],
      actions: "",
    };

    setExceptions([newExc, ...exceptions]);
    setIsDialogOpen(false);
    setNewException({ description: "", category: "" as ExceptionCategory });

    toast({
      title: "Excepción creada",
      description: `Se ha registrado la excepción ${newExc.id} correctamente`,
    });
  };

  const filteredExceptions = exceptions.filter((exc) =>
    exc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exc.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Excepciones de Control</h1>
          <p className="text-muted-foreground">Gestión de excepciones y acciones correctivas - MEA02.04</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Excepción
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nueva Excepción</DialogTitle>
              <DialogDescription>Complete los detalles de la excepción de control detectada</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describa la excepción detectada..."
                  value={newException.description}
                  onChange={(e) => setNewException({ ...newException, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newException.category}
                  onValueChange={(value) => setNewException({ ...newException, category: value as ExceptionCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backup_failure">Falla de Backup</SelectItem>
                    <SelectItem value="inappropriate_access">Acceso Inapropiado</SelectItem>
                    <SelectItem value="config_error">Error de Configuración</SelectItem>
                    <SelectItem value="policy_violation">Violación de Política</SelectItem>
                    <SelectItem value="network_issue">Problema de Red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateException} className="w-full">
                Registrar Excepción
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar Excepciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredExceptions.map((exception) => (
          <Card key={exception.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-primary">{exception.id}</CardTitle>
                    <Badge variant={getStatusVariant(exception.status)}>
                      {getStatusLabel(exception.status)}
                    </Badge>
                    <Badge variant="outline">{getCategoryLabel(exception.category)}</Badge>
                    {isOverdue(exception.dueDate) && exception.status !== "closed" && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Vencido
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{exception.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                  <p className="text-sm text-foreground">{exception.responsible}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                  <p className="text-sm text-foreground">{exception.createdDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha Límite</p>
                  <p className="flex items-center gap-1 text-sm text-foreground">
                    <Clock className="h-3 w-3" />
                    {exception.dueDate}
                  </p>
                </div>
              </div>
              {exception.actions && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">Acciones Correctivas</p>
                  <p className="text-sm text-foreground">{exception.actions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Excepciones;
