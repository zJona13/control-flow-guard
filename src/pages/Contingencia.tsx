import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Calendar, Download, Plus, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  dni: string;
  fullName: string;
  service: string;
  doctor: string;
  time: string;
  date: string;
}

const Contingencia = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "CONT-001",
      dni: "12345678",
      fullName: "Ana María López García",
      service: "Medicina General",
      doctor: "Dr. Carlos Ramírez",
      time: "09:00",
      date: "2025-10-19",
    },
    {
      id: "CONT-002",
      dni: "87654321",
      fullName: "José Antonio Fernández",
      service: "Cardiología",
      doctor: "Dra. María Elena Soto",
      time: "10:30",
      date: "2025-10-19",
    },
  ]);

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

  const handleCreateAppointment = () => {
    if (!newAppointment.dni || !newAppointment.fullName || !newAppointment.service || !newAppointment.doctor || !newAppointment.time) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const appointment: Appointment = {
      id: `CONT-${String(appointments.length + 1).padStart(3, "0")}`,
      ...newAppointment,
      date: new Date().toISOString().split("T")[0],
    };

    setAppointments([...appointments, appointment]);
    setIsDialogOpen(false);
    setNewAppointment({
      dni: "",
      fullName: "",
      service: "",
      doctor: "",
      time: "",
    });

    toast({
      title: "Cita registrada",
      description: `Cita ${appointment.id} registrada exitosamente`,
    });
  };

  const handleExport = () => {
    const csvContent = [
      ["ID", "DNI", "Nombre Completo", "Servicio", "Médico", "Hora", "Fecha"],
      ...appointments.map((apt) => [
        apt.id,
        apt.dni,
        apt.fullName,
        apt.service,
        apt.doctor,
        apt.time,
        apt.date,
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

  const todayAppointments = appointments.filter((apt) => apt.date === new Date().toISOString().split("T")[0]);

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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Nombres y apellidos"
                    value={newAppointment.fullName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Servicio</Label>
                  <Select
                    value={newAppointment.service}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, service: value })}
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
                />
              </div>
              <Button onClick={handleCreateAppointment} className="w-full">
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
                        <p className="font-medium text-foreground">{appointment.fullName}</p>
                        <Badge variant="outline">DNI: {appointment.dni}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appointment.service}</p>
                      <p className="text-sm text-muted-foreground">{appointment.doctor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="text-base">{appointment.time}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{appointment.id}</p>
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
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{appointment.id}</Badge>
                  <div>
                    <p className="text-sm font-medium text-foreground">{appointment.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.service} - {appointment.doctor}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{appointment.time}</p>
                  <p className="text-xs text-muted-foreground">{appointment.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contingencia;
