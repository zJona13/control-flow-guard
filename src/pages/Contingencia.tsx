import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Calendar, Download, Plus, User, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface Appointment {
  id: string;
  appointment_code: string;
  dni: string;
  full_name: string;
  service: string;
  doctor: string;
  appointment_time: string;
  appointment_date: string;
  created_at: string;
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
          table: "contingency_appointments",
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
    const { data, error } = await supabase
      .from("contingency_appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive",
      });
    } else if (data) {
      setAppointments(data);
    }
    setLoading(false);
  };

  const handleCreateAppointment = async () => {
    try {
      dniSchema.parse(newAppointment.dni);
      nameSchema.parse(newAppointment.fullName);

      if (!newAppointment.service || !newAppointment.doctor || !newAppointment.time) {
        toast({
          title: "Error",
          description: "Por favor complete todos los campos",
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

      // Generar código de cita
      const { data: codeData } = await supabase.rpc("generate_appointment_code");
      const appointmentCode = codeData || `CONT-${Date.now()}`;

      const { error } = await supabase.from("contingency_appointments").insert({
        appointment_code: appointmentCode,
        dni: newAppointment.dni,
        full_name: newAppointment.fullName,
        service: newAppointment.service,
        doctor: newAppointment.doctor,
        appointment_time: newAppointment.time,
        created_by: user.id,
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
        title: "Cita registrada",
        description: `Cita ${appointmentCode} registrada exitosamente`,
      });

      setIsDialogOpen(false);
      setNewAppointment({
        dni: "",
        fullName: "",
        service: "",
        doctor: "",
        time: "",
      });
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

  const handleExport = () => {
    const csvContent = [
      ["ID", "DNI", "Nombre Completo", "Servicio", "Médico", "Hora", "Fecha"],
      ...appointments.map((apt) => [
        apt.appointment_code,
        apt.dni,
        apt.full_name,
        apt.service,
        apt.doctor,
        apt.appointment_time,
        apt.appointment_date,
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

  const todayAppointments = appointments.filter(
    (apt) => apt.appointment_date === new Date().toISOString().split("T")[0]
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
                    onChange={(e) => setNewAppointment({ ...newAppointment, dni: e.target.value })}
                    disabled={creating}
                    maxLength={8}
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
              <div className="space-y-2">
                <Label htmlFor="time">Hora de Cita</Label>
                <Input
                  id="time"
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  disabled={creating}
                />
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
                        <p className="font-medium text-foreground">{appointment.full_name}</p>
                        <Badge variant="outline">DNI: {appointment.dni}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appointment.service}</p>
                      <p className="text-sm text-muted-foreground">{appointment.doctor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="text-base">{appointment.appointment_time}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{appointment.appointment_code}</p>
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
                    <Badge variant="outline">{appointment.appointment_code}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{appointment.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.service} - {appointment.doctor}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{appointment.appointment_time}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(appointment.appointment_date).toLocaleDateString("es-PE")}
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
