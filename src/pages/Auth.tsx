import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string()
  .email("Email inválido")
  .max(255, "Email demasiado largo");

const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100, "Contraseña demasiado larga");

type UserRole = "ADMIN" | "TI" | "CONTROL_INTERNO" | "ADMISION" | "CLINICO";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [role, setRole] = useState<UserRole>("CLINICO");

  useEffect(() => {
    // Verificar si ya hay sesión
    const token = localStorage.getItem('token');
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);
      
      if (!nombres.trim() || !apellidos.trim()) {
        throw new Error("Los nombres y apellidos son requeridos");
      }

      const response = await authAPI.register({
        email,
        password,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        area: role,
      });

      // Guardar token y usuario
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      toast({
        title: "Registro exitoso",
        description: "Su cuenta ha sido creada exitosamente",
      });

      // Redirigir al dashboard
      navigate("/");
    } catch (err) {
      console.error('Error en registro:', err);
      
      if (err instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: err.issues[0].message,
          variant: "destructive",
        });
      } else if (err instanceof Error) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const error = err as any;
        toast({
          title: "Error al registrar",
          description: error.response?.data?.error || "Error al registrar usuario",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);

      const response = await authAPI.login(email, password);

      // Guardar token y usuario
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${response.user.nombres}`,
      });

      // Redirigir al dashboard
      navigate("/");
    } catch (err) {
      console.error('Error en login:', err);
      
      if (err instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: err.issues[0].message,
          variant: "destructive",
        });
      } else if (typeof err === 'object' && err !== null && 'response' in err) {
        const error = err as any;
        const errorMessage = error.response?.data?.error || "Error al iniciar sesión";
        
        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Error inesperado al iniciar sesión",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">HL</span>
            </div>
          </div>
          <CardTitle className="text-center">Hospital Luis Heysen de EsSalud</CardTitle>
          <CardDescription className="text-center">
            {isLogin ? "Inicie sesión en su cuenta" : "Registre una nueva cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    placeholder="Juan"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    placeholder="Pérez García"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@essalud.gob.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="role">Rol en el Sistema</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TI">Tecnología de Información</SelectItem>
                    <SelectItem value="CONTROL_INTERNO">Control Interno</SelectItem>
                    <SelectItem value="ADMISION">Personal de Admisión</SelectItem>
                    <SelectItem value="CLINICO">Personal Clínico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Iniciar Sesión" : "Registrarse"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail("");
                setPassword("");
                setNombres("");
                setApellidos("");
                setRole("CLINICO");
              }}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isLogin ? "¿No tiene cuenta? Regístrese" : "¿Ya tiene cuenta? Inicie sesión"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
