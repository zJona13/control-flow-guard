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
  body('fecha_hora').isISO8601().withMessage('Fecha y hora inválida')
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/', requireAnyRole('CLINICO', 'ADMIN'), getCitas);
router.get('/hoy', requireAnyRole('CLINICO', 'ADMIN'), getCitasDelDia);
router.post('/', requireAnyRole('CLINICO', 'ADMIN'), createCitaValidation, createCita);
router.patch('/:id', requireAnyRole('CLINICO', 'ADMIN'), updateCita);
router.get('/export', requireAnyRole('CLINICO', 'ADMIN'), exportCitas);

export default router;

