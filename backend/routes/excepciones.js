import express from 'express';
import { body } from 'express-validator';
import { 
  getExcepciones, 
  createExcepcion, 
  updateExcepcion, 
  getEstadisticas,
  getTiUsers,
  assignResponsable
} from '../controllers/excepcionesController.js';
import { authenticateToken, requireAnyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validaciones
const createExcepcionValidation = [
  body('descripcion').isLength({ min: 10, max: 1000 }).withMessage('Descripción debe tener entre 10 y 1000 caracteres'),
  body('categoria').isIn(['FALLA_BACKUP', 'ACCESO_INAPROPIADO', 'INCIDENTE_SEGURIDAD', 'DISPONIBILIDAD', 'OTRO']).withMessage('Categoría inválida')
];

const assignResponsableValidation = [
  body('responsable_id').optional().isUUID().withMessage('ID de responsable inválido'),
  body('fecha_limite').optional().isISO8601().withMessage('Fecha límite inválida')
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/', getExcepciones);
router.post('/', requireAnyRole('TI', 'ADMIN', 'CLINICO'), createExcepcionValidation, createExcepcion);
router.patch('/:id', updateExcepcion);
router.get('/estadisticas', requireAnyRole('TI', 'ADMIN', 'CLINICO'), getEstadisticas);
router.get('/ti-users', requireAnyRole('ADMIN'), getTiUsers);
router.patch('/:id/assign', requireAnyRole('ADMIN'), assignResponsableValidation, assignResponsable);

export default router;

