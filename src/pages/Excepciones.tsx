import { useState, useEffect } from "react";
import { excepcionesAPI } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, AlertCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type ExceptionStatus = "ABIERTO" | "EN_PROGRESO" | "CERRADO";
type ExceptionCategory = "FALLA_BACKUP" | "ACCESO_INAPROPIADO" | "INCIDENTE_SEGURIDAD" | "DISPONIBILIDAD" | "OTRO";

interface Exception {
  id: number;
  descripcion: string;
  fecha: string;
  categoria: ExceptionCategory;
  estado: ExceptionStatus;
  responsable_id: string | null;
  creado_por: string;
  fecha_limite: string | null;
  creado_en: string;
  causa_raiz: string | null;
}

const descriptionSchema = z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(1000);

const Excepciones = () => {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newException, setNewException] = useState({
    descripcion: "",
    categoria: "" as ExceptionCategory,
  });

  const fetchExceptions = async () => {
    try {
      const data = await excepcionesAPI.getAll();
      setExceptions(data as Exception[]);
    } catch (error) {
      console.error("Error al obtener excepciones:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las excepciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const getCategoryLabel = (category: ExceptionCategory) => {
    const labels = {
      FALLA_BACKUP: "Falla de Backup",
      ACCESO_INAPROPIADO: "Acceso Inapropiado",
      INCIDENTE_SEGURIDAD: "Incidente de Seguridad",
      DISPONIBILIDAD: "Disponibilidad",
      OTRO: "Otro",
    };
    return labels[category];
  };

  const getStatusLabel = (status: ExceptionStatus) => {
    const labels = {
      ABIERTO: "Abierto",
      EN_PROGRESO: "En Progreso",
      CERRADO: "Cerrado",
    };
    return labels[status];
  };

  const getStatusVariant = (status: ExceptionStatus): "destructive" | "warning" | "success" => {
    const variants = {
      ABIERTO: "destructive" as const,
      EN_PROGRESO: "warning" as const,
      CERRADO: "success" as const,
    };
    return variants[status];
  };

  const handleCreateException = async () => {
    try {
      descriptionSchema.parse(newException.descripcion);
      
      if (!newException.categoria) {
        toast({
          title: "Error",
          description: "Por favor seleccione una categoría",
          variant: "destructive",
        });
        return;
      }

      setCreating(true);

      await excepcionesAPI.create({
        descripcion: newException.descripcion,
        categoria: newException.categoria,
      });

      toast({
        title: "Excepción creada",
        description: "Se ha registrado la excepción correctamente",
      });

      setIsDialogOpen(false);
      setNewException({ descripcion: "", categoria: "" as ExceptionCategory });
      
      // Recargar excepciones
      fetchExceptions();
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: err.issues[0].message,
          variant: "destructive",
        });
      } else {
        const error = err as any;
        toast({
          title: "Error",
          description: error.response?.data?.error || "Error al crear excepción",
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredExceptions = exceptions.filter(
    (exc) =>
      exc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exc.id.toString().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate: string | null, status: string) => {
    return dueDate && new Date(dueDate) < new Date() && status !== "CERRADO";
  };

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
                  value={newException.descripcion}
                  onChange={(e) => setNewException({ ...newException, descripcion: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newException.categoria}
                  onValueChange={(value) => setNewException({ ...newException, categoria: value as ExceptionCategory })}
                  disabled={creating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FALLA_BACKUP">Falla de Backup</SelectItem>
                    <SelectItem value="ACCESO_INAPROPIADO">Acceso Inapropiado</SelectItem>
                    <SelectItem value="INCIDENTE_SEGURIDAD">Incidente de Seguridad</SelectItem>
                    <SelectItem value="DISPONIBILIDAD">Disponibilidad</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateException} className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        {filteredExceptions.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No se encontraron excepciones</p>
            </CardContent>
          </Card>
        ) : (
          filteredExceptions.map((exception) => (
            <Card key={exception.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-primary">#{exception.id}</CardTitle>
                      <Badge variant={getStatusVariant(exception.estado)}>
                        {getStatusLabel(exception.estado)}
                      </Badge>
                      <Badge variant="outline">{getCategoryLabel(exception.categoria)}</Badge>
                      {isOverdue(exception.fecha_limite, exception.estado) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Vencido
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{exception.descripcion}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                    <p className="text-sm text-foreground">
                      {new Date(exception.creado_en).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Límite</p>
                    <p className="flex items-center gap-1 text-sm text-foreground">
                      <Clock className="h-3 w-3" />
                      {exception.fecha_limite ? new Date(exception.fecha_limite).toLocaleDateString("es-PE") : "Sin fecha límite"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm text-foreground">{getStatusLabel(exception.estado)}</p>
                  </div>
                </div>
                {exception.causa_raiz && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Causa Raíz</p>
                    <p className="text-sm text-foreground">{exception.causa_raiz}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Excepciones;
