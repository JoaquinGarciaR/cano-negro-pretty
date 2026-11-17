import { Router } from 'express';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { updateBookingStatus } from '../services/booking';
import { BookingStatus, Modality, Prisma } from '@prisma/client';
import {
  UpdateBookingStatusSchema,
  CreateTimeBlockSchema,
  SetDayAvailabilitySchema,
  BatchOpenDaysSchema,
  CreateManualBookingSchema,
  AssignBookingSchema
} from '@cano/shared';
import { setDayAvailability, batchOpenDays } from '../services/availability';
import { createManualBooking, assignBooking } from '../services/booking';

export const adminRouter = Router();

// Todas las rutas de administración requieren autenticación
adminRouter.use(requireAuth);

/**
 * Listado de reservas con detección de conflictos entre solicitudes
 */
adminRouter.get('/bookings', async (req, res) => {
  try {
    const { status, professionalId, date, startDate, endDate } = req.query;
    const user = req.user!;

    // Si es personal regular, sólo puede ver su propia agenda (la propietaria OWNER ve todas o filtra por estilista)
    const rawProfId =
      typeof professionalId === 'string' &&
      professionalId !== 'ALL' &&
      professionalId !== 'undefined' &&
      professionalId !== 'null' &&
      professionalId.trim() !== ''
        ? professionalId.trim()
        : undefined;

    const filterProfessionalId = user.role === 'STAFF' && user.professionalId
      ? user.professionalId
      : rawProfId;

    const whereClause: Prisma.BookingWhereInput = {
      businessId: user.businessId,
    };

    if (filterProfessionalId) {
      if (user.role === 'STAFF') {
        whereClause.OR = [
          { professionalId: filterProfessionalId },
          { professionalId: null }
        ];
      } else {
        if (filterProfessionalId === 'UNASSIGNED') {
          whereClause.professionalId = null;
        } else {
          whereClause.professionalId = filterProfessionalId;
        }
      }
    }

    const rawStatus =
      typeof status === 'string' &&
      status !== 'ALL' &&
      status !== 'undefined' &&
      status !== 'null'
        ? status.trim()
        : undefined;

    if (rawStatus && Object.values(BookingStatus).includes(rawStatus as any)) {
      whereClause.status = rawStatus as BookingStatus;
    }

    if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const startUTC = new Date(Date.UTC(sy, sm - 1, sd, 6, 0, 0));
      const endUTC = new Date(Date.UTC(ey, em - 1, ed + 1, 5, 59, 59));
      whereClause.startTime = { gte: startUTC, lte: endUTC };
    } else if (date && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      const dayStartUTC = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
      const dayEndUTC = new Date(Date.UTC(year, month - 1, day + 1, 5, 59, 59));
      whereClause.startTime = { gte: dayStartUTC, lte: dayEndUTC };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        professional: {
          select: { id: true, name: true, avatarUrl: true }
        },
        locationDiscount: {
          select: { id: true, name: true, discountCRC: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Cargar todas las demás reservas para detectar conflictos en citas pendientes
    const allActiveBookings = await prisma.booking.findMany({
      where: {
        businessId: user.businessId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] }
      },
      select: {
        id: true,
        professionalId: true,
        startTime: true,
        endTime: true,
        status: true,
        referenceCode: true
      }
    });

    const formatted = bookings.map(b => {
      // Detección de conflicto si la reserva está en PENDING
      let hasConflict = false;
      let conflictMessage: string | null = null;

      if (b.status === BookingStatus.PENDING) {
        const overlapping = allActiveBookings.filter(other => 
          other.id !== b.id &&
          other.professionalId === b.professionalId &&
          b.startTime < other.endTime &&
          b.endTime > other.startTime
        );

        if (overlapping.length > 0) {
          hasConflict = true;
          const confirmedMatch = overlapping.find(o => o.status === BookingStatus.CONFIRMED);
          if (confirmedMatch) {
            conflictMessage = `Coincide con la cita ya confirmada #${confirmedMatch.referenceCode}.`;
          } else {
            conflictMessage = `Coincide con otra solicitud pendiente #${overlapping[0].referenceCode}.`;
          }
        }
      }

      return {
        id: b.id,
        referenceCode: b.referenceCode,
        clientName: b.clientName,
        clientPhone: b.clientPhone, // Visible en el backoffice
        modality: b.modality,
        locationName: b.locationDiscount?.name || null,
        customAddress: b.customAddress,
        professional: b.professional,
        serviceName: b.snapshotServiceName,
        durationMinutes: b.snapshotDurationMinutes,
        priceBaseCRC: b.snapshotPriceCRC,
        locationFeeCRC: b.snapshotLocationFeeCRC || 0,
        discountCRC: b.snapshotDiscountCRC,
        totalCRC: b.snapshotTotalCRC,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        status: b.status,
        clientNotes: b.clientNotes,
        staffNotes: b.staffNotes,
        hasConflict,
        conflictMessage,
        createdAt: b.createdAt.toISOString()
      };
    });

    res.json({ bookings: formatted });
  } catch (error: any) {
    console.error('Error al obtener reservas en admin:', error);
    res.status(500).json({ error: 'Error al consultar reservas' });
  }
});

