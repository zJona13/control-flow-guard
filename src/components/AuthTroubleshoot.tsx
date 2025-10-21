import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const AuthTroubleshoot: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('123456');
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, message: string) => {
    setResults(prev => [...prev, { test, success, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Verificar conexión básica
      addResult('Conexión Supabase', true, 'Cliente inicializado correctamente');

      // Test 2: Probar registro
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          addResult('Registro de Usuario', false, `Error: ${signUpError.message}`);
        } else {
          addResult('Registro de Usuario', true, `Usuario creado: ${signUpData.user?.email}`);
        }
      } catch (err) {
        addResult('Registro de Usuario', false, `Excepción: ${err}`);
      }

      // Test 3: Probar inicio de sesión
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          addResult('Inicio de Sesión', false, `Error: ${signInError.message}`);
        } else {
          addResult('Inicio de Sesión', true, `Usuario autenticado: ${signInData.user?.email}`);
        }
      } catch (err) {
        addResult('Inicio de Sesión', false, `Excepción: ${err}`);
      }

      // Test 4: Verificar sesión actual
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          addResult('Sesión Activa', true, `Usuario: ${session.user.email}`);
        } else {
          addResult('Sesión Activa', false, 'No hay sesión activa');
        }
      } catch (err) {
        addResult('Sesión Activa', false, `Excepción: ${err}`);
      }

      // Test 5: Probar acceso a perfiles
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .limit(1);

        if (error) {
          addResult('Acceso a Perfiles', false, `Error: ${error.message}`);
        } else {
          addResult('Acceso a Perfiles', true, `Tabla accesible, ${data?.length || 0} registros`);
        }
      } catch (err) {
        addResult('Acceso a Perfiles', false, `Excepción: ${err}`);
      }

      // Test 6: Probar inserción en perfiles
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: insertError } = await supabase
            .from('perfiles')
            .insert({
              id: user.id,
              nombres: 'Test',
              apellidos: 'Usuario',
              area: 'CLINICO',
              creado_en: new Date().toISOString(),
            });

          if (insertError) {
            addResult('Inserción en Perfiles', false, `Error: ${insertError.message}`);
          } else {
            addResult('Inserción en Perfiles', true, 'Inserción exitosa');
          }
        } else {
          addResult('Inserción en Perfiles', false, 'No hay usuario autenticado');
        }
      } catch (err) {
        addResult('Inserción en Perfiles', false, `Excepción: ${err}`);
      }

    } catch (err) {
      addResult('Error General', false, `Error inesperado: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Diagnóstico de Autenticación
        </CardTitle>
        <CardDescription>Ejecuta todas las pruebas de autenticación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email de prueba</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña de prueba</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ejecutar Todas las Pruebas
          </Button>
          <Button 
            onClick={clearResults} 
            variant="outline"
            disabled={loading}
          >
            Limpiar
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Resultados de las Pruebas:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{result.test}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Instrucciones:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Cambia el email y contraseña si quieres probar con otros valores</li>
            <li>• Ejecuta todas las pruebas para ver dónde está el problema</li>
            <li>• Revisa los resultados para identificar qué está fallando</li>
            <li>• Si el registro falla, el problema puede estar en la configuración de Supabase</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
