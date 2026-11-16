import { Router } from 'express';
import { calculateAvailability, getUnlockedDays } from '../services/availability';
import { Modality } from '@prisma/client';

export const availabilityRouter = Router();

// Consultar días habilitados / desbloqueados a futuro
availabilityRouter.get('/open-days', async (req, res) => {
  try {
    const { professionalId } = req.query;
    const profIdStr = typeof professionalId === 'string' && professionalId !== 'all' ? professionalId : undefined;

    const openDays = await getUnlockedDays(profIdStr);
    res.json({ professionalId: profIdStr || 'all', openDays });
  } catch (error: any) {
    console.error('Error al consultar días habilitados:', error);
    res.status(500).json({ error: error.message || 'Error al obtener días disponibles' });
  }
});

// Consultar franjas horarias de un día específico desbloqueado
availabilityRouter.get('/', async (req, res) => {
  try {
    const { professionalId, serviceId, packageId, modality, date } = req.query;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'La fecha debe estar en formato YYYY-MM-DD' });
    }

    const profIdStr = typeof professionalId === 'string' && professionalId !== 'all' ? professionalId : undefined;
    const resolvedModality = modality === 'HOME_VISIT' ? Modality.HOME_VISIT : Modality.AT_STATION;

    const slots = await calculateAvailability({
      professionalId: profIdStr,
      serviceId: typeof serviceId === 'string' ? serviceId : undefined,
      packageId: typeof packageId === 'string' ? packageId : undefined,
      modality: resolvedModality,
      dateStr: date
    });

    res.json({ date, professionalId: profIdStr || 'all', slots });
  } catch (error: any) {
    console.error('Error calculando disponibilidad:', error);
    res.status(500).json({ error: error.message || 'Error al calcular la disponibilidad' });
  }
});
