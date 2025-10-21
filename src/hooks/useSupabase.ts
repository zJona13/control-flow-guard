import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSupabase = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection by fetching current user
        const { data, error } = await supabase.auth.getUser();
        
        if (error && error.message !== 'Auth session missing!') {
          throw error;
        }
        
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsConnected(false);
      }
    };

    testConnection();
  }, []);

  return { isConnected, error };
};
