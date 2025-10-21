import React from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const SupabaseConnectionTest: React.FC = () => {
  const { isConnected, error } = useSupabase();

  const testDatabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Database test failed:', error);
      } else {
        console.log('Database connection test successful');
      }
    } catch (err) {
      console.error('Database test error:', err);
    }
  };

  const getStatusIcon = () => {
    if (isConnected === null) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return isConnected ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = () => {
    if (isConnected === null) {
      return <Badge variant="secondary">Verificando...</Badge>;
    }
    return isConnected ? (
      <Badge variant="default" className="bg-green-500">Conectado</Badge>
    ) : (
      <Badge variant="destructive">Error de conexión</Badge>
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Estado de Supabase
        </CardTitle>
        <CardDescription>
          Verificación de conexión a la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            {getStatusBadge()}
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {error}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Verifica que las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY estén configuradas correctamente.
              </p>
            </div>
          )}
          
          {isConnected && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                ✅ Conexión exitosa a Supabase
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testDatabaseConnection}
                className="mt-2 gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Probar Base de Datos
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
