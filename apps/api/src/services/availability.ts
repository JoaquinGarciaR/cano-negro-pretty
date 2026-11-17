import { prisma } from '../prisma';
import { BookingStatus, Modality } from '@prisma/client';
import { AvailableTimeSlot, SetDayAvailabilityInput, BatchOpenDaysInput } from '@cano/shared';

const COSTA_RICA_TZ_OFFSET_HOURS = -6; // America/Costa_Rica es UTC-6 sin horario de verano

interface GetAvailabilityParams {
  professionalId?: string;
  serviceId?: string;
  packageId?: string;
  modality: Modality;
  dateStr: string; // "YYYY-MM-DD"
}

/**
 * Retorna las fechas abiertas / desbloqueadas a futuro para una esteticista o para todo el salón.
 */
export async function getUnlockedDays(professionalId?: string, startAfter?: string) {
  const todayStr = startAfter || new Date().toISOString().split('T')[0];

  const whereClause: any = {
    date: { gte: todayStr },
    isOpen: true
  };

  if (professionalId && professionalId !== 'all') {
    whereClause.professionalId = professionalId;
  }

  const opened = await prisma.dayAvailability.findMany({
    where: whereClause,
    orderBy: { date: 'asc' }
  });

  // Agrupar por fecha única para el calendario del cliente
  const dateMap = new Map<string, any>();
  for (const d of opened) {
    if (!dateMap.has(d.date)) {
      dateMap.set(d.date, {
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        customNote: d.customNote
      });
    }
  }

  return Array.from(dateMap.values());
}

/**
 * Calcula los slots de 15 minutos para una esteticista específica o para cualquier miembro disponible.
 */
export async function calculateAvailability(params: GetAvailabilityParams): Promise<AvailableTimeSlot[]> {
  const { professionalId, serviceId, packageId, modality, dateStr } = params;

  // Si no se especificó profesional, buscar entre todas las habilitadas para el servicio
  if (!professionalId || professionalId === 'all') {
    let eligibleProfs = await prisma.professional.findMany({
      where: { active: true },
      include: {
        services: true
      }
    });

    if (serviceId) {
      eligibleProfs = eligibleProfs.filter(p => p.services.some(s => s.serviceId === serviceId));
    }

    if (eligibleProfs.length === 0) {
      return [];
    }

    // Calcular disponibilidad para cada profesional y fusionar franjas libres
    const allSlotLists = await Promise.all(
      eligibleProfs.map(p =>
        calculateSingleProfAvailability({
          professionalId: p.id,
          serviceId,
          packageId,
          modality,
          dateStr
        })
      )
    );

    // Filtrar listas con slots de profesionales que abrieron jornada este día
    const activeSlotLists = allSlotLists.filter(list => list.length > 0);
    if (activeSlotLists.length === 0) {
      return [];
    }

    // Unificar todos los slots por localStartTime
    const slotsMap = new Map<string, AvailableTimeSlot>();

    for (const slotList of activeSlotLists) {
      for (const slot of slotList) {
        const existing = slotsMap.get(slot.localStartTime);
        if (!existing) {
          slotsMap.set(slot.localStartTime, { ...slot });
        } else {
          // Si al menos una profesional está disponible en este horario, el horario del salón queda disponible
          if (slot.available) {
            existing.available = true;
            existing.conflictDetail = undefined;
          } else if (!existing.available && !existing.conflictDetail) {
            existing.conflictDetail = slot.conflictDetail;
          }
        }
      }
    }

    // Si algún slot quedó no disponible, clarificar el detalle para la usuaria
    for (const slot of slotsMap.values()) {
      if (!slot.available && !slot.conflictDetail) {
        slot.conflictDetail = 'Horario no disponible para ninguna esteticista del salón.';
      }
    }

    // Ordenar cronológicamente
    const merged = Array.from(slotsMap.values()).sort((a, b) =>
      a.localStartTime.localeCompare(b.localStartTime)
    );

    return merged;
  }

  // Caso específico para una profesional
  return calculateSingleProfAvailability({
    professionalId,
    serviceId,
    packageId,
    modality,
    dateStr
  });
}

