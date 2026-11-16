import { Router } from 'express';
import { CreateBookingSchema } from '@cano/shared';
import { createBooking } from '../services/booking';
import { prisma } from '../prisma';

export const bookingRouter = Router();

bookingRouter.post('/', async (req, res) => {
  try {
    const parseResult = CreateBookingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de reserva inválidos',
        issues: parseResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }

    const booking = await createBooking(parseResult.data);

    res.status(201).json({
      message: 'Solicitud de reserva recibida con éxito',
      booking: {
        id: booking.id,
        referenceCode: booking.referenceCode,
        clientName: booking.clientName,
        serviceName: booking.snapshotServiceName,
        durationMinutes: booking.snapshotDurationMinutes,
        modality: booking.modality,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        priceBaseCRC: booking.snapshotPriceCRC,
        locationFeeCRC: booking.snapshotLocationFeeCRC || 0,
        discountCRC: booking.snapshotDiscountCRC,
        totalCRC: booking.snapshotTotalCRC,
        status: booking.status,
        professional: booking.professional ? {
          id: booking.professional.id,
          name: booking.professional.name
        } : null
      }
    });
  } catch (error: any) {
    console.error('Error al procesar reserva:', error);
    res.status(400).json({ error: error.message || 'Error al procesar la solicitud de cita' });
  }
});

bookingRouter.get('/:referenceCode', async (req, res) => {
  try {
    const { referenceCode } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { referenceCode },
      include: {
        professional: true,
        locationDiscount: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada con ese código' });
    }

    // Respuesta pública segura: omitir teléfono completo del cliente
    res.json({
      referenceCode: booking.referenceCode,
      clientName: booking.clientName,
      serviceName: booking.snapshotServiceName,
      durationMinutes: booking.snapshotDurationMinutes,
      modality: booking.modality,
      locationName: booking.locationDiscount?.name || null,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      totalCRC: booking.snapshotTotalCRC,
      status: booking.status,
      professional: {
        name: booking.professional?.name || 'Por asignar'
      }
    });
  } catch (error: any) {
    console.error('Error al consultar reserva:', error);
    res.status(500).json({ error: 'Error al consultar el estado de la reserva' });
  }
});
