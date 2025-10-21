import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const EnvDebug: React.FC = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const getKeyStatus = () => {
    if (!supabaseKey) return { status: 'missing', label: 'No encontrada' };
    if (supabaseKey.length < 50) return { status: 'incomplete', label: 'Incompleta' };
    if (supabaseKey.length >= 50) return { status: 'complete', label: 'Completa' };
    return { status: 'unknown', label: 'Desconocido' };
  };

  const keyStatus = getKeyStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Debug de Variables de Entorno</CardTitle>
        <CardDescription>Verificación de configuración de Supabase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">VITE_SUPABASE_URL</h4>
          <div className="p-3 bg-gray-100 rounded-md">
            <code className="text-sm">
              {supabaseUrl || 'No definida'}
            </code>
          </div>
          <Badge variant={supabaseUrl ? "default" : "destructive"} className="mt-2">
            {supabaseUrl ? 'Configurada' : 'No configurada'}
          </Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">VITE_SUPABASE_PUBLISHABLE_KEY</h4>
          <div className="p-3 bg-gray-100 rounded-md">
            <code className="text-sm break-all">
              {supabaseKey ? `${supabaseKey.substring(0, 50)}...` : 'No definida'}
            </code>
          </div>
          <div className="mt-2 flex gap-2">
            <Badge variant={
              keyStatus.status === 'complete' ? 'default' : 
              keyStatus.status === 'incomplete' ? 'destructive' : 
              'secondary'
            }>
              {keyStatus.label}
            </Badge>
            {supabaseKey && (
              <Badge variant="outline">
                {supabaseKey.length} caracteres
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800 mb-2">Instrucciones:</h4>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Ve a tu dashboard de Supabase</li>
            <li>2. Copia la URL del proyecto</li>
            <li>3. Copia la clave "anon public" completa</li>
            <li>4. Actualiza el archivo .env</li>
            <li>5. Reinicia el servidor de desarrollo</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
