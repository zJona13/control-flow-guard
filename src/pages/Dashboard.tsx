import { useEffect, useState } from "react";
import { excepcionesAPI } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2 } from "lucide-react";

interface Exception {
  id: number;
  descripcion: string;
  fecha: string;
  categoria: string;
  estado: string;
  creado_en: string;
  fecha_limite: string | null;
}

const Dashboard = () => {
  const [estadisticas, setEstadisticas] = useState<{
    porEstado: Array<{ estado: string; total: number }>;
    topCategorias: Array<{ categoria: string; frecuencia: number }>;
    recientes: Exception[];
    vencidas: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstadisticas = async () => {
      try {
        const data = await excepcionesAPI.getEstadisticas();
        setEstadisticas(data);
      } catch (error) {
        console.error("Error al obtener estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstadisticas();
  }, []);

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

  // Calcular estadísticas en tiempo real
  const porEstadoMap = estadisticas.porEstado.reduce((acc, item) => {
    acc[item.estado] = item.total;
    return acc;
  }, {} as Record<string, number>);

  const openExceptions = porEstadoMap['ABIERTO'] || 0;
  const closedExceptions = porEstadoMap['CERRADO'] || 0;
  const inProgressExceptions = porEstadoMap['EN_PROGRESO'] || 0;
  const totalExceptions = openExceptions + closedExceptions + inProgressExceptions;

  const stats = [
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard de Control Interno</h1>
        <p className="text-muted-foreground">Monitoreo y métricas clave de control - MEA02</p>
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
      </div>
    </div>
  );
};

export default Dashboard;
