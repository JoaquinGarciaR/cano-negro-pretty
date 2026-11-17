import { Modality, WhatsAppVoice } from './types';

/**
 * Formatea montos en colones costarricenses (CRC).
 * Ejemplo: 12000 -> ₡12.000
 */
export function formatCRC(amount: number): string {
  const formatted = new Intl.NumberFormat('es-CR', {
    maximumFractionDigits: 0
  }).format(amount);
  return `₡${formatted}`;
}

/**
 * Convierte bloques de 15 minutos a texto legible.
 * Ejemplo: 4 bloques -> "1 h (60 min)"
 */
export function formatDuration(blocks: number): string {
  const minutes = blocks * 15;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainingMinutes} min`;
}

export interface WhatsAppMessageParams {
  voice: WhatsAppVoice;
  clientName: string;
  clientPhone: string;
  professionalName: string;
  serviceName: string;
  formattedDate: string; // ej: "Lunes 20 de Noviembre"
  formattedTime: string; // ej: "02:30 PM"
  durationMinutes: number;
  modality: Modality;
  locationName?: string | null;
  customAddress?: string | null;
  totalCRC: number;
  referenceCode: string;
}

/**
 * Genera el texto del mensaje de confirmación para WhatsApp.
 */
export function buildWhatsAppMessage(params: WhatsAppMessageParams): string {
  const {
    voice,
    clientName,
    professionalName,
    serviceName,
    formattedDate,
    formattedTime,
    durationMinutes,
    modality,
    locationName,
    customAddress,
    totalCRC,
    referenceCode
  } = params;

  const greeting = voice === 'AS_PROFESSIONAL'
    ? `¡Hola, ${clientName}! Soy ${professionalName} de Caño Negro Pretty.`
    : `¡Hola, ${clientName}! Te escribimos de Caño Negro Pretty.`;

  const modalityText = modality === 'HOME_VISIT'
    ? `A domicilio (${locationName || 'Caño Negro'}${customAddress ? ` - Señas: ${customAddress}` : ''})`
    : `En estación de trabajo (Estudio de ${professionalName})`;

  const message = [
    greeting,
    '',
    `Tu cita ha sido confirmada con éxito. Aquí tienes el resumen de tu reserva:`,
    '',
    `• Referencia: ${referenceCode}`,
    `• Servicio: ${serviceName}`,
    `• Profesional: ${professionalName}`,
    `• Fecha: ${formattedDate}`,
    `• Hora: ${formattedTime}`,
    `• Duración estimada: ${durationMinutes} min`,
    `• Modalidad: ${modalityText}`,
    `• Total a cancelar: ${formatCRC(totalCRC)}`,
    '',
    '¡Nos alegra mucho atenderte! Si requieres algún cambio o consulta adicional, por favor responde a este mensaje.',
    '',
    voice === 'AS_PROFESSIONAL' ? `Con cariño, ${professionalName}` : 'Con cariño, el equipo de Caño Negro Pretty'
  ].join('\n');

  return message;
}

export interface WhatsAppRescheduleParams {
  voice: WhatsAppVoice;
  clientName: string;
  clientPhone: string;
  professionalName: string;
  serviceName: string;
  previousDate?: string;
  previousTime?: string;
  newFormattedDate: string; // ej: "Miércoles 18 de Noviembre de 2026"
  newFormattedTime: string; // ej: "10:00 a. m."
  durationMinutes: number;
  modality: Modality;
  locationName?: string | null;
  customAddress?: string | null;
  totalCRC: number;
  referenceCode: string;
  reason?: string;
}

/**
 * Genera el texto del mensaje de reprogramación / cambio de horario para WhatsApp.
 */
export function buildWhatsAppRescheduleMessage(params: WhatsAppRescheduleParams): string {
  const {
    voice,
    clientName,
    professionalName,
    serviceName,
    previousDate,
    previousTime,
    newFormattedDate,
    newFormattedTime,
    durationMinutes,
    modality,
    locationName,
    customAddress,
    totalCRC,
    referenceCode,
    reason
  } = params;

  const greeting = voice === 'AS_PROFESSIONAL'
    ? `¡Hola, ${clientName}! Soy ${professionalName} de Caño Negro Pretty.`
    : `¡Hola, ${clientName}! Te escribimos de Caño Negro Pretty.`;

  const modalityText = modality === 'HOME_VISIT'
    ? `A domicilio (${locationName || 'Caño Negro'}${customAddress ? ` - Señas: ${customAddress}` : ''})`
    : `En estación de trabajo (Estudio de ${professionalName})`;

  const previousScheduleLine = previousDate && previousTime
    ? `(Anteriormente agendada para el ${previousDate} a las ${previousTime})`
    : '';

  const lines: (string | null)[] = [
    greeting,
    '',
    `Te informamos que hemos reprogramado tu cita #${referenceCode}.`,
    previousScheduleLine ? previousScheduleLine : null,
    reason ? `Motivo del cambio: ${reason}` : null,
    '',
    'Aquí tienes los detalles de tu nueva fecha y hora:',
    '',
    `• Referencia: ${referenceCode}`,
    `• Servicio: ${serviceName}`,
    `• Profesional: ${professionalName}`,
    `• Nueva Fecha: ${newFormattedDate}`,
    `• Nueva Hora: ${newFormattedTime}`,
    `• Duración estimada: ${durationMinutes} min`,
    `• Modalidad: ${modalityText}`,
    `• Total: ${formatCRC(totalCRC)}`,
    '',
    'Por favor confírmanos respondiendo a este mensaje si este nuevo horario te queda bien. ¡Muchas gracias por tu comprensión!',
    '',
    voice === 'AS_PROFESSIONAL' ? `Con cariño, ${professionalName}` : 'Con cariño, el equipo de Caño Negro Pretty'
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export interface WhatsAppReminderParams {
  voice: WhatsAppVoice;
  clientName: string;
  clientPhone: string;
  professionalName: string;
  serviceName: string;
  formattedDate: string;
  formattedTime: string;
  durationMinutes: number;
  modality: Modality;
  locationName?: string | null;
  customAddress?: string | null;
  totalCRC: number;
  referenceCode: string;
}

