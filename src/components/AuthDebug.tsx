import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, Database, AlertCircle } from 'lucide-react';
import { testDatabasePermissions } from '@/utils/testPermissions';

export const AuthDebug: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<any>(null);
  const [testingPermissions, setTestingPermissions] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        setUser(user);
        setSession(session);

        // Intentar obtener perfiles para probar permisos
        if (user) {
          const { data: perfilesData, error } = await supabase
            .from('perfiles')
            .select('*');
          
          if (error) {
            console.error('Error fetching perfiles:', error);
          } else {
            setPerfiles(perfilesData || []);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const testPermissions = async () => {
    setTestingPermissions(true);
    try {
      const results = await testDatabasePermissions();
      setPermissions(results);
    } catch (error) {
      console.error('Error testing permissions:', error);
    } finally {
      setTestingPermissions(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Debug de Autenticación
        </CardTitle>
        <CardDescription>Verificación de permisos y estado de usuario</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Usuario
            </h4>
            <div className="p-3 bg-gray-100 rounded-md">
              {user ? (
                <div className="text-sm">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Autenticado:</strong> ✅</p>
                </div>
              ) : (
                <p className="text-sm text-red-600">❌ No autenticado</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Sesión
            </h4>
            <div className="p-3 bg-gray-100 rounded-md">
              {session ? (
                <div className="text-sm">
                  <p><strong>Activa:</strong> ✅</p>
                  <p><strong>Acceso:</strong> {session.access_token ? '✅' : '❌'}</p>
                </div>
              ) : (
                <p className="text-sm text-red-600">❌ Sin sesión</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Perfiles en BD</h4>
          <div className="p-3 bg-gray-100 rounded-md">
            {perfiles.length > 0 ? (
              <div className="text-sm">
                <p><strong>Total:</strong> {perfiles.length}</p>
                {perfiles.map((p) => (
                  <p key={p.id}>- {p.nombres} {p.apellidos} ({p.area})</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No hay perfiles o sin permisos</p>
            )}
          </div>
        </div>

        {permissions && (
          <div>
            <h4 className="font-medium mb-2">Resultados de Permisos</h4>
            <div className="p-3 bg-gray-100 rounded-md space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Autenticación: {permissions.auth ? '✅' : '❌'}</div>
                <div>Perfiles (lectura): {permissions.perfiles_read ? '✅' : '❌'}</div>
                <div>Perfiles (inserción): {permissions.perfiles_insert ? '✅' : '❌'}</div>
                <div>Excepciones (lectura): {permissions.control_excepciones_read ? '✅' : '❌'}</div>
                <div>Citas (lectura): {permissions.citas_contingencia_read ? '✅' : '❌'}</div>
              </div>
              {permissions.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">Errores:</p>
                  {permissions.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">- {error}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testPermissions} 
            variant="outline"
            disabled={testingPermissions}
          >
            {testingPermissions ? 'Probando...' : 'Probar Permisos'}
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Recargar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
