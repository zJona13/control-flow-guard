import { useEffect, useState } from "react";
import { excepcionesAPI, citasAPI } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2, Calendar, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface Exception {
  id: number;
  descripcion: string;
  fecha: string;
  categoria: string;
  estado: string;
  creado_en: string;
  fecha_limite: string | null;
}

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

const Dashboard = () => {
  const { user } = useAuth();
  const [estadisticas, setEstadisticas] = useState<{
    porEstado: Array<{ estado: string; total: number }>;
    topCategorias: Array<{ categoria: string; frecuencia: number }>;
    recientes: Exception[];
    vencidas: number;
  } | null>(null);
  const [appointmentStats, setAppointmentStats] = useState<{
    total: number;
    programadas: number;
    atendidas: number;
    canceladas: number;
    hoy: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar estadísticas de excepciones para todos los roles
        const excepcionesData = await excepcionesAPI.getEstadisticas();
        setEstadisticas(excepcionesData);

        // Cargar estadísticas de citas para roles clínicos
        if (user?.area === 'CLINICO' || user?.area === 'ADMIN') {
          const citas = await citasAPI.getAll();
          const hoy = new Date().toISOString().split('T')[0];
          
          const stats = {
            total: citas.length,
            programadas: citas.filter(c => c.estado === 'PROGRAMADA').length,
            atendidas: citas.filter(c => c.estado === 'ATENDIDA').length,
            canceladas: citas.filter(c => c.estado === 'CANCELADA').length,
            hoy: citas.filter(c => c.fecha_hora.startsWith(hoy)).length,
          };
          
          setAppointmentStats(stats);
        }
      } catch (error) {
        console.error("Error al obtener datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.area]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  // Función para generar estadísticas según el rol
  const getStatsForRole = () => {
    if (!estadisticas) return [];

    const porEstadoMap = estadisticas.porEstado.reduce((acc, item) => {
      acc[item.estado] = item.total;
      return acc;
    }, {} as Record<string, number>);

    const openExceptions = porEstadoMap['ABIERTO'] || 0;
    const closedExceptions = porEstadoMap['CERRADO'] || 0;
    const inProgressExceptions = porEstadoMap['EN_PROGRESO'] || 0;
    const totalExceptions = openExceptions + closedExceptions + inProgressExceptions;

    if (user?.area === 'CLINICO') {
      // Dashboard específico para Personal Clínico
      return [
        {
          title: "Citas de Hoy",
          value: appointmentStats?.hoy.toString() || "0",
          change: "Programadas",
          trend: "up",
          icon: Calendar,
          color: "text-primary",
        },
        {
          title: "Citas Programadas",
          value: appointmentStats?.programadas.toString() || "0",
          change: "Pendientes",
          trend: "up",
          icon: Clock,
          color: "text-warning",
        },
        {
          title: "Citas Atendidas",
          value: appointmentStats?.atendidas.toString() || "0",
          change: "Este mes",
          trend: "up",
          icon: CheckCircle2,
          color: "text-success",
        },
        {
          title: "Excepciones Registradas",
          value: totalExceptions.toString(),
          change: "Por resolver",
          trend: "up",
          icon: AlertTriangle,
          color: "text-destructive",
        },
      ];
    } else if (user?.area === 'TI') {
      // Dashboard específico para TI
      return [
        {
          title: "Tickets Asignados",
          value: inProgressExceptions.toString(),
          change: "En progreso",
          trend: "up",
          icon: Activity,
          color: "text-warning",
        },
        {
          title: "Tickets Resueltos",
          value: closedExceptions.toString(),
          change: "Este mes",
          trend: "up",
          icon: CheckCircle2,
          color: "text-success",
        },
        {
          title: "Tickets Pendientes",
          value: openExceptions.toString(),
          change: "Sin asignar",
          trend: "up",
          icon: AlertTriangle,
          color: "text-destructive",
        },
        {
          title: "Tasa de Resolución",
          value: totalExceptions > 0 ? `${Math.round((closedExceptions / totalExceptions) * 100)}%` : "0%",
          change: "Del total",
          trend: "up",
          icon: TrendingUp,
          color: "text-success",
        },
      ];
    } else {
      // Dashboard para ADMIN (original)
      return [
        {
          title: "Excepciones Abiertas",
          value: openExceptions.toString(),
          change: `${inProgressExceptions} en progreso`,
          trend: "up",
          icon: AlertTriangle,
          color: "text-destructive",
        },
        {
          title: "Resoluciones Completadas",
          value: closedExceptions.toString(),
          change: "Este mes",
          trend: "up",
          icon: CheckCircle2,
          color: "text-success",
        },
        {
          title: "Total Excepciones",
          value: totalExceptions.toString(),
          change: "Registradas",
          trend: "up",
          icon: Clock,
          color: "text-primary",
        },
        {
          title: "Tasa de Cumplimiento",
          value: totalExceptions > 0 ? `${Math.round((closedExceptions / totalExceptions) * 100)}%` : "0%",
          change: "Del total",
          trend: "up",
          icon: TrendingUp,
          color: "text-success",
        },
      ];
    }
  };

  const stats = getStatsForRole();

  // Top issues con severidad
  const topIssues = estadisticas.topCategorias.map((item) => ({
    type: getCategoryLabel(item.categoria),
    count: item.frecuencia,
    severity: item.frecuencia > 3 ? "critical" : item.frecuencia > 2 ? "high" : item.frecuencia > 1 ? "medium" : "low",
  }));

  const recentExceptions = estadisticas.recientes.slice(0, 3).map((exc) => ({
    id: exc.id.toString(),
    description: exc.descripcion,
    status: exc.estado,
    days: Math.floor((new Date().getTime() - new Date(exc.creado_en).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
      FALLA_BACKUP: "Falla de Backup",
      ACCESO_INAPROPIADO: "Acceso Inapropiado",
      INCIDENTE_SEGURIDAD: "Incidente de Seguridad",
      DISPONIBILIDAD: "Disponibilidad",
      OTRO: "Otro",
    };
    return labels[category] || category;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ABIERTO":
        return "destructive";
      case "EN_PROGRESO":
        return "warning";
      case "CERRADO":
        return "success";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ABIERTO":
        return "Abierto";
      case "EN_PROGRESO":
        return "En Progreso";
      case "CERRADO":
        return "Cerrado";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {user?.area === 'CLINICO' ? 'Dashboard Clínico' : 
           user?.area === 'TI' ? 'Dashboard de Soporte TI' : 
           'Dashboard de Control Interno'}
        </h1>
        <p className="text-muted-foreground">
          {user?.area === 'CLINICO' ? 'Gestión de citas y excepciones clínicas - DSS04' :
           user?.area === 'TI' ? 'Gestión de tickets y soporte técnico - MEA02' :
           'Monitoreo y métricas clave de control - MEA02'}
        </p>
      </div>


      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className={stat.trend === "up" ? "text-success" : "text-destructive"}>
                    {stat.change}
                  </span>{" "}
                  desde el último período
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>


      <div className="grid gap-6 md:grid-cols-2">
        {/* Sección específica para Personal Clínico */}
        {user?.area === 'CLINICO' ? (
          <>
            {/* Resumen de Citas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Resumen de Citas
                </CardTitle>
                <CardDescription>Estado actual de las citas de contingencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10">
                      <div className="text-2xl font-bold text-primary">{appointmentStats?.programadas || 0}</div>
                      <div className="text-sm text-muted-foreground">Programadas</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">{appointmentStats?.atendidas || 0}</div>
                      <div className="text-sm text-muted-foreground">Atendidas</div>
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-destructive/10">
                    <div className="text-2xl font-bold text-destructive">{appointmentStats?.canceladas || 0}</div>
                    <div className="text-sm text-muted-foreground">Canceladas</div>
                  </div>
                  <div className="pt-2 border-t">
                    <Link to="/contingencia">
                      <Button className="w-full" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Ver Calendario de Citas
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Excepciones Recientes */}
            <Card>
              <CardHeader>
                <CardTitle>Mis Excepciones Recientes</CardTitle>
                <CardDescription>Últimas excepciones que registré</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentExceptions.length > 0 ? (
                    recentExceptions.map((exception) => (
                      <div key={exception.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-primary">#{exception.id}</p>
                            <Badge variant={getStatusColor(exception.status) as "destructive" | "warning" | "success" | "secondary"} className="text-xs">
                              {getStatusText(exception.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{exception.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <Clock className="inline h-3 w-3" /> {exception.days} días
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-2">No hay excepciones registradas</p>
                      <Link to="/excepciones">
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Registrar Primera Excepción
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Top 5 Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Tipos de Fallas</CardTitle>
                <CardDescription>Análisis de causa raíz - MEA02.03.3</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topIssues.length > 0 ? (
                    topIssues.map((issue, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{issue.type}</p>
                          <p className="text-xs text-muted-foreground">{issue.count} ocurrencias</p>
                        </div>
                        <Badge variant={getSeverityColor(issue.severity) as "destructive" | "warning" | "secondary"}>
                          {issue.severity === "critical" && "Crítico"}
                          {issue.severity === "high" && "Alto"}
                          {issue.severity === "medium" && "Medio"}
                          {issue.severity === "low" && "Bajo"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Exceptions */}
            <Card>
              <CardHeader>
                <CardTitle>Excepciones Recientes</CardTitle>
                <CardDescription>Últimas excepciones registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentExceptions.length > 0 ? (
                    recentExceptions.map((exception) => (
                      <div key={exception.id} className="flex items-start justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-primary">{exception.id}</p>
                            <Badge variant={getStatusColor(exception.status) as "destructive" | "warning" | "success" | "secondary"} className="text-xs">
                              {getStatusText(exception.status)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{exception.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <Clock className="inline h-3 w-3" /> {exception.days} días
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No hay excepciones registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