/**
 * Genera el texto del mensaje de recordatorio de cita para WhatsApp.
 */
export function buildWhatsAppReminderMessage(params: WhatsAppReminderParams): string {
  const {
    voice,
    clientName,
    professionalName,
    serviceName,
    formattedDate,
    formattedTime,
    durationMinutes,
    modality,
    locationName,
    customAddress,
    totalCRC,
    referenceCode
  } = params;

  const greeting = voice === 'AS_PROFESSIONAL'
    ? `¡Hola, ${clientName}! Soy ${professionalName} de Caño Negro Pretty.`
    : `¡Hola, ${clientName}! Te saludamos con cariño de Caño Negro Pretty.`;

  const modalityText = modality === 'HOME_VISIT'
    ? `A domicilio (${locationName || 'Caño Negro'}${customAddress ? ` - Señas: ${customAddress}` : ''})`
    : `En nuestro estudio (Estación de ${professionalName})`;

  return [
    greeting,
    '',
    `Te recordamos tu cita programada #${referenceCode}:`,
    '',
    `• Servicio: ${serviceName}`,
    `• Profesional: ${professionalName}`,
    `• Fecha: ${formattedDate}`,
    `• Hora: ${formattedTime}`,
    `• Duración estimada: ${durationMinutes} min`,
    `• Modalidad: ${modalityText}`,
    `• Total a cancelar: ${formatCRC(totalCRC)}`,
    '',
    '¡Estamos listas para consentirte! Si necesitas alguna indicación especial o cambio de última hora, no dudes en escribirnos por acá.',
    '',
    voice === 'AS_PROFESSIONAL' ? `Te esperamos, ${professionalName}` : 'Te esperamos, el equipo de Caño Negro Pretty'
  ].join('\n');
}

export interface WhatsAppCancellationParams {
  voice: WhatsAppVoice;
  clientName: string;
  clientPhone: string;
  professionalName: string;
  serviceName: string;
  formattedDate: string; // ej: "Lunes 30 de Noviembre"
  formattedTime: string; // ej: "08:00 a. m."
  referenceCode: string;
  reason?: string;
}

/**
 * Genera el texto del mensaje de cancelación de cita para WhatsApp.
 */
export function buildWhatsAppCancellationMessage(params: WhatsAppCancellationParams): string {
  const {
    voice,
    clientName,
    professionalName,
    serviceName,
    formattedDate,
    formattedTime,
    referenceCode,
    reason
  } = params;

  const greeting = voice === 'AS_PROFESSIONAL'
    ? `¡Hola, ${clientName}! Soy ${professionalName} de Caño Negro Pretty.`
    : `¡Hola, ${clientName}! Te saludamos de Caño Negro Pretty.`;

  const reasonLine = reason && reason.trim()
    ? `Motivo: ${reason.trim()}`
    : null;

  const lines = [
    greeting,
    '',
    `Te informamos que tu cita #${referenceCode} agendada para el ${formattedDate} a las ${formattedTime} (${serviceName}) ha sido cancelada.`,
    reasonLine,
    '',
    'Lamentamos cualquier inconveniente que esto te pueda causar. Si deseas reprogramarla para otra fecha u horario que te quede cómodo, con muchísimo gusto estamos a tu disposición por este medio o en nuestro sitio web.',
    '',
    '¡Esperamos tener el placer de atenderte muy pronto!',
    '',
    voice === 'AS_PROFESSIONAL' ? `Con cariño, ${professionalName}` : 'Con cariño, el equipo de Caño Negro Pretty'
  ].filter((l) => l !== null);

  return lines.join('\n');
}

/**
 * Crea el link directo https://wa.me/...
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