/**
 * Confirmar, rechazar, cancelar o completar reserva
 */
adminRouter.patch('/bookings/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateBookingStatusSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: parseResult.error.errors
      });
    }

    const updated = await updateBookingStatus(id, parseResult.data, req.user!.id);
    res.json({ message: 'Estado actualizado', booking: updated });
  } catch (error: any) {
    if (error.code === 'CONFLICT') {
      return res.status(409).json({
        error: error.message,
        conflictingBooking: error.conflictingBooking
      });
    }
    console.error('Error al actualizar estado:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar el estado de la reserva' });
  }
});

/**
 * Creación manual de cita por personal
 */
adminRouter.post('/bookings/manual', async (req, res) => {
  try {
    const parseResult = CreateManualBookingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Datos de cita inválidos',
        details: parseResult.error.errors
      });
    }

    const booking = await createManualBooking(parseResult.data, req.user!.id);
    res.status(201).json({ message: 'Cita manual creada exitosamente', booking });
  } catch (error: any) {
    if (error.code === 'CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error en cita manual:', error);
    res.status(400).json({ error: error.message || 'Error al crear la cita' });
  }
});

/**
 * Asignar cita a una esteticista
 */
adminRouter.patch('/bookings/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = AssignBookingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }

    const { professionalId, staffNotes } = parseResult.data;
    const updated = await assignBooking(id, professionalId, req.user!.id, staffNotes);
    res.json({ message: 'Cita asignada exitosamente', booking: updated });
  } catch (error: any) {
    if (error.code === 'CONFLICT') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error al asignar cita:', error);
    res.status(400).json({ error: error.message || 'Error al asignar la cita' });
  }
});

/**
 * Gestión de Apertura y Desbloqueo de Fechas en Agenda
 */
adminRouter.get('/availability', async (req, res) => {
  try {
    const { professionalId } = req.query;
    const user = req.user!;
    const targetProfId = user.role === 'STAFF' && user.professionalId
      ? user.professionalId
      : (typeof professionalId === 'string' ? professionalId : undefined);

    const availabilities = await prisma.dayAvailability.findMany({
      where: targetProfId ? { professionalId: targetProfId } : {},
      orderBy: { date: 'asc' }
    });

    res.json({ availabilities });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
});

adminRouter.post('/availability/open-day', async (req, res) => {
  try {
    const parseResult = SetDayAvailabilitySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }

    const record = await setDayAvailability(parseResult.data);
    res.json({ message: 'Día habilitado exitosamente', record });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al habilitar día' });
  }
});

adminRouter.post('/availability/close-day', async (req, res) => {
  try {
    const { professionalId, date } = req.body;
    if (!professionalId || !date) {
      return res.status(400).json({ error: 'professionalId y date son obligatorios' });
    }

    const record = await prisma.dayAvailability.upsert({
      where: {
        professionalId_date: { professionalId, date }
      },
      update: { isOpen: false },
      create: { professionalId, date, isOpen: false }
    });

    res.json({ message: 'Día bloqueado exitosamente', record });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al bloquear día' });
  }
});

adminRouter.post('/availability/batch-open', async (req, res) => {
  try {
    const parseResult = BatchOpenDaysSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parseResult.error.errors });
    }

    const records = await batchOpenDays(parseResult.data);
    res.json({ message: `${records.length} fechas habilitadas exitosamente`, count: records.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Error en habilitación masiva de fechas' });
  }
});

/**
 * Bloqueos de tiempo y descansos de agenda
 */
adminRouter.post('/time-blocks', async (req, res) => {
  try {
    const parseResult = CreateTimeBlockSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Datos de bloqueo inválidos', details: parseResult.error.errors });
    }

    const { professionalId, title, startTime, endTime, isBreak } = parseResult.data;

    const block = await prisma.timeBlock.create({
      data: {
        professionalId,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isBreak
      }
    });

    res.status(201).json({ message: 'Bloqueo registrado', block });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar bloqueo de tiempo' });
  }
});

