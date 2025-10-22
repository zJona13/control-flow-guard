import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Registro de usuario
export const register = async (req, res) => {
  try {
    // Validar errores de express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, nombres, apellidos, area } = req.body;

    // Validar que el área sea válida
    if (!['ADMIN', 'TI', 'CLINICO'].includes(area)) {
      return res.status(400).json({ error: 'Área inválida' });
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario (el trigger asignará automáticamente el UUID)
    await pool.query(
      'INSERT INTO usuarios (email, password_hash, nombres, apellidos, area) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, nombres, apellidos, area]
    );

    // Obtener el usuario creado usando el email
    const [users] = await pool.query(
      'SELECT id, email, nombres, apellidos, area, creado_en FROM usuarios WHERE email = ?',
      [email]
    );

    const user = users[0];

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, area: user.area },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        area: user.area
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login de usuario
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario
    const [users] = await pool.query(
      'SELECT id, email, password_hash, nombres, apellidos, area, activo FROM usuarios WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = users[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, area: user.area },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        area: user.area
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, nombres, apellidos, area, creado_en FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// Logout (en el frontend se elimina el token)
export const logout = async (req, res) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
};

// Obtener todos los usuarios (solo ADMIN)
export const getUsers = async (req, res) => {
  try {
    const userRole = req.user.area;

    // Verificar permisos - solo ADMIN puede ver usuarios
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'No tiene permisos para ver usuarios' });
    }

    const [users] = await pool.query(`
      SELECT 
        id,
        email,
        nombres,
        apellidos,
        area,
        activo,
        creado_en
      FROM usuarios 
      ORDER BY creado_en DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Actualizar usuario (solo ADMIN)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, area, activo } = req.body;
    const userRole = req.user.area;

    // Verificar permisos - solo ADMIN puede actualizar usuarios
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'No tiene permisos para actualizar usuarios' });
    }

    // Verificar que el usuario existe
    const [users] = await pool.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar área si se proporciona
    if (area && !['ADMIN', 'TI', 'CLINICO'].includes(area)) {
      return res.status(400).json({ error: 'Área inválida' });
    }

    // Construir la consulta de actualización dinámicamente
    let updateFields = [];
    let updateValues = [];

    if (nombres !== undefined) {
      updateFields.push('nombres = ?');
      updateValues.push(nombres);
    }

    if (apellidos !== undefined) {
      updateFields.push('apellidos = ?');
      updateValues.push(apellidos);
    }

    if (area !== undefined) {
      updateFields.push('area = ?');
      updateValues.push(area);
    }

    if (activo !== undefined) {
      updateFields.push('activo = ?');
      updateValues.push(activo ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Obtener el usuario actualizado
    const [updatedUsers] = await pool.query(
      'SELECT id, email, nombres, apellidos, area, activo, creado_en FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Desactivar/Activar usuario (solo ADMIN)
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.area;

    // Verificar permisos - solo ADMIN puede cambiar estado de usuarios
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'No tiene permisos para cambiar estado de usuarios' });
    }

    // Verificar que el usuario existe
    const [users] = await pool.query(
      'SELECT id, activo FROM usuarios WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const currentStatus = users[0].activo;
    const newStatus = currentStatus ? 0 : 1;

    await pool.query(
      'UPDATE usuarios SET activo = ? WHERE id = ?',
      [newStatus, id]
    );

    // Obtener el usuario actualizado
    const [updatedUsers] = await pool.query(
      'SELECT id, email, nombres, apellidos, area, activo, creado_en FROM usuarios WHERE id = ?',
      [id]
    );

    res.json({
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

export default { register, login, getProfile, logout, getUsers, updateUser, toggleUserStatus };

