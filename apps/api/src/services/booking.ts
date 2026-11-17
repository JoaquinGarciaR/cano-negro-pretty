import { prisma } from '../prisma';
import { BookingStatus, Modality, Prisma } from '@prisma/client';
import {
  CreateBookingInput,
  CreateManualBookingInput,
  UpdateBookingStatusInput,
  RescheduleBookingInput,
  normalizePhone
} from '@cano/shared';
import { sendPushToSalon, sendPushToUser, sendPushToProfessional, sendPushToOwners } from './push';

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CNP-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createBooking(input: CreateBookingInput) {
  const {
    clientName,
    clientPhone,
    countryCode = '+506',
    modality,
    locationId,
    customAddress,
    professionalId,
    serviceId,
    packageId,
    startTime: startTimeISO,
    clientNotes
  } = input;

  const fullPhone = normalizePhone(clientPhone, countryCode);

  const business = await prisma.business.findFirst({
    where: { id: 'cano_negro_pretty_main' }
  });
  if (!business) {
    throw new Error('Negocio no encontrado');
  }

  // 1. Obtener precios y duraciones del servicio o paquete
  let serviceName = '';
  let durationMinutes = 60;
  let priceBaseCRC = 0;

  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });
    if (!service || !service.active) {
      throw new Error('El servicio seleccionado no está activo o no existe');
    }
    serviceName = service.name;
    durationMinutes = service.durationBlocks * 15;
    priceBaseCRC = service.priceCRC;
  } else if (packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        components: {
          include: { service: true }
        }
      }
    });
    if (!pkg || !pkg.active) {
      throw new Error('El paquete seleccionado no está activo o no existe');
    }
    serviceName = pkg.name;
    durationMinutes = pkg.totalDurationBlocks * 15;
    const componentsSum = pkg.components.reduce((sum, c) => sum + c.service.priceCRC, 0);
    priceBaseCRC = componentsSum + pkg.extraPriceCRC;
  }

  // 2. Calcular tarifa de traslado y descuento por localidad en servicio a domicilio
  let locationFeeCRC = 0;
  let discountCRC = 0;
  let locationDiscountId: string | null = null;

  if (modality === 'HOME_VISIT' && locationId) {
    const location = await prisma.locationDiscount.findUnique({
      where: { id: locationId }
    });
    if (location && location.active) {
      locationFeeCRC = location.priceCRC || 0;
      discountCRC = location.discountCRC || 0;
      locationDiscountId = location.id;
    }
  }

  const totalCRC = Math.max(0, priceBaseCRC + locationFeeCRC - discountCRC);

  const startTime = new Date(startTimeISO);
  if (startTime.getTime() <= Date.now()) {
    throw new Error('No es posible reservar en fechas u horas pasadas');
  }
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  // 3. Crear reserva con código de referencia único
  let referenceCode = generateReferenceCode();
  let codeExists = await prisma.booking.findUnique({ where: { referenceCode } });
  while (codeExists) {
    referenceCode = generateReferenceCode();
    codeExists = await prisma.booking.findUnique({ where: { referenceCode } });
  }

  const booking = await prisma.booking.create({
    data: {
      referenceCode,
      businessId: business.id,
      clientName,
      clientPhone: fullPhone,
      modality: modality as Modality,
      locationDiscountId,
      customAddress: modality === 'HOME_VISIT' ? customAddress : null,
      professionalId: professionalId || null,
      serviceId: serviceId || null,
      packageId: packageId || null,
      snapshotServiceName: serviceName,
      snapshotDurationMinutes: durationMinutes,
      snapshotPriceCRC: priceBaseCRC,
      snapshotLocationFeeCRC: locationFeeCRC,
      snapshotDiscountCRC: discountCRC,
      snapshotTotalCRC: totalCRC,
      startTime,
      endTime,
      status: BookingStatus.PENDING,
      clientNotes: clientNotes || null
    },
    include: {
      professional: true,
      locationDiscount: true
    }
  });

  // 4. Notificación interna (a la esteticista seleccionada o a todas en la bandeja compartida)
  await prisma.notification.create({
    data: {
      businessId: business.id,
      professionalId: professionalId || null,
      title: professionalId ? 'Nueva solicitud de cita' : 'Nueva solicitud sin asignar (Bandeja compartida)',
      message: `${clientName} ha solicitado ${serviceName} para el ${startTime.toLocaleString('es-CR')}.`,
      bookingId: booking.id
    }
  });

  // 5. Emitir Web Push segmentado exclusivamente a las usuarias autenticadas correspondientes
  if (professionalId) {
    // Si la cita se solicitó con una esteticista específica, alertar a esa esteticista y a la dueña
    sendPushToProfessional(professionalId, {
      title: 'Nueva Cita Solicitada',
      body: `${clientName} ha solicitado ${serviceName}. Revisa tu agenda.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push esteticista:', e));

    sendPushToOwners(business.id, {
      title: 'Nueva Cita en el Salón',
      body: `${clientName} solicitó ${serviceName} con especialista asignada.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push propietaria:', e));
  } else {
    // Si no tiene especialista asignada, alertar a todo el equipo para reclamar en bandeja compartida
    sendPushToSalon(business.id, {
      title: 'Nueva Solicitud Sin Asignar',
      body: `${clientName} ha solicitado ${serviceName}. Disponible en bandeja para tomarla.`,
      url: '/admin'
    }).catch((e) => console.warn('Error al emitir web push al salón:', e));
  }

  return booking;
}

/**
 * Creación manual de cita por personal/administración
 */
export async function createManualBooking(input: CreateManualBookingInput, createdByUserId?: string) {
  const {
    clientName,
    clientPhone,
    countryCode = '+506',
    modality,
    locationId,
    customAddress,
    professionalId,
    serviceId,
    packageId,
    startTime: startTimeISO,
    clientNotes,
    staffNotes
  } = input;

  const fullPhone = normalizePhone(clientPhone, countryCode);

  const business = await prisma.business.findFirst({
    where: { id: 'cano_negro_pretty_main' }
  });
  if (!business) {
    throw new Error('Negocio no encontrado');
  }

  let serviceName = '';
  let durationMinutes = 60;
  let priceBaseCRC = 0;

  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new Error('Servicio no encontrado');
    serviceName = service.name;
    durationMinutes = service.durationBlocks * 15;
    priceBaseCRC = service.priceCRC;
  } else if (packageId) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: { components: { include: { service: true } } }
    });
    if (!pkg) throw new Error('Paquete no encontrado');
    serviceName = pkg.name;
    durationMinutes = pkg.totalDurationBlocks * 15;
    const sum = pkg.components.reduce((acc, c) => acc + c.service.priceCRC, 0);
    priceBaseCRC = sum + pkg.extraPriceCRC;
  }

  let locationFeeCRC = 0;
  let discountCRC = 0;
  let locationDiscountId: string | null = null;
  if (modality === 'HOME_VISIT' && locationId) {
    const loc = await prisma.locationDiscount.findUnique({ where: { id: locationId } });
    if (loc && loc.active) {
      locationFeeCRC = loc.priceCRC || 0;
      discountCRC = loc.discountCRC || 0;
      locationDiscountId = loc.id;
    }
  }

  const totalCRC = Math.max(0, priceBaseCRC + locationFeeCRC - discountCRC);
  const startTime = new Date(startTimeISO);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  // Verificación atómica de espacio libre
  const result = await prisma.$transaction(async (tx) => {
    const bufferMinutes = modality === 'HOME_VISIT' ? business.homeVisitBufferMinutes : 0;
    const windowStart = new Date(startTime.getTime() - bufferMinutes * 60000);
    const windowEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

    const conflicting = await tx.booking.findFirst({
      where: {
        professionalId,
        status: BookingStatus.CONFIRMED,
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart }
      }
    });

    if (conflicting) {
      const err: any = new Error(
        `Conflicto: La esteticista ya tiene la cita #${conflicting.referenceCode} confirmada en ese intervalo.`
      );
      err.code = 'CONFLICT';
      throw err;
    }

    const conflictingBlock = await tx.timeBlock.findFirst({
      where: {
        professionalId,
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart }
      }
    });

    if (conflictingBlock) {
      const err: any = new Error(
        `Conflicto: La esteticista tiene un bloqueo de horario (${conflictingBlock.title}) en ese intervalo.`
      );
      err.code = 'CONFLICT';
      throw err;
    }

    let referenceCode = generateReferenceCode();
    let codeExists = await tx.booking.findUnique({ where: { referenceCode } });
    while (codeExists) {
      referenceCode = generateReferenceCode();
      codeExists = await tx.booking.findUnique({ where: { referenceCode } });
    }

    // Comprobar si la persona que crea la cita es la misma profesional asignada
    const creatorUser = createdByUserId
      ? await tx.user.findUnique({ where: { id: createdByUserId } })
      : null;

    // Si alguien le crea una cita a otra persona (ej. la dueña a una estilista o una estilista a su compañera),
    // dicha persona tendrá que aceptarla: aparecerá asignada pero en estado PENDING hasta que la persona asignada
    // confirme que puede tomarla y envíe el mensaje por WhatsApp.
    const isSelfAssigned = Boolean(
      creatorUser?.professionalId && creatorUser.professionalId === professionalId
    );
    const initialStatus = isSelfAssigned ? BookingStatus.CONFIRMED : BookingStatus.PENDING;

    const booking = await tx.booking.create({
      data: {
        referenceCode,
        businessId: business.id,
        clientName,
        clientPhone: fullPhone,
        modality: modality as Modality,
        locationDiscountId,
        customAddress: modality === 'HOME_VISIT' ? customAddress : null,
        professionalId,
        serviceId: serviceId || null,
        packageId: packageId || null,
        snapshotServiceName: serviceName,
        snapshotDurationMinutes: durationMinutes,
        snapshotPriceCRC: priceBaseCRC,
        snapshotLocationFeeCRC: locationFeeCRC,
        snapshotDiscountCRC: discountCRC,
        snapshotTotalCRC: totalCRC,
        startTime,
        endTime,
        status: initialStatus,
        clientNotes: clientNotes || null,
        staffNotes: staffNotes || (isSelfAssigned ? 'Cita ingresada manualmente por personal' : 'Cita asignada por administración pendiente de confirmación')
      },
      include: {
        professional: true,
        locationDiscount: true
      }
    });

    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: createdByUserId || null,
        action: 'MANUAL_BOOKING_CREATED',
        details: isSelfAssigned
          ? `Cita creada manualmente y auto-asignada por ${booking.professional?.name}.`
          : `Cita creada por ${creatorUser?.name || 'Administración'} y asignada a ${booking.professional?.name} (Pendiente de aceptación).`
      }
    });

    await tx.notification.create({
      data: {
        businessId: business.id,
        professionalId,
        title: isSelfAssigned ? 'Cita asignada a tu agenda' : 'Nueva cita asignada a tu agenda (Pendiente de aceptación)',
        message: isSelfAssigned
          ? `Has registrado la cita #${booking.referenceCode} para ${clientName}.`
          : `${creatorUser?.name || 'Administración'} te ha asignado la cita #${booking.referenceCode} para ${clientName}. Ingresa para aceptarla y confirmarla.`,
        bookingId: booking.id
      }
    });

    return booking;
  });

  if (result.professionalId) {
    const isPendingAcceptance = result.status === BookingStatus.PENDING;
    sendPushToProfessional(result.professionalId, {
      title: isPendingAcceptance ? 'Nueva Cita Pendiente de Aceptación' : 'Cita en tu Agenda',
      body: isPendingAcceptance
        ? `Te han asignado la cita #${result.referenceCode} para ${result.clientName}. Revisa tu bandeja para aceptarla y confirmarla.`
        : `Te han asignado la cita #${result.referenceCode} para ${result.clientName} (${result.snapshotServiceName}).`,
      url: '/admin'
    }).catch((e) => console.warn('Error push cita manual:', e));
  }

  // Notificar también a las dueñas/administradoras en todos sus dispositivos
  sendPushToOwners(business.id, {
    title: 'Nueva Cita Manual Creada',
    body: `Cita #${result.referenceCode} registrada para ${result.clientName} (${result.snapshotServiceName}).`,
    url: '/admin'
  }).catch((e) => console.warn('Error push dueña cita manual:', e));

  return result;
}

