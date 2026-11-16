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

/**
 * Crea el link directo https://wa.me/...
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
