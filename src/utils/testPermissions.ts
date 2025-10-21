import { supabase } from '@/integrations/supabase/client';

export const testDatabasePermissions = async () => {
  const results = {
    auth: false,
    perfiles_read: false,
    perfiles_insert: false,
    control_excepciones_read: false,
    control_excepciones_insert: false,
    citas_contingencia_read: false,
    citas_contingencia_insert: false,
    errors: [] as string[]
  };

  try {
    // 1. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      results.errors.push(`Auth error: ${authError.message}`);
    } else if (user) {
      results.auth = true;
      
      // 2. Probar lectura de perfiles
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .limit(1);
        
        if (error) {
          results.errors.push(`Perfiles read error: ${error.message}`);
        } else {
          results.perfiles_read = true;
        }
      } catch (err) {
        results.errors.push(`Perfiles read exception: ${err}`);
      }

      // 3. Probar inserción en perfiles (solo si no existe)
      try {
        const testProfile = {
          id: user.id,
          nombres: 'Test',
          apellidos: 'Usuario',
          area: 'CLINICO',
          creado_en: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('perfiles')
          .upsert(testProfile, { onConflict: 'id' });

        if (error) {
          results.errors.push(`Perfiles insert error: ${error.message}`);
        } else {
          results.perfiles_insert = true;
        }
      } catch (err) {
        results.errors.push(`Perfiles insert exception: ${err}`);
      }

      // 4. Probar lectura de control_excepciones
      try {
        const { data, error } = await supabase
          .from('control_excepciones')
          .select('*')
          .limit(1);
        
        if (error) {
          results.errors.push(`Control excepciones read error: ${error.message}`);
        } else {
          results.control_excepciones_read = true;
        }
      } catch (err) {
        results.errors.push(`Control excepciones read exception: ${err}`);
      }

      // 5. Probar lectura de citas_contingencia
      try {
        const { data, error } = await supabase
          .from('citas_contingencia')
          .select('*')
          .limit(1);
        
        if (error) {
          results.errors.push(`Citas contingencia read error: ${error.message}`);
        } else {
          results.citas_contingencia_read = true;
        }
      } catch (err) {
        results.errors.push(`Citas contingencia read exception: ${err}`);
      }
    } else {
      results.errors.push('No user authenticated');
    }
  } catch (err) {
    results.errors.push(`General error: ${err}`);
  }

  return results;
};
