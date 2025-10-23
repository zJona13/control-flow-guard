import express from 'express';
import { body } from 'express-validator';
import { 
  getCitas, 
  createCita, 
  updateCita, 
  exportCitas,
  getCitasDelDia 
} from '../controllers/citasController.js';
import { authenticateToken, requireAnyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validaciones
const createCitaValidation = [
  body('dni').matches(/^\d{8}$/).withMessage('DNI debe tener 8 dígitos'),
  body('nombre_completo').isLength({ min: 3, max: 200 }).withMessage('Nombre completo debe tener entre 3 y 200 caracteres'),
  body('servicio').notEmpty().withMessage('Servicio es requerido'),
  body('medico_asignado').notEmpty().withMessage('Médico asignado es requerido'),
  body('fecha').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha inválido. Use YYYY-MM-DD'),
  body('hora').matches(/^\d{2}:\d{2}$/).withMessage('Formato de hora inválido. Use HH:MM')
];

const updateCitaValidation = [
  body('estado').optional().isIn(['PROGRAMADA', 'ATENDIDA', 'CANCELADA']).withMessage('Estado inválido'),
  body('fecha').optional().custom((value) => {
    if (!value) return true; // Si no se proporciona, está bien
    if (typeof value !== 'string') return false;
    // Permitir tanto YYYY-MM-DD como otros formatos de fecha
    return /^\d{4}-\d{2}-\d{2}$/.test(value) || !isNaN(Date.parse(value));
  }).withMessage('Formato de fecha inválido'),
  body('hora').optional().custom((value) => {
    if (!value) return true; // Si no se proporciona, está bien
    if (typeof value !== 'string') return false;
    // Permitir HH:MM o HH:MM:SS
    return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
  }).withMessage('Formato de hora inválido')
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/', requireAnyRole('CLINICO', 'ADMIN'), getCitas);
router.get('/hoy', requireAnyRole('CLINICO', 'ADMIN'), getCitasDelDia);
router.post('/', requireAnyRole('CLINICO', 'ADMIN'), createCitaValidation, createCita);
router.patch('/:id', requireAnyRole('CLINICO', 'ADMIN'), updateCitaValidation, updateCita);
router.get('/export', requireAnyRole('CLINICO', 'ADMIN'), exportCitas);

export default router;

