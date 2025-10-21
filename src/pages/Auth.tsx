import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  .max(255, "Email demasiado largo")
  .refine((email) => {
    // Permitir emails de dominios comunes para desarrollo
    const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'essalud.gob.pe', 'test.com'];
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  }, "Dominio de email no permitido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100, "Contraseña demasiado larga");

type UserRole = "ADMIN" | "TI" | "CONTROL_INTERNO" | "ADMISION" | "CLINICO";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("CLINICO");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);
      
      if (!fullName.trim()) {
        throw new Error("El nombre completo es requerido");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Error",
            description: "Este email ya está registrado. Intente iniciar sesión.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Crear perfil del usuario automáticamente
        try {
          const [nombres, ...apellidosArray] = fullName.split(' ');
          const apellidos = apellidosArray.join(' ') || '';

          await supabase.from('perfiles').insert({
            id: data.user.id,
            nombres: nombres || 'Usuario',
            apellidos: apellidos || 'Sin Apellido',
            area: role,
            creado_en: new Date().toISOString(),
          });
        } catch (profileError) {
          console.warn('Error creating user profile:', profileError);
          // Continuar aunque falle la creación del perfil
        }

        toast({
          title: "Registro exitoso",
          description: "Su cuenta ha sido creada. Puede iniciar sesión ahora.",
        });
        setIsLogin(true);
        
        // Limpiar el formulario
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("CLINICO");
      }
    } catch (err) {
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        
        // Manejar diferentes tipos de errores
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Error de autenticación",
            description: "Email o contraseña incorrectos",
            variant: "destructive",
          });
        } else if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email no confirmado",
            description: "Por favor confirma tu email antes de iniciar sesión",
            variant: "destructive",
          });
        } else if (error.message.includes("Too many requests")) {
          toast({
            title: "Demasiados intentos",
            description: "Espera unos minutos antes de intentar nuevamente",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error de autenticación",
            description: `Error: ${error.message}`,
            variant: "destructive",
          });
        }
        return;
      }

      // Verificar que el usuario se autenticó correctamente
      if (data.user) {
        console.log("User authenticated:", data.user);
      }

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema",
      });
      navigate("/");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: err.issues[0].message,
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
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  placeholder="Juan Pérez García"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
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
              onClick={() => setIsLogin(!isLogin)}
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