adminRouter.get('/time-blocks', async (req, res) => {
  try {
    const { professionalId } = req.query;
    const blocks = await prisma.timeBlock.findMany({
      where: professionalId ? { professionalId: String(professionalId) } : {},
      orderBy: { startTime: 'asc' }
    });
    res.json({ blocks });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener bloqueos' });
  }
});

adminRouter.delete('/time-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timeBlock.delete({ where: { id } });
    res.json({ message: 'Bloqueo eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
});

/**
 * Notificaciones
 */
adminRouter.get('/notifications', async (req, res) => {
  try {
    const user = req.user!;
    const notifications = await prisma.notification.findMany({
      where: {
        businessId: user.businessId,
        ...(user.role === 'STAFF' && user.professionalId
          ? { OR: [{ professionalId: user.professionalId }, { professionalId: null }] }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

adminRouter.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
});

import { getVapidPublicKey, sendPushToUser } from '../services/push';

/**
 * Suscripción Web Push y clave pública VAPID
 */
adminRouter.get('/push/vapid-public-key', async (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

adminRouter.post('/push/test', async (req, res) => {
  try {
    const result = await sendPushToUser(req.user!.id, {
      title: 'Notificación de Prueba',
      body: '¡Excelente! Las notificaciones push están funcionando en tu dispositivo.',
      url: '/admin'
    });
    res.json({ message: 'Push de prueba emitido', ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al enviar push de prueba' });
  }
});

adminRouter.post('/push/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Datos de suscripción incompletos' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: req.user!.id,
        p256dh: keys.p256dh,
        auth: keys.auth
      },
      create: {
        userId: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });

    res.json({ message: 'Suscripción push registrada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar suscripción push' });
  }
});

/**
 * Desuscribir dispositivo de Web Push al cerrar sesión o desactivar alertas
 */
adminRouter.post('/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.user!.id }
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: req.user!.id }
      });
    }
    res.json({ message: 'Suscripción push cancelada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al cancelar suscripción push' });
  }
});

/**
 * Obtener perfil de la usuaria autenticada
 */
adminRouter.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        professional: {
          include: {
            services: {
              include: { service: true }
            }
          }
        }
      }
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
      professional: user.professional ? {
        id: user.professional.id,
        name: user.professional.name,
        bio: user.professional.bio,
        avatarUrl: user.professional.avatarUrl,
        services: user.professional.services.map(ps => ps.service)
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener perfil' });
  }
});

/**
 * Actualizar perfil personal (Nombre, bio, contraseña)
 */
adminRouter.patch('/me', async (req, res) => {
  try {
    const { name, bio, currentPassword, newPassword } = req.body;
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const updateData: any = {};
    if (name && typeof name === 'string') {
      updateData.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Debe ingresar su contraseña actual para cambiarla' });
      }
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'La contraseña actual no es correcta' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    if (user.professionalId && bio !== undefined) {
      await prisma.professional.update({
        where: { id: user.professionalId },
        data: {
          name: updateData.name || user.name,
          bio: typeof bio === 'string' ? bio.trim() : null
        }
      });
    }

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar perfil' });
  }
});

/**
 * Listar todos los servicios del salón para gestión administrativa
 */
adminRouter.get('/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { businessId: req.user!.businessId },
      include: {
        professionals: {
          include: { professional: true }
        }
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
    res.json({ services });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar servicios' });
  }
});

/**
 * Crear un nuevo servicio
 */
adminRouter.post('/services', async (req, res) => {
  try {
    const { name, category, description, priceCRC, durationBlocks, imageUrl, professionalIds } = req.body;
    if (!name || !category || priceCRC === undefined || !durationBlocks) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para el servicio' });
    }
    const id = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const service = await prisma.service.create({
      data: {
        id,
        businessId: req.user!.businessId,
        name: name.trim(),
        category: category.trim(),
        description: (description || '').trim(),
        priceCRC: Number(priceCRC),
        durationBlocks: Number(durationBlocks),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
        active: true,
        professionals: Array.isArray(professionalIds) && professionalIds.length > 0 ? {
          create: professionalIds.map((profId: string) => ({
            professional: { connect: { id: profId } }
          }))
        } : undefined
      },
      include: { professionals: { include: { professional: true } } }
    });
    res.status(201).json({ message: 'Servicio creado exitosamente', service });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear servicio' });
  }
});

/**
 * Actualizar un servicio existente
 */