/**
 * Asignar una cita pendiente a un profesional
 */
export async function assignBooking(
  bookingId: string,
  professionalId: string,
  assignedByUserId?: string,
  staffNotes?: string
) {
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: true
      }
    });

    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    const bufferMinutes = booking.modality === Modality.HOME_VISIT
      ? booking.business.homeVisitBufferMinutes
      : 0;

    const windowStart = new Date(booking.startTime.getTime() - bufferMinutes * 60000);
    const windowEnd = new Date(booking.endTime.getTime() + bufferMinutes * 60000);

    const conflicting = await tx.booking.findFirst({
      where: {
        id: { not: booking.id },
        professionalId,
        status: BookingStatus.CONFIRMED,
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart }
      }
    });

    if (conflicting) {
      const err: any = new Error(
        `Conflicto de horario: La profesional ya tiene la cita #${conflicting.referenceCode} confirmada en este intervalo.`
      );
      err.code = 'CONFLICT';
      throw err;
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        professionalId,
        staffNotes: staffNotes || booking.staffNotes
      },
      include: {
        professional: true,
        locationDiscount: true
      }
    });

    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: assignedByUserId || null,
        action: `ASSIGNED_TO_${professionalId}`,
        details: `Cita asignada a ${updated.professional?.name}. Pendiente de confirmación.`
      }
    });

    await tx.notification.create({
      data: {
        businessId: booking.businessId,
        professionalId,
        title: 'Nueva cita asignada a tu agenda',
        message: `Se te ha asignado la cita #${booking.referenceCode} con ${booking.clientName} (${booking.snapshotServiceName}).`,
        bookingId: booking.id
      }
    });

    return updated;
  });

  // Notificación Push a la profesional asignada
  sendPushToProfessional(professionalId, {
    title: 'Nueva Cita Asignada',
    body: `Se te ha asignado la cita #${updated.referenceCode} con ${updated.clientName} (${updated.snapshotServiceName}).`,
    url: '/admin'
  }).catch((e) => console.warn('Error push asignación:', e));

  // Notificar también a la administración/dueñas
  sendPushToOwners(updated.businessId, {
    title: 'Cita Asignada',
    body: `Cita #${updated.referenceCode} (${updated.clientName}) asignada a ${updated.professional?.name}.`,
    url: '/admin'
  }).catch((e) => console.warn('Error push asignación dueñas:', e));

  return updated;
}

