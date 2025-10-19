import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

type ExceptionStatus = "open" | "in_progress" | "closed";
type ExceptionCategory = "backup_failure" | "inappropriate_access" | "config_error" | "policy_violation" | "network_issue";

interface Exception {
  id: string;
  exception_code: string;
  description: string;
  category: ExceptionCategory;
  status: ExceptionStatus;
  responsible_user_id: string | null;
  created_by: string;
  due_date: string;
  created_at: string;
  corrective_actions: string | null;
}

const descriptionSchema = z.string().min(10, "La descripción debe tener al menos 10 caracteres").max(1000);

const Excepciones = () => {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newException, setNewException] = useState({
    description: "",
    category: "" as ExceptionCategory,
  });

  useEffect(() => {
    fetchExceptions();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel("exceptions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "control_exceptions",
        },
        () => {
          fetchExceptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExceptions = async () => {
    const { data, error } = await supabase
      .from("control_exceptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las excepciones",
        variant: "destructive",
      });
    } else if (data) {
      setExceptions(data as Exception[]);
    }
    setLoading(false);
  };

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

  const getStatusVariant = (status: ExceptionStatus): "destructive" | "warning" | "success" => {
    const variants = {
      open: "destructive" as const,
      in_progress: "warning" as const,
      closed: "success" as const,
    };
    return variants[status];
  };

  const handleCreateException = async () => {
    try {
      descriptionSchema.parse(newException.description);
      
      if (!newException.category) {
        toast({
          title: "Error",
          description: "Por favor seleccione una categoría",
          variant: "destructive",
        });
        return;
      }

      setCreating(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "No se pudo obtener el usuario actual",
          variant: "destructive",
        });
        return;
      }

      // Generar código de excepción
      const { data: codeData } = await supabase.rpc("generate_exception_code");
      const exceptionCode = codeData || `EXC-${Date.now()}`;

      // Calcular fecha límite (7 días desde ahora)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { error } = await supabase.from("control_exceptions").insert({
        exception_code: exceptionCode,
        description: newException.description,
        category: newException.category,
        status: "open",
        created_by: user.id,
        due_date: dueDate.toISOString().split("T")[0],
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Excepción creada",
        description: `Se ha registrado la excepción ${exceptionCode} correctamente`,
      });

      setIsDialogOpen(false);
      setNewException({ description: "", category: "" as ExceptionCategory });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: err.issues[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredExceptions = exceptions.filter(
    (exc) =>
      exc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exc.exception_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== "closed";
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
                  value={newException.description}
                  onChange={(e) => setNewException({ ...newException, description: e.target.value })}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={newException.category}
                  onValueChange={(value) => setNewException({ ...newException, category: value as ExceptionCategory })}
                  disabled={creating}
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
                      <CardTitle className="text-primary">{exception.exception_code}</CardTitle>
                      <Badge variant={getStatusVariant(exception.status)}>
                        {getStatusLabel(exception.status)}
                      </Badge>
                      <Badge variant="outline">{getCategoryLabel(exception.category)}</Badge>
                      {isOverdue(exception.due_date, exception.status) && (
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
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Creación</p>
                    <p className="text-sm text-foreground">
                      {new Date(exception.created_at).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Límite</p>
                    <p className="flex items-center gap-1 text-sm text-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(exception.due_date).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    <p className="text-sm text-foreground">{getStatusLabel(exception.status)}</p>
                  </div>
                </div>
                {exception.corrective_actions && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-muted-foreground">Acciones Correctivas</p>
                    <p className="text-sm text-foreground">{exception.corrective_actions}</p>
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
