import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Crear instancia de axios
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Tipos
export interface User {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  area: 'ADMIN' | 'TI' | 'CLINICO';
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface Exception {
  id: number;
  descripcion: string;
  fecha: string;
  categoria: string;
  estado: string;
  responsable_id: string | null;
  responsable_nombres?: string | null;
  responsable_apellidos?: string | null;
  responsable_email?: string | null;
  creado_por: string;
  creador_nombres?: string;
  creador_apellidos?: string;
  fecha_limite: string | null;
  creado_en: string;
  causa_raiz: string | null;
}

export interface Appointment {
  id: number;
  dni: string;
  nombre_completo: string;
  servicio: string;
  medico_asignado: string;
  fecha: string;
  hora: string;
  estado: string;
  creado_en: string;
}

// API de autenticación
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    nombres: string;
    apellidos: string;
    area: string;
  }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/api/auth/profile');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/auth/users');
    return response.data;
  },

  updateUser: async (id: string, data: {
    nombres?: string;
    apellidos?: string;
    area?: string;
    activo?: boolean;
  }): Promise<{ message: string; user: User }> => {
    const response = await api.patch<{ message: string; user: User }>(`/api/auth/users/${id}`, data);
    return response.data;
  },

  toggleUserStatus: async (id: string): Promise<{ message: string; user: User }> => {
    const response = await api.patch<{ message: string; user: User }>(`/api/auth/users/${id}/toggle-status`);
    return response.data;
  },
};

// API de excepciones
export const excepcionesAPI = {
  getAll: async (): Promise<Exception[]> => {
    const response = await api.get<Exception[]>('/api/excepciones');
    return response.data;
  },

  create: async (data: {
    descripcion: string;
    categoria: string;
    fecha?: string;
  }): Promise<{ message: string; excepcion: Exception }> => {
    const response = await api.post('/api/excepciones', data);
    return response.data;
  },

  update: async (
    id: number,
    data: { estado?: string; causa_raiz?: string }
  ): Promise<{ message: string; excepcion: Exception }> => {
    const response = await api.patch(`/api/excepciones/${id}`, data);
    return response.data;
  },

  getTiUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/excepciones/ti-users');
    return response.data;
  },

  assignResponsable: async (
    id: number,
    data: { responsable_id?: string; fecha_limite?: string }
  ): Promise<{ message: string; excepcion: Exception }> => {
    const response = await api.patch(`/api/excepciones/${id}/assign`, data);
    return response.data;
  },

  getEstadisticas: async (): Promise<{
    porEstado: Array<{ estado: string; total: number }>;
    topCategorias: Array<{ categoria: string; frecuencia: number }>;
    recientes: Exception[];
    vencidas: number;
  }> => {
    const response = await api.get('/api/excepciones/estadisticas');
    return response.data;
  },
};

// API de citas
export const citasAPI = {
  getAll: async (): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>('/api/citas');
    return response.data;
  },

  getHoy: async (): Promise<Appointment[]> => {
    const response = await api.get<Appointment[]>('/api/citas/hoy');
    return response.data;
  },

  create: async (data: {
    dni: string;
    nombre_completo: string;
    servicio: string;
    medico_asignado: string;
    fecha: string;
    hora: string;
  }): Promise<{ message: string; cita: Appointment }> => {
    const response = await api.post('/api/citas', data);
    return response.data;
  },

  update: async (
    id: number,
actual    data: { estado?: string; fecha?: string; hora?: string }
  ): Promise<{ message: string; cita: Appointment }> => {
    const response = await api.patch(`/api/citas/${id}`, data);
    return response.data;
  },

  export: async (): Promise<Blob> => {
    const response = await api.get('/api/citas/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;

