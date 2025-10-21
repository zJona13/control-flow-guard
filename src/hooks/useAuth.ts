import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['perfiles']['Row'];
type UserRole = Database['public']['Enums']['rol_usuario'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      } else {
        // Create profile if it doesn't exist
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await createUserProfile(user.user);
        }
      }

      // El rol está en la tabla perfiles como 'area'
      if (profileData) {
        setUserRole(profileData.area);
      }
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (user: User) => {
    try {
      const fullName = user.user_metadata?.full_name || '';
      const [nombres, ...apellidosArray] = fullName.split(' ');
      const apellidos = apellidosArray.join(' ') || '';

      const { data, error } = await supabase
        .from('perfiles')
        .insert({
          id: user.id,
          nombres: nombres || 'Usuario',
          apellidos: apellidos || 'Sin Apellido',
          area: 'CLINICO', // Rol por defecto
          creado_en: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
      } else if (data) {
        setProfile(data);
        setUserRole(data.area);
      }
    } catch (error) {
      console.error('Unexpected error creating profile:', error);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return { error };
    }
    return { error: null };
  };

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.includes(userRole as UserRole);
  };

  return {
    user,
    session,
    profile,
    userRole,
    loading,
    signOut,
    hasRole,
    hasAnyRole,
  };
};
