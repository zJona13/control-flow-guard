import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, logout, getUsers, updateUser, toggleUserStatus } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validaciones
const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombres').notEmpty().withMessage('Nombres es requerido'),
  body('apellidos').notEmpty().withMessage('Apellidos es requerido'),
  body('area').isIn(['ADMIN', 'TI', 'CLINICO']).withMessage('Rol inválido')
];

const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña es requerida')
];

// Rutas públicas
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, getUsers);
router.patch('/users/:id', authenticateToken, updateUser);
router.patch('/users/:id/toggle-status', authenticateToken, toggleUserStatus);
router.post('/logout', authenticateToken, logout);

export default router;

