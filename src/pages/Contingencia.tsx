import { useState, useEffect, useMemo } from "react";
import { citasAPI } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { AlertCircle, Calendar, Download, Plus, Loader2, CheckCircle, XCircle, Clock, Edit, Eye } from "lucide-react";
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

// Helper component for calendar day cells
interface DayCellProps {
  date: Date;
  appointments: Appointment[];
  selectedDate: Date | undefined;
  onDateClick: (date: Date) => void;
  onUpdateStatus: (id: number, status: string) => void;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusBadgeText: (status: string) => string;
}

// Factory function to create Day component wrapper
interface DayWrapperProps {
  date: Date;
  getAppointmentsForDate: (date: Date) => Appointment[];
  selectedDate: Date | undefined;
  onDateClick: (date: Date) => void;
  onUpdateStatus: (id: number, status: string) => void;
  getStatusBadgeVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  getStatusBadgeText: (status: string) => string;
}

const DayWrapper = ({ 
  date, 
  getAppointmentsForDate,
  selectedDate, 
  onDateClick, 
  onUpdateStatus,
  getStatusBadgeVariant,
  getStatusBadgeText
}: DayWrapperProps) => {
  const appointments = getAppointmentsForDate(date);
  return (
    <DayCell
      date={date}
      appointments={appointments}
      selectedDate={selectedDate}
      onDateClick={onDateClick}
      onUpdateStatus={onUpdateStatus}
      getStatusBadgeVariant={getStatusBadgeVariant}
      getStatusBadgeText={getStatusBadgeText}
    />
  );
};

