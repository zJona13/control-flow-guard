import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const AuthTestSimple: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('123456');

  const testSignUp = async () => {
    setLoading(true);
    try {
      console.log('Testing signup with:', { email, password });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Signup result:', { data, error });

      if (error) {
        toast({
          title: "Error en registro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registro exitoso",
          description: "Usuario creado correctamente",
        });
      }
    } catch (err) {
      console.error('Signup exception:', err);
      toast({
        title: "Error inesperado",
        description: "Error al crear usuario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      console.log('Testing signin with:', { email, password });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Signin result:', { data, error });

      if (error) {
        toast({
          title: "Error en inicio de sesión",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Inicio de sesión exitoso",
          description: "Usuario autenticado correctamente",
        });
      }
    } catch (err) {
      console.error('Signin exception:', err);
      toast({
        title: "Error inesperado",
        description: "Error al iniciar sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Prueba Simple de Auth</CardTitle>
        <CardDescription>Test directo sin validaciones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@test.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="123456"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={testSignUp} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Registro
          </Button>
          <Button 
            onClick={testSignIn} 
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Login
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          <p>Revisa la consola del navegador para ver los logs detallados.</p>
        </div>
      </CardContent>
    </Card>
  );
};
