import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2 } from "lucide-react";
import { SupabaseConnectionTest } from "@/components/SupabaseConnectionTest";
import { EnvDebug } from "@/components/EnvDebug";
import { AuthTest } from "@/components/AuthTest";
import { AuthDebug } from "@/components/AuthDebug";
import { AuthTestSimple } from "@/components/AuthTestSimple";
import { SupabaseConfigCheck } from "@/components/SupabaseConfigCheck";
import { AuthTroubleshoot } from "@/components/AuthTroubleshoot";

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
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExceptions = async () => {
      try {
        const { data, error } = await supabase
          .from("control_excepciones")
          .select("*")
          .order("creado_en", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching exceptions:", error);
          // Si hay error, mostrar datos vacíos en lugar de fallar
          setExceptions([]);
        } else if (data) {
          setExceptions(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setExceptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExceptions();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel("dashboard-exceptions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "control_excepciones",
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

  // Calcular estadísticas en tiempo real
  const openExceptions = exceptions.filter((e) => e.estado === "ABIERTO").length;
  const closedExceptions = exceptions.filter((e) => e.estado === "CERRADO").length;
  const inProgressExceptions = exceptions.filter((e) => e.estado === "EN_PROGRESO").length;

  // Calcular top issues
  const categoryCount: Record<string, number> = {};
  exceptions.forEach((exc) => {
    categoryCount[exc.categoria] = (categoryCount[exc.categoria] || 0) + 1;
  });

  const topIssues = Object.entries(categoryCount)
    .map(([category, count]) => ({
      type: getCategoryLabel(category),
      count,
      severity: count > 3 ? "critical" : count > 2 ? "high" : count > 1 ? "medium" : "low",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
      value: exceptions.length.toString(),
      change: "Registradas",
      trend: "up",
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Tasa de Cumplimiento",
      value: exceptions.length > 0 ? `${Math.round((closedExceptions / exceptions.length) * 100)}%` : "0%",
      change: "Del total",
      trend: "up",
      icon: TrendingUp,
      color: "text-success",
    },
  ];

  const recentExceptions = exceptions.slice(0, 3).map((exc) => ({
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

      {/* Debug Components */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <AuthTroubleshoot />
        </div>
        <div className="flex justify-center">
          <SupabaseConfigCheck />
        </div>
        <div className="flex justify-center">
          <AuthDebug />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex justify-center">
            <AuthTestSimple />
          </div>
          <div className="flex justify-center">
            <AuthTest />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex justify-center">
            <SupabaseConnectionTest />
          </div>
          <div className="flex justify-center">
            <EnvDebug />
          </div>
          <div className="flex justify-center">
            <AuthDebug />
          </div>
        </div>
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