adminRouter.put('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, priceCRC, durationBlocks, imageUrl, active, professionalIds } = req.body;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      if (Array.isArray(professionalIds)) {
        await tx.professionalService.deleteMany({ where: { serviceId: id } });
        if (professionalIds.length > 0) {
          await tx.professionalService.createMany({
            data: professionalIds.map((pId: string) => ({
              serviceId: id,
              professionalId: pId
            }))
          });
        }
      }

      await tx.service.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          category: category !== undefined ? category.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          priceCRC: priceCRC !== undefined ? Number(priceCRC) : undefined,
          durationBlocks: durationBlocks !== undefined ? Number(durationBlocks) : undefined,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          active: active !== undefined ? Boolean(active) : undefined
        }
      });
    });

    const updated = await prisma.service.findUnique({
      where: { id },
      include: { professionals: { include: { professional: true } } }
    });

    res.json({ message: 'Servicio actualizado exitosamente', service: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar servicio' });
  }
});

/**
 * Alternar activación de un servicio
 */
adminRouter.patch('/services/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    const updated = await prisma.service.update({
      where: { id },
      data: { active: !existing.active }
    });
    res.json({ message: `Servicio ${updated.active ? 'activado' : 'desactivado'}`, service: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al cambiar estado del servicio' });
  }
});

/**
 * Eliminar servicio
 */
adminRouter.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.service.findUnique({
      where: { id },
      include: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } }
    });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    if (existing.bookings.length > 0) {
      await prisma.service.update({ where: { id }, data: { active: false } });
      return res.json({ message: 'El servicio tiene citas agendadas, por lo que fue desactivado del catálogo.' });
    }
    await prisma.service.delete({ where: { id } });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar servicio' });
  }
});

// =========================================================================
// GESTIÓN DE UBICACIONES Y TARIFAS DE TRASLADO A DOMICILIO
// =========================================================================

/**
 * Listar todas las ubicaciones de servicio a domicilio (activas e inactivas)
 */
adminRouter.get('/locations', async (req, res) => {
  try {
    const locations = await prisma.locationDiscount.findMany({
      where: { businessId: req.user!.businessId },
      orderBy: { name: 'asc' }
    });
    res.json({ locations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener ubicaciones' });
  }
});

/**
 * Crear nueva localidad de servicio a domicilio
 */
adminRouter.post('/locations', async (req, res) => {
  try {
    const { name, priceCRC = 0, discountCRC = 0, active = true } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la comunidad o localidad es obligatorio' });
    }

    const location = await prisma.locationDiscount.create({
      data: {
        businessId: req.user!.businessId,
        name: name.trim(),
        priceCRC: Math.max(0, parseInt(priceCRC, 10) || 0),
        discountCRC: Math.max(0, parseInt(discountCRC, 10) || 0),
        active: Boolean(active)
      }
    });

    res.status(201).json({ message: 'Localidad creada con éxito', location });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear localidad' });
  }
});

/**
 * Actualizar una localidad (nombre, tarifa de traslado y descuento)
 */
adminRouter.put('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, priceCRC, discountCRC } = req.body;

    const existing = await prisma.locationDiscount.findUnique({ where: { id } });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }

    const updated = await prisma.locationDiscount.update({
      where: { id },
      data: {
        ...(name && typeof name === 'string' ? { name: name.trim() } : {}),
        ...(priceCRC !== undefined ? { priceCRC: Math.max(0, parseInt(priceCRC, 10) || 0) } : {}),
        ...(discountCRC !== undefined ? { discountCRC: Math.max(0, parseInt(discountCRC, 10) || 0) } : {})
      }
    });

    res.json({ message: 'Localidad actualizada correctamente', location: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar localidad' });
  }
});

/**
 * Alternar estado activo/inactivo de una localidad
 */
adminRouter.patch('/locations/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.locationDiscount.findUnique({ where: { id } });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }

    const updated = await prisma.locationDiscount.update({
      where: { id },
      data: { active: !existing.active }
    });

    res.json({
      message: `Localidad ${updated.active ? 'activada' : 'desactivada'}`,
      location: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al cambiar estado de la localidad' });
  }
});

/**
 * Eliminar localidad
 */
adminRouter.delete('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.locationDiscount.findUnique({
      where: { id },
      include: { bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } }
    });
    if (!existing || existing.businessId !== req.user!.businessId) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }

    if (existing.bookings.length > 0) {
      await prisma.locationDiscount.update({ where: { id }, data: { active: false } });
      return res.json({
        message: 'La localidad tiene citas asociadas, por lo que fue desactivada para nuevas reservas.'
      });
    }

    await prisma.locationDiscount.delete({ where: { id } });
    res.json({ message: 'Localidad eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar localidad' });
  }
});