/**
 * Confirmación atómica y actualización de estados con control de concurrencia
 */
export async function updateBookingStatus(
  bookingId: string,
  input: UpdateBookingStatusInput,
  userId?: string
) {
  const { status, staffNotes, professionalId } = input;

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: true,
        professional: true
      }
    });

    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    const targetProfId = professionalId || booking.professionalId;

    if (status === BookingStatus.CONFIRMED) {
      if (!targetProfId) {
        throw new Error('Para confirmar la cita debe asignar primero una esteticista responsable');
      }

      const bufferMinutes = booking.modality === Modality.HOME_VISIT
        ? booking.business.homeVisitBufferMinutes
        : 0;

      const windowStart = new Date(booking.startTime.getTime() - bufferMinutes * 60000);
      const windowEnd = new Date(booking.endTime.getTime() + bufferMinutes * 60000);

      const conflictingBooking = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          professionalId: targetProfId,
          status: BookingStatus.CONFIRMED,
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart }
        }
      });

      if (conflictingBooking) {
        const error: any = new Error(
          `Conflicto de horario: Ya existe otra cita confirmada (#${conflictingBooking.referenceCode}) para esta esteticista en el intervalo solicitado.`
        );
        error.code = 'CONFLICT';
        error.conflictingBooking = conflictingBooking;
        throw error;
      }
    }

    if (status === BookingStatus.COMPLETED) {
      if (!targetProfId) {
        throw new Error('Para completar la cita debe haber una esteticista asignada');
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new Error('La cita debe estar previamente confirmada para poder completarse');
      }
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: status as BookingStatus,
        professionalId: targetProfId,
        staffNotes: staffNotes !== undefined ? staffNotes : booking.staffNotes
      },
      include: {
        professional: true,
        locationDiscount: true
      }
    });

    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: userId || null,
        action: `STATUS_CHANGE_TO_${status}`,
        details: staffNotes ? `Nota de personal: ${staffNotes}` : `Estado actualizado a ${status}`
      }
    });

    return updated;
  });

  if (status === BookingStatus.CANCELLED) {
    if (updated.professionalId) {
      sendPushToProfessional(updated.professionalId, {
        title: 'Cita Cancelada',
        body: `La cita #${updated.referenceCode} para ${updated.clientName} ha sido cancelada.`,
        url: '/admin'
      }).catch((e) => console.warn('Error push cancelación:', e));
    }
    sendPushToOwners(updated.businessId, {
      title: 'Cita Cancelada',
      body: `La cita #${updated.referenceCode} (${updated.clientName}) fue cancelada.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push cancelación dueñas:', e));
  } else if (status === BookingStatus.CONFIRMED) {
    if (updated.professionalId) {
      sendPushToProfessional(updated.professionalId, {
        title: 'Cita Confirmada',
        body: `Cita #${updated.referenceCode} de ${updated.clientName} está confirmada.`,
        url: '/admin'
      }).catch((e) => console.warn('Error push confirmación:', e));
    }
    sendPushToOwners(updated.businessId, {
      title: 'Cita Confirmada',
      body: `Cita #${updated.referenceCode}: ${updated.clientName} confirmada con ${updated.professional?.name}.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push confirmación dueñas:', e));
  } else if (status === BookingStatus.COMPLETED) {
    sendPushToOwners(updated.businessId, {
      title: 'Cita Completada',
      body: `Cita #${updated.referenceCode} de ${updated.clientName} ha concluido con éxito.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push completado dueñas:', e));
  }

  return updated;
}

