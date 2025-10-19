import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Excepciones Abiertas",
      value: "12",
      change: "+3",
      trend: "up",
      icon: AlertTriangle,
      color: "text-destructive",
    },
    {
      title: "Resoluciones Completadas",
      value: "48",
      change: "+8",
      trend: "up",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Tiempo Promedio Resolución",
      value: "4.2 días",
      change: "-0.8",
      trend: "down",
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Tasa de Cumplimiento",
      value: "87%",
      change: "+5%",
      trend: "up",
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  const topIssues = [
    { type: "Falla de Backup", count: 5, severity: "high" },
    { type: "Acceso Inapropiado", count: 3, severity: "critical" },
    { type: "Error de Configuración", count: 2, severity: "medium" },
    { type: "Violación de Política", count: 1, severity: "high" },
    { type: "Problema de Red", count: 1, severity: "low" },
  ];

  const recentExceptions = [
    { id: "EXC-001", description: "Falla en backup diario base de datos", status: "open", days: 2 },
    { id: "EXC-002", description: "Acceso no autorizado detectado", status: "in_progress", days: 1 },
    { id: "EXC-003", description: "Configuración firewall incorrecta", status: "open", days: 5 },
  ];

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
      case "open":
        return "destructive";
      case "in_progress":
        return "warning";
      case "closed":
        return "success";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open":
        return "Abierto";
      case "in_progress":
        return "En Progreso";
      case "closed":
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
              {topIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{issue.type}</p>
                    <p className="text-xs text-muted-foreground">{issue.count} ocurrencias</p>
                  </div>
                  <Badge variant={getSeverityColor(issue.severity) as any}>
                    {issue.severity === "critical" && "Crítico"}
                    {issue.severity === "high" && "Alto"}
                    {issue.severity === "medium" && "Medio"}
                    {issue.severity === "low" && "Bajo"}
                  </Badge>
                </div>
              ))}
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
              {recentExceptions.map((exception) => (
                <div key={exception.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary">{exception.id}</p>
                      <Badge variant={getStatusColor(exception.status) as any} className="text-xs">
                        {getStatusText(exception.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{exception.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Clock className="inline h-3 w-3" /> {exception.days} días
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