async function calculateSingleProfAvailability(params: {
  professionalId: string;
  serviceId?: string;
  packageId?: string;
  modality: Modality;
  dateStr: string;
}): Promise<AvailableTimeSlot[]> {
  const { professionalId, serviceId, packageId, modality, dateStr } = params;

  // 1. Verificar si el día está explícitamente DESBLOQUEADO / ABIERTO por la profesional
  const dayAvail = await prisma.dayAvailability.findUnique({
    where: {
      professionalId_date: {
        professionalId,
        date: dateStr
      }
    }
  });

  if (!dayAvail || !dayAvail.isOpen) {
    return [];
  }

  // 2. Obtener negocio y configuración de buffers
  const business = await prisma.business.findFirst({
    where: { id: 'cano_negro_pretty_main' }
  });
  if (!business) {
    throw new Error('Negocio no encontrado');
  }

  // 3. Determinar duración total en minutos
  let durationMinutes = 60;
  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (service) durationMinutes = service.durationBlocks * 15;
  } else if (packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (pkg) durationMinutes = pkg.totalDurationBlocks * 15;
  }

  const bufferMinutes = modality === 'HOME_VISIT'
    ? business.homeVisitBufferMinutes
    : 0;

  const [year, month, day] = dateStr.split('-').map(Number);
  const dayStartUTC = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
  const dayEndUTC = new Date(Date.UTC(year, month - 1, day + 1, 5, 59, 59));

  const [startHour, startMin] = dayAvail.startTime.split(':').map(Number);
  const [endHour, endMin] = dayAvail.endTime.split(':').map(Number);

  const scheduleStartMinutes = startHour * 60 + startMin;
  const scheduleEndMinutes = endHour * 60 + endMin;

  const existingBookings = await prisma.booking.findMany({
    where: {
      professionalId,
      status: BookingStatus.CONFIRMED,
      startTime: { lte: dayEndUTC },
      endTime: { gte: dayStartUTC }
    }
  });

  const existingBlocks = await prisma.timeBlock.findMany({
    where: {
      professionalId,
      startTime: { lte: dayEndUTC },
      endTime: { gte: dayStartUTC }
    }
  });

  const now = new Date();
  const slots: AvailableTimeSlot[] = [];
  const requiredBlocks = Math.max(1, Math.ceil(durationMinutes / 15));

  const formatTimePart = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  for (let currentMinute = scheduleStartMinutes; currentMinute < scheduleEndMinutes; currentMinute += 15) {
    const slotHour = Math.floor(currentMinute / 60);
    const slotMin = currentMinute % 60;
    const localStartTime = formatTimePart(slotHour, slotMin);

    const endMinutesTotal = currentMinute + durationMinutes;
    const endHourLocal = Math.floor(endMinutesTotal / 60);
    const endMinLocal = endMinutesTotal % 60;
    const localEndTime = formatTimePart(endHourLocal, endMinLocal);

    const slotStartUTC = new Date(Date.UTC(year, month - 1, day, slotHour + 6, slotMin, 0));
    const slotEndUTC = new Date(slotStartUTC.getTime() + durationMinutes * 60000);

    // Bloques consecutivos requeridos por la duración del servicio
    const consecutiveBlocks: string[] = [];
    for (let b = 0; b < requiredBlocks; b++) {
      const bMin = currentMinute + b * 15;
      consecutiveBlocks.push(formatTimePart(Math.floor(bMin / 60), bMin % 60));
    }

    let isAvailable = slotStartUTC > now;
    let conflictDetail: string | undefined = undefined;

    if (!isAvailable) {
      conflictDetail = 'Horario en el pasado';
    } else if (endMinutesTotal > scheduleEndMinutes) {
      isAvailable = false;
      conflictDetail = `El servicio dura ${durationMinutes} min (${requiredBlocks} bloques de 15 min), pero la jornada laboral finaliza a las ${dayAvail.endTime} hrs (faltan bloques disponibles).`;
    } else {
      // Verificar cada uno de los bloques consecutivos requeridos
      for (let b = 0; b < requiredBlocks; b++) {
        const bMin = currentMinute + b * 15;
        const bHour = Math.floor(bMin / 60);
        const bM = bMin % 60;
        const blockLabel = formatTimePart(bHour, bM);

        const bStartUTC = new Date(Date.UTC(year, month - 1, day, bHour + 6, bM, 0));
        const bEndUTC = new Date(bStartUTC.getTime() + 15 * 60000);

        const windowStartUTC = new Date(bStartUTC.getTime() - bufferMinutes * 60000);
        const windowEndUTC = new Date(bEndUTC.getTime() + bufferMinutes * 60000);

        // 1. Verificar contra reservas confirmadas
        for (const booking of existingBookings) {
          const bookingBuffer = booking.modality === Modality.HOME_VISIT
            ? business.homeVisitBufferMinutes
            : 0;
          const bStart = new Date(booking.startTime.getTime() - bookingBuffer * 60000);
          const bEnd = new Date(booking.endTime.getTime() + bookingBuffer * 60000);

          if (windowStartUTC < bEnd && windowEndUTC > bStart) {
            isAvailable = false;
            conflictDetail = `Bloque ocupado: El turno de las ${blockLabel} hrs ya tiene una cita confirmada (#${booking.referenceCode} - ${booking.clientName}).`;
            break;
          }
        }
        if (!isAvailable) break;

        // 2. Verificar contra bloqueos administrativos o descansos
        for (const block of existingBlocks) {
          if (windowStartUTC < block.endTime && windowEndUTC > block.startTime) {
            isAvailable = false;
            conflictDetail = `Bloque restringido: El turno de las ${blockLabel} hrs está bloqueado (${block.title}).`;
            break;
          }
        }
        if (!isAvailable) break;
      }
    }

    slots.push({
      startTime: slotStartUTC.toISOString(),
      endTime: slotEndUTC.toISOString(),
      localStartTime,
      localEndTime,
      available: isAvailable,
      requiredBlocks,
      consecutiveBlocks,
      conflictDetail
    });
  }

  return slots;
}

export async function setDayAvailability(input: SetDayAvailabilityInput) {
  const { professionalId, date, startTime, endTime, isOpen, customNote } = input;

  return await prisma.dayAvailability.upsert({
    where: {
      professionalId_date: {
        professionalId,
        date
      }
    },
    update: {
      startTime,
      endTime,
      isOpen,
      customNote
    },
    create: {
      professionalId,
      date,
      startTime,
      endTime,
      isOpen,
      customNote
    }
  });
}

export async function batchOpenDays(input: BatchOpenDaysInput) {
  const { professionalId, startDate, endDate, startTime, endTime, daysOfWeek, customNote } = input;

  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  const results = [];

  while (current <= end) {
    const dayOfWeek = current.getUTCDay();
    const dateStr = current.toISOString().split('T')[0];

    if (daysOfWeek.includes(dayOfWeek)) {
      const record = await prisma.dayAvailability.upsert({
        where: {
          professionalId_date: {
            professionalId,
            date: dateStr
          }
        },
        update: {
          startTime,
          endTime,
          isOpen: true,
          customNote
        },
        create: {
          professionalId,
          date: dateStr,
          startTime,
          endTime,
          isOpen: true,
          customNote
        }
      });
      results.push(record);
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
}