/**
 * Reprogramar horario de una cita (cambio de fecha y/o hora)
 */
export async function rescheduleBooking(
  bookingId: string,
  input: RescheduleBookingInput,
  userId?: string
) {
  const { startTime: startTimeISO, professionalId, staffNotes } = input;

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: true,
        professional: true
      }
    });

    if (!booking) {
      throw new Error('Reserva no encontrada');
    }

    const targetProfId = professionalId !== undefined ? (professionalId || null) : booking.professionalId;
    const durationMinutes = booking.snapshotDurationMinutes || 60;
    const startTime = new Date(startTimeISO);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const bufferMinutes = booking.modality === Modality.HOME_VISIT
      ? booking.business.homeVisitBufferMinutes
      : 0;

    const windowStart = new Date(startTime.getTime() - bufferMinutes * 60000);
    const windowEnd = new Date(endTime.getTime() + bufferMinutes * 60000);

    // Si la cita tiene esteticista asignada (o se le asignó una en el cambio), verificar conflictos
    if (targetProfId) {
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          professionalId: targetProfId,
          status: BookingStatus.CONFIRMED,
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart }
        }
      });

      if (conflictingBooking) {
        const error: any = new Error(
          `Conflicto de horario: La esteticista ya tiene la cita #${conflictingBooking.referenceCode} confirmada en ese horario.`
        );
        error.code = 'CONFLICT';
        throw error;
      }

      const conflictingBlock = await tx.timeBlock.findFirst({
        where: {
          professionalId: targetProfId,
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart }
        }
      });

      if (conflictingBlock) {
        const error: any = new Error(
          `Conflicto de horario: La esteticista tiene un bloqueo de horario (${conflictingBlock.title}) en ese intervalo.`
        );
        error.code = 'CONFLICT';
        throw error;
      }
    }

    const previousStartTime = booking.startTime;
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        startTime,
        endTime,
        professionalId: targetProfId,
        staffNotes: staffNotes !== undefined ? staffNotes : booking.staffNotes
      },
      include: {
        professional: true,
        locationDiscount: true
      }
    });

    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: userId || null,
        action: 'RESCHEDULED',
        details: `Cita reprogramada de ${previousStartTime.toISOString()} a ${startTime.toISOString()}${staffNotes ? ` - Nota: ${staffNotes}` : ''}.`
      }
    });

    await tx.notification.create({
      data: {
        businessId: booking.businessId,
        professionalId: targetProfId,
        title: 'Cita Reprogramada',
        message: `La cita #${booking.referenceCode} (${booking.clientName}) fue cambiada para el ${startTime.toLocaleString('es-CR')}.`,
        bookingId: booking.id
      }
    });

    return updated;
  });

  // Notificar por Push
  if (updated.professionalId) {
    sendPushToProfessional(updated.professionalId, {
      title: 'Cita Reprogramada',
      body: `La cita #${updated.referenceCode} (${updated.clientName}) tiene nuevo horario.`,
      url: '/admin'
    }).catch((e) => console.warn('Error push reprogramación profesional:', e));
  }

  sendPushToOwners(updated.businessId, {
    title: 'Cita Reprogramada',
    body: `Cita #${updated.referenceCode} (${updated.clientName}) fue reprogramada.`,
    url: '/admin'
  }).catch((e) => console.warn('Error push reprogramación dueñas:', e));

  return updated;
}
