import { useState, useEffect, useRef } from 'react';
import { authAPI, User } from '@/services/api';

type UserRole = 'ADMIN' | 'TI' | 'CONTROL_INTERNO' | 'ADMISION' | 'CLINICO';

interface ExtendedUser extends User {
  area: UserRole;
}

export const useAuth = () => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Timeout de seguridad para evitar carga infinita
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 segundos timeout

    // Verificar si hay token y obtener usuario
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as ExtendedUser;
          setUser(parsedUser);
          setUserRole(parsedUser.area);
          
          // Verificar que el token siga siendo válido
          try {
            await authAPI.getProfile();
          } catch (error) {
            // Si el token no es válido, limpiar
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }

      setLoading(false);
      isInitializedRef.current = true;
    };

    initAuth();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const signOut = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setUserRole(null);
      return { error: null };
    } catch (error) {
      console.error('Error signing out:', error);
      // Limpiar de todas formas
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setUserRole(null);
      return { error };
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.includes(userRole as UserRole);
  };

  return {
    user,
    profile: user, // Compatibility
    userRole,
    loading,
    signOut,
    hasRole,
    hasAnyRole,
  };
};
