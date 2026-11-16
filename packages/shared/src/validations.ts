import { z } from 'zod';

export const SUPPORTED_COUNTRY_CODES = [
  { code: '+506', country: 'Costa Rica', digits: 8, label: 'CR (+506)' },
  { code: '+505', country: 'Nicaragua', digits: 8, label: 'NI (+505)' },
  { code: '+507', country: 'Panamá', digits: 8, label: 'PA (+507)' },
  { code: '+1', country: 'EE.UU. / Canadá', digits: 10, label: 'US (+1)' },
  { code: '+52', country: 'México', digits: 10, label: 'MX (+52)' },
  { code: '+57', country: 'Colombia', digits: 10, label: 'CO (+57)' }
];

/**
 * Limpia y procesa el valor ingresado en el campo de teléfono:
 * - Elimina caracteres no numéricos.
 * - Si el usuario pega o escribe el código de país (ej. 506 o +506), lo detecta y lo remueve
 *   para mantener únicamente los dígitos nacionales limpios.
 * - Respeta el largo máximo según el país seleccionado.
 */
export function cleanPhoneInput(rawValue: string, countryCode: string = '+506'): string {
  const codeDigits = countryCode.replace(/\D/g, '');
  let digits = rawValue.replace(/\D/g, '');

  // Si el valor ingresado empieza con los dígitos del código de área seleccionado (ej. 506 para Costa Rica)
  // y tiene más dígitos que el código solo, quitamos el prefijo para no duplicarlo
  if (digits.startsWith(codeDigits) && digits.length > codeDigits.length) {
    digits = digits.slice(codeDigits.length);
  }

  // Hallar el límite de dígitos según país
  const countryConfig = SUPPORTED_COUNTRY_CODES.find((c) => c.code === countryCode);
  const maxDigits = countryConfig ? countryConfig.digits : 12;

  return digits.slice(0, maxDigits);
}

/**
 * Normaliza y valida un número telefónico dado su código de país y número nacional
 * Garantiza formato E.164 (+506XXXXXXXX) sin duplicación del código de país.
 */
export function normalizePhone(rawNumber: string, countryCode: string = '+506'): string {
  const cleanCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const codeDigits = cleanCode.replace(/\D/g, '');
  let digitsOnly = rawNumber.replace(/\D/g, '');

  // Si rawNumber ya contiene el código de país al inicio, lo extraemos para evitar duplicarlo
  if (digitsOnly.startsWith(codeDigits) && digitsOnly.length > codeDigits.length) {
    digitsOnly = digitsOnly.slice(codeDigits.length);
  }

  return `${cleanCode}${digitsOnly}`;
}

export const numericPhoneSchema = z.string()
  .min(7, 'El número de teléfono debe tener al menos 7 u 8 dígitos numéricos')
  .max(16, 'El número de teléfono no puede exceder 16 caracteres')
  .refine((val) => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, {
    message: 'Solo se permiten dígitos numéricos válidos (8 dígitos para Costa Rica)'
  });

export const CreateBookingSchema = z.object({
  clientName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80, 'Nombre demasiado largo'),
  countryCode: z.string().default('+506'),
  clientPhone: numericPhoneSchema,
  modality: z.enum(['AT_STATION', 'HOME_VISIT'], {
    required_error: 'Debe seleccionar la modalidad'
  }),
  locationId: z.string().optional(),
  customAddress: z.string().trim().max(250, 'La dirección es demasiado larga').optional(),
  // Ahora es opcional: si el cliente no elige esteticista, llega a la bandeja de todas
  professionalId: z.string().optional(),
  serviceId: z.string().optional(),
  packageId: z.string().optional(),
  startTime: z.string().datetime({ message: 'La fecha y hora deben ser una fecha válida ISO' }),
  clientNotes: z.string().max(300, 'Las notas no pueden exceder 300 caracteres').optional(),
  acceptDataPolicy: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar el uso de datos para gestionar la cita'
  })
}).refine((data) => data.serviceId || data.packageId, {
  message: 'Debe seleccionar al menos un servicio o un paquete',
  path: ['serviceId']
}).refine((data) => {
  if (data.modality === 'HOME_VISIT') {
    return !!data.locationId && (data.customAddress && data.customAddress.length >= 5);
  }
  return true;
}, {
  message: 'Para atención a domicilio debe indicar la localidad y su dirección o señas exactas',
  path: ['customAddress']
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const CreateManualBookingSchema = z.object({
  clientName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  countryCode: z.string().default('+506'),
  clientPhone: numericPhoneSchema,
  modality: z.enum(['AT_STATION', 'HOME_VISIT']),
  locationId: z.string().optional(),
  customAddress: z.string().trim().max(250).optional(),
  professionalId: z.string().min(1, 'Debe seleccionar una esteticista para la asignación'),
  serviceId: z.string().optional(),
  packageId: z.string().optional(),
  startTime: z.string().datetime(),
  clientNotes: z.string().max(300).optional(),
  staffNotes: z.string().max(500).optional()
}).refine((data) => data.serviceId || data.packageId, {
  message: 'Debe seleccionar al menos un servicio o paquete',
  path: ['serviceId']
});

export type CreateManualBookingInput = z.infer<typeof CreateManualBookingSchema>;

export const AssignBookingSchema = z.object({
  professionalId: z.string().min(1, 'Debe indicar la esteticista a asignar'),
  status: z.enum(['PENDING', 'CONFIRMED']).default('CONFIRMED'),
  staffNotes: z.string().optional()
});

export type AssignBookingInput = z.infer<typeof AssignBookingSchema>;

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED']),
  staffNotes: z.string().max(500).optional(),
  professionalId: z.string().optional()
});

export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;

export const CreateTimeBlockSchema = z.object({
  professionalId: z.string().min(1),
  title: z.string().min(2).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isBreak: z.boolean().default(false)
});

export type CreateTimeBlockInput = z.infer<typeof CreateTimeBlockSchema>;

export const SetDayAvailabilitySchema = z.object({
  professionalId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)').default('08:00'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)').default('17:00'),
  isOpen: z.boolean().default(true),
  customNote: z.string().max(200).optional()
});

export type SetDayAvailabilityInput = z.infer<typeof SetDayAvailabilitySchema>;

export const BatchOpenDaysSchema = z.object({
  professionalId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('08:00'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('17:00'),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
  customNote: z.string().max(200).optional()
});

export type BatchOpenDaysInput = z.infer<typeof BatchOpenDaysSchema>;
