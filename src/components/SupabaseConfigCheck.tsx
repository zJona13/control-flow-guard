import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const SupabaseConfigCheck: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    setLoading(true);
    try {
      // Verificar usuarios existentes (esta consulta debería funcionar)
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        console.error('Error checking users:', usersError);
        // Intentar método alternativo
        const { data: { user } } = await supabase.auth.getUser();
        setConfig({ 
          currentUser: user,
          usersError: usersError.message,
          authWorking: !!user 
        });
      } else {
        setConfig({ 
          users: users.users || [],
          authWorking: true 
        });
      }

      // Probar operaciones básicas de autenticación
      const { data: { session } } = await supabase.auth.getSession();
      setConfig(prev => ({ 
        ...prev, 
        hasSession: !!session,
        sessionUser: session?.user 
      }));

    } catch (err) {
      console.error('Config check exception:', err);
      setConfig({ error: 'Error inesperado al verificar configuración' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Verificación de Configuración Supabase
        </CardTitle>
        <CardDescription>Estado de configuración de autenticación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Verificando configuración...</p>
          </div>
        ) : config?.error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error de Configuración</span>
            </div>
            <p className="text-sm text-red-600 mt-2">{config.error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Estado de Autenticación</h4>
              <div className="p-3 bg-gray-100 rounded-md space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Autenticación funcionando</span>
                  {getStatusIcon(config?.authWorking || false)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Sesión activa</span>
                  {getStatusIcon(config?.hasSession || false)}
                </div>
                {config?.sessionUser && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Usuario actual</span>
                    <span className="font-mono text-xs">{config.sessionUser.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Usuarios Registrados</h4>
              <div className="p-3 bg-gray-100 rounded-md">
                {config?.users?.length > 0 ? (
                  <div className="space-y-2">
                    {config.users.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between text-sm">
                        <span>{user.email}</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(!!user.email_confirmed_at)}
                          <span className="text-xs text-gray-500">
                            {user.email_confirmed_at ? 'Confirmado' : 'Sin confirmar'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : config?.usersError ? (
                  <div className="text-sm text-red-600">
                    <p>Error: {config.usersError}</p>
                    <p className="text-xs mt-1">Esto es normal - no tienes permisos de admin</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No se pudieron obtener usuarios</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="font-medium text-yellow-800 mb-2">Posibles Soluciones:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Verifica que el signup esté habilitado en Supabase Dashboard</li>
                <li>• Si usas confirmación de email, verifica tu email después del registro</li>
                <li>• Revisa los logs de Supabase para más detalles</li>
                <li>• Ejecuta el script check_supabase_auth_config.sql</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={checkConfig} variant="outline">
            Verificar Nuevamente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