const DayCell = ({ 
  date, 
  appointments, 
  selectedDate, 
  onDateClick, 
  onUpdateStatus,
  getStatusBadgeVariant,
  getStatusBadgeText
}: DayCellProps) => {
  const appointmentCount = appointments.length;
  const isSelected = date.toDateString() === selectedDate?.toDateString();
  
  const getStatusColor = (status: string) => {
    if (status === 'PROGRAMADA') return 'bg-blue-500';
    if (status === 'ATENDIDA') return 'bg-green-500';
    return 'bg-red-500';
  };

  if (appointmentCount > 0) {
    return (
      <div className="relative w-full h-full min-h-[60px] flex items-center justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`w-full h-full min-h-[60px] relative hover:bg-accent rounded-md transition-colors ${
                isSelected ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={(e) => {
                e.preventDefault();
                onDateClick(date);
              }}
            >
              <span className="relative z-10 text-base font-medium">{date.getDate()}</span>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                {appointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={`w-2 h-2 rounded-full ${getStatusColor(apt.estado)}`}
                  />
                ))}
                {appointmentCount > 3 && (
                  <span className="text-[10px] ml-0.5 font-semibold">+{appointmentCount - 3}</span>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="center">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-2">
                Citas del {date.toLocaleDateString("es-PE", { day: 'numeric', month: 'long' })}
              </h4>
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{appointment.nombre_completo}</span>
                    <Badge variant={getStatusBadgeVariant(appointment.estado)} className="text-xs">
                      {getStatusBadgeText(appointment.estado)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(appointment.fecha_hora).toLocaleTimeString("es-PE", { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{appointment.servicio}</p>
                  <p className="text-xs text-muted-foreground">{appointment.medico_asignado}</p>
                  {appointment.estado === "PROGRAMADA" && (
                    <div className="flex gap-1 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(appointment.id, "ATENDIDA")}
                        className="h-7 text-xs flex-1"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Atender
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(appointment.id, "CANCELADA")}
                        className="h-7 text-xs flex-1"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[60px] flex items-center justify-center">
      <button
        type="button"
        className="w-full h-full min-h-[60px] hover:bg-accent rounded-md transition-colors"
        onClick={(e) => {
          e.preventDefault();
          onDateClick(date);
        }}
      >
        <span className="text-base font-medium">{date.getDate()}</span>
      </button>
    </div>
  );
};

const Contingencia = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Helper function para manejar fechas de manera segura
  const parseDateTime = (dateTimeString: string): Date => {
    // Si la fecha viene del backend como 'YYYY-MM-DD HH:MM:SS', la convertimos a ISO
    if (dateTimeString.includes(' ') && !dateTimeString.includes('T')) {
      return new Date(dateTimeString.replace(' ', 'T'));
    }
    // Si ya es ISO o tiene Z, la usamos directamente
    return new Date(dateTimeString);
  };

  // Helper function para formatear fecha para input date
  const formatDateForInput = (dateTimeString: string): string => {
    try {
      const date = parseDateTime(dateTimeString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Helper function para formatear hora para input time
  const formatTimeForInput = (dateTimeString: string): string => {
    try {
      const date = parseDateTime(dateTimeString);
      return date.toTimeString().slice(0, 5);
    } catch (error) {
      console.error('Error formatting time:', error);
      return '00:00';
    }
  };
  
  // Estados para el modal de fecha
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | undefined>(undefined);
  
  // Estados para editar cita
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState(false);
  
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

  const fetchAppointments = async () => {
    try {
      const data = await citasAPI.getAll();
      setAppointments(data);
    } catch (error) {
      console.error("Error al obtener citas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

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

      // Crear fecha y hora combinada sin conversión de zona horaria
      const fechaHora = new Date(`${newAppointment.date}T${newAppointment.time}:00`);

      await citasAPI.create({
        dni: newAppointment.dni,
        nombre_completo: newAppointment.fullName,
        servicio: newAppointment.service,
        medico_asignado: newAppointment.doctor,
        fecha_hora: fechaHora.toISOString(),
      });

      toast({
        title: "Cita registrada exitosamente",
        description: `Cita programada para ${newAppointment.fullName} el ${fechaHora.toLocaleDateString("es-PE")} a las ${fechaHora.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}`,
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

      // Recargar citas
      fetchAppointments();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.issues[0].message;
        toast({
          title: "Error de validación",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const errorMessage = err && typeof err === 'object' && 'response' in err 
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error 
          : undefined;
        toast({
          title: "Error",
          description: errorMessage || "Error al crear cita",
          variant: "destructive",
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: number, newStatus: string) => {
    try {
      await citasAPI.update(appointmentId, { estado: newStatus });

      const statusText = newStatus === "ATENDIDA" ? "atendida" : "cancelada";
      toast({
        title: "Estado actualizado",
        description: `La cita ha sido marcada como ${statusText}`,
      });

      // Recargar citas
      fetchAppointments();
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la cita",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await citasAPI.export();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `citas_contingencia_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast({
        title: "Exportación exitosa",
        description: "Los datos han sido exportados correctamente",
      });
    } catch (error) {
      console.error("Error al exportar:", error);
      toast({
        title: "Error",
        description: "No se pudieron exportar las citas",
        variant: "destructive",
      });
    }
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

  // Helper function to get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    return appointments.filter(
      (apt) => new Date(apt.fecha_hora).toDateString() === date.toDateString()
    );
  };

  // Helper function to handle date click on calendar
  const handleDateClick = (date: Date) => {
    setSelectedDateForModal(date);
    setIsDateModalOpen(true);
  };

  // Helper function to check if a date has appointments
  const hasAppointments = (date: Date): boolean => {
    return getAppointmentsForDate(date).length > 0;
  };

  // Función para crear cita desde el modal de fecha
  const handleCreateAppointmentFromDate = () => {
    if (!selectedDateForModal) return;
    
    const formattedDate = selectedDateForModal.toISOString().split('T')[0];
    setNewAppointment({
      dni: "",
      fullName: "",
      service: "",
      doctor: "",
      date: formattedDate,
      time: "",
    });
    setIsDateModalOpen(false);
    setIsDialogOpen(true);
  };

  // Función para editar cita
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsEditDialogOpen(true);
  };

  // Función para actualizar cita
  const handleUpdateAppointment = async () => {
    if (!editingAppointment) return;

    try {
      setEditing(true);
      
      // Convertir fecha ISO a formato MySQL (YYYY-MM-DD HH:MM:SS)
      let fechaHoraFormatted;
      try {
        const date = parseDateTime(editingAppointment.fecha_hora);
        fechaHoraFormatted = date.toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
      } catch (error) {
        console.error('Error parsing date:', error);
        toast({
          title: "Error",
          description: "Fecha o hora inválida",
          variant: "destructive",
        });
        return;
      }
      
      await citasAPI.update(editingAppointment.id, {
        estado: editingAppointment.estado,
        fecha_hora: fechaHoraFormatted,
      });
      
      toast({
        title: "Éxito",
        description: "Cita actualizada correctamente",
        variant: "default",
      });

      setIsEditDialogOpen(false);
      setEditingAppointment(null);
      fetchAppointments(); // Recargar la lista
    } catch (error) {
      console.error("Error al actualizar cita:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la cita",
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  };

  // Memoize calendar components to avoid linter warnings
  const calendarComponents = useMemo(() => ({
    Day: ({ date }: { date: Date }) => (
      <DayWrapper
        date={date}
        getAppointmentsForDate={getAppointmentsForDate}
        selectedDate={selectedDate}
        onDateClick={handleDateClick}
        onUpdateStatus={handleUpdateStatus}
        getStatusBadgeVariant={getStatusBadgeVariant}
        getStatusBadgeText={getStatusBadgeText}
      />
    )
  }), [appointments, selectedDate]);

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
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Datos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            CITAS
          </CardTitle>
          <CardDescription>Calendario mensual de citas - DSS04.04.4</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Calendario - Lado izquierdo */}
            <div className="flex-1">
              <div className="flex flex-col items-center w-full">
                <div className="w-full">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && handleDateClick(date)}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    className="rounded-md border w-full p-6"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                      month: "space-y-4 w-full",
                      caption: "flex justify-center pt-1 relative items-center mb-4",
                      caption_label: "text-lg font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-full font-semibold text-sm py-2",
                      row: "flex w-full mt-2",
                      cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full h-20",
                      day: "w-full h-full",
                    }}
                    modifiers={{
                      hasAppointments: (date) => hasAppointments(date),
                    }}
                    modifiersStyles={{
                      hasAppointments: {
                        fontWeight: 'bold',
                      }
                    }}
                    components={calendarComponents}
                  />
                </div>
                <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-medium">Programada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-medium">Atendida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="font-medium">Cancelada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Citas del día - Lado derecho */}
            <div className="w-96">
              {selectedDate ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Citas del {selectedDate.toLocaleDateString("es-PE", { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getAppointmentsForDate(selectedDate).length} citas programadas
                    </p>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getAppointmentsForDate(selectedDate).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No hay citas registradas para este día</p>
                    ) : (
                      getAppointmentsForDate(selectedDate).map((appointment) => (
                        <div key={appointment.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">#{appointment.id}</Badge>
                            <Badge variant={getStatusBadgeVariant(appointment.estado)}>
                              {getStatusBadgeText(appointment.estado)}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{appointment.nombre_completo}</p>
                            <p className="text-xs text-muted-foreground">
                              {appointment.servicio} - {appointment.medico_asignado}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {new Date(appointment.fecha_hora).toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {(user?.area === 'ADMIN' || user?.area === 'CLINICO') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditAppointment(appointment)}
                                className="gap-1 h-7"
                              >
                                <Edit className="h-3 w-3" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Seleccione una fecha para ver las citas</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Modal de fecha seleccionada */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDateForModal?.toLocaleDateString("es-PE", { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogTitle>
            <DialogDescription>
              Seleccione una acción para esta fecha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleCreateAppointmentFromDate}
                className="gap-2 h-20"
                disabled={!(user?.area === 'ADMIN' || user?.area === 'CLINICO')}
              >
                <Plus className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Registrar Nueva Cita</div>
                  <div className="text-sm opacity-80">Crear cita para este día</div>
                </div>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setIsDateModalOpen(false);
                  setSelectedDate(selectedDateForModal);
                  // Scroll to appointments section
                  setTimeout(() => {
                    const appointmentsSection = document.getElementById('appointments-section');
                    if (appointmentsSection) {
                      appointmentsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className="gap-2 h-20"
              >
                <Eye className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-semibold">Ver Citas del Día</div>
                  <div className="text-sm opacity-80">
                    {getAppointmentsForDate(selectedDateForModal || new Date()).length} citas
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de edición de cita */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>
              Modifique los datos de la cita
            </DialogDescription>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DNI</Label>
                  <Input value={editingAppointment.dni} disabled />
                </div>
                <div>
                  <Label>Nombre Completo</Label>
                  <Input value={editingAppointment.nombre_completo} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Servicio</Label>
                  <Input value={editingAppointment.servicio} disabled />
                </div>
                <div>
                  <Label>Médico Asignado</Label>
                  <Input value={editingAppointment.medico_asignado} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formatDateForInput(editingAppointment.fecha_hora)}
                    onChange={(e) => {
                      try {
                        const currentDate = parseDateTime(editingAppointment.fecha_hora);
                        const [year, month, day] = e.target.value.split('-');
                        currentDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                        setEditingAppointment({
                          ...editingAppointment,
                          fecha_hora: currentDate.toISOString()
                        });
                      } catch (error) {
                        console.error('Error updating date:', error);
                      }
                    }}
                    disabled={editing}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formatTimeForInput(editingAppointment.fecha_hora)}
                    onChange={(e) => {
                      try {
                        const currentDate = parseDateTime(editingAppointment.fecha_hora);
                        const [hours, minutes] = e.target.value.split(':');
                        currentDate.setHours(parseInt(hours), parseInt(minutes));
                        setEditingAppointment({
                          ...editingAppointment,
                          fecha_hora: currentDate.toISOString()
                        });
                      } catch (error) {
                        console.error('Error updating time:', error);
                      }
                    }}
                    disabled={editing}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editingAppointment.estado}
                    onValueChange={(value) => setEditingAppointment({
                      ...editingAppointment,
                      estado: value
                    })}
                    disabled={editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROGRAMADA">Programada</SelectItem>
                      <SelectItem value="ATENDIDA">Atendida</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={editing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateAppointment}
                  disabled={editing}
                  className="gap-2"
                >
                  {editing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Edit className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de creación de cita */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
    </div>
  );
};

export default Contingencia;
