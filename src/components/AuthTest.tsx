import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const AuthTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('test@test.com');
  const [testPassword, setTestPassword] = useState('123456');

  const testSignUp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (error) {
        toast({
          title: "Error en registro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registro exitoso",
          description: "Usuario de prueba creado correctamente",
        });
      }
    } catch (err) {
      toast({
        title: "Error inesperado",
        description: "Error al crear usuario de prueba",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

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
        <CardTitle>Prueba de Autenticación</CardTitle>
        <CardDescription>Test rápido de registro y login</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="testEmail">Email de Prueba</Label>
          <Input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@test.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="testPassword">Contraseña de Prueba</Label>
          <Input
            id="testPassword"
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
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
      </CardContent>
    </Card>
  );
};
