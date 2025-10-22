import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Calendar, Download, Plus, User, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface Appointment {
  id: number;
  dni: string;
  nombre_completo: string;
  servicio: string;
  medico_asignado: string;
  fecha_hora: string;
  estado: string;
  creado_en: string;
}

const dniSchema = z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos");
const nameSchema = z.string().min(3, "Nombre muy corto").max(100, "Nombre muy largo");

const Contingencia = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    dni: "",
    fullName: "",
    service: "",
    doctor: "",
    date: "",
    time: "",
  });

  const services = [
    "Medicina General",
    "Cardiología",
    "Pediatría",
    "Ginecología",
    "Traumatología",
    "Dermatología",
    "Oftalmología",
    "Odontología",
  ];

  const doctors = [
    "Dr. Carlos Ramírez",
    "Dra. María Elena Soto",
    "Dr. Juan Pablo Torres",
    "Dra. Ana Lucía Mendoza",
    "Dr. Roberto Castro",
    "Dra. Patricia Díaz",
  ];

  useEffect(() => {
    fetchAppointments();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "citas_contingencia",
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("citas_contingencia")
        .select("*")
        .order("creado_en", { ascending: false });

      if (error) {
        console.error("Error fetching appointments:", error);
        toast({
          title: "Error de conexión",
          description: "No se pudieron cargar las citas. Verifique su conexión a internet.",
          variant: "destructive",
        });
        setAppointments([]);
      } else if (data) {
        setAppointments(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error inesperado",
        description: "Error inesperado al cargar las citas. Recargue la página.",
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      // Validate DNI
      dniSchema.parse(newAppointment.dni);

      // Validate name
      nameSchema.parse(newAppointment.fullName);

      // Validate required fields
      if (!newAppointment.service || !newAppointment.doctor || !newAppointment.time || !newAppointment.date) {
        toast({
          title: "Error",
          description: "Por favor complete todos los campos requeridos",
          variant: "destructive",
        });
        return;
      }

      // Validate date is not in the past
      const selectedDate = new Date(`${newAppointment.date}T${newAppointment.time}`);
      const now = new Date();
      
      if (selectedDate < now) {
        toast({
          title: "Error",
          description: "No se pueden programar citas en fechas pasadas",
          variant: "destructive",
        });
        return;
      }

      setCreating(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "No se pudo obtener el usuario actual. Por favor, inicie sesión nuevamente.",
          variant: "destructive",
        });
        return;
      }

      // Crear fecha y hora combinada
      const fechaHora = new Date(`${newAppointment.date}T${newAppointment.time}`);

      const { error } = await supabase.from("citas_contingencia").insert({
        dni: newAppointment.dni,
        nombre_completo: newAppointment.fullName,
        servicio: newAppointment.service,
        medico_asignado: newAppointment.doctor,
        fecha_hora: fechaHora.toISOString(),
        estado: "PROGRAMADA",
        creado_por: user.id,
      });

      if (error) {
        console.error("Database error:", error);
        toast({
          title: "Error al registrar cita",
          description: error.message.includes("duplicate") 
            ? "Ya existe una cita con este DNI para la fecha seleccionada"
            : "Error en la base de datos. Intente nuevamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cita registrada exitosamente",
        description: `Cita programada para ${newAppointment.nombre_completo} el ${fechaHora.toLocaleDateString("es-PE")} a las ${fechaHora.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`,
      });

      setIsDialogOpen(false);
      setNewAppointment({
        dni: "",
        fullName: "",
        service: "",
        doctor: "",
        date: "",
        time: "",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.issues[0].message;
        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        console.error("Unexpected error:", err);
        toast({
          title: "Error inesperado",
          description: "Ocurrió un error inesperado. Por favor, intente nuevamente.",
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("citas_contingencia")
        .update({ 
          estado: newStatus,
          actualizado_en: new Date().toISOString()
        })
        .eq("id", appointmentId);

      if (error) {
        console.error("Error updating status:", error);
        toast({
          title: "Error al actualizar estado",
          description: "No se pudo actualizar el estado de la cita. Intente nuevamente.",
          variant: "destructive",
        });
        return;
      }

      const statusText = newStatus === "ATENDIDA" ? "atendida" : "cancelada";
      toast({
        title: "Estado actualizado",
        description: `La cita ha sido marcada como ${statusText}`,
      });

      // Refresh appointments
      fetchAppointments();
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error inesperado",
        description: "Error inesperado al actualizar el estado. Recargue la página.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["ID", "DNI", "Nombre Completo", "Servicio", "Médico", "Fecha y Hora"],
      ...appointments.map((apt) => [
        apt.id,
        apt.dni,
        apt.nombre_completo,
        apt.servicio,
        apt.medico_asignado,
        new Date(apt.fecha_hora).toLocaleString("es-PE"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `citas_contingencia_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportación exitosa",
      description: "Los datos han sido exportados correctamente",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PROGRAMADA":
        return "default";
      case "ATENDIDA":
        return "secondary";
      case "CANCELADA":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusBadgeText = (status: string) => {
    switch (status) {
      case "PROGRAMADA":
        return "Programada";
      case "ATENDIDA":
        return "Atendida";
      case "CANCELADA":
        return "Cancelada";
      default:
        return status;
    }
  };

  const todayAppointments = appointments.filter(
    (apt) => new Date(apt.fecha_hora).toDateString() === new Date().toDateString()
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
      <div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-warning" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Modo de Contingencia Activo</h1>
        </div>
        <p className="text-muted-foreground">Registro de citas durante interrupción del sistema principal - DSS04.04</p>
      </div>

      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            Sistema Principal Inactivo
          </CardTitle>
          <CardDescription>
            Este módulo está activo porque el sistema de citas principal no está disponible. Los datos registrados aquí
            serán exportados para su posterior sincronización.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex gap-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar Cita de Contingencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nueva Cita de Contingencia</DialogTitle>
              <DialogDescription>Registre los datos esenciales del paciente y la cita</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    placeholder="12345678"
                    value={newAppointment.dni}
                    onChange={(e) => setNewAppointment({ ...newAppointment, dni: e.target.value.replace(/\D/g, '') })}
                    disabled={creating}
                    maxLength={8}
                    pattern="[0-9]{8}"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Nombres y apellidos"
                    value={newAppointment.fullName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, fullName: e.target.value })}
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    disabled={creating}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Servicio</Label>
                  <Select
                    value={newAppointment.service}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, service: value })}
                    disabled={creating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor">Médico Asignado</Label>
                  <Select
                    value={newAppointment.doctor}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, doctor: value })}
                    disabled={creating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un médico" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor} value={doctor}>
                          {doctor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateAppointment} className="w-full" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Cita
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Datos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Citas del Día
          </CardTitle>
          <CardDescription>Vista rápida para personal clínico - DSS04.04.4</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay citas registradas para hoy</p>
            ) : (
              todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{appointment.nombre_completo}</p>
                        <Badge variant="outline">DNI: {appointment.dni}</Badge>
                        <Badge variant={getStatusBadgeVariant(appointment.estado)}>
                          {getStatusBadgeText(appointment.estado)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appointment.servicio}</p>
                      <p className="text-sm text-muted-foreground">{appointment.medico_asignado}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge className="text-base">{new Date(appointment.fecha_hora).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">#{appointment.id}</p>
                    </div>
                    {appointment.estado === "PROGRAMADA" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(appointment.id, "ATENDIDA")}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(appointment.id, "CANCELADA")}
                          className="h-8 w-8 p-0"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todas las Citas Registradas</CardTitle>
          <CardDescription>Total: {appointments.length} citas en modo contingencia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay citas registradas</p>
            ) : (
              appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{appointment.id}</Badge>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{appointment.nombre_completo}</p>
                        <Badge variant={getStatusBadgeVariant(appointment.estado)}>
                          {getStatusBadgeText(appointment.estado)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {appointment.servicio} - {appointment.medico_asignado}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{new Date(appointment.fecha_hora).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appointment.fecha_hora).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contingencia;
