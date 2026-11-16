export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export type Modality = 'AT_STATION' | 'HOME_VISIT';

export type UserRole = 'OWNER' | 'STAFF';

export type ServiceCategory = 'unas' | 'pestanas' | 'peinados';

export type WhatsAppVoice = 'AS_PROFESSIONAL' | 'AS_BUSINESS';

export interface LocationItem {
  id: string;
  name: string;
  priceCRC: number; // Tarifa / Precio de desplazamiento a domicilio en colones
  discountCRC: number; // Descuento opcional
  active: boolean;
}

export interface ProfessionalItem {
  id: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  active: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory | string;
  description: string;
  imageUrl: string;
  priceCRC: number;
  durationBlocks: number; // Cada bloque = 15 min
  durationMinutes: number; // durationBlocks * 15
  active: boolean;
  enabledProfessionalIds: string[];
}

export interface PackageItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  componentServiceIds: string[];
  extraPriceCRC: number;
  totalPriceCRC: number;
  totalDurationBlocks: number;
  totalDurationMinutes: number;
  active: boolean;
}

export interface AvailableTimeSlot {
  startTime: string; // ISO string UTC
  endTime: string;   // ISO string UTC
  localStartTime: string; // HH:mm format in America/Costa_Rica
  localEndTime: string;   // HH:mm format in America/Costa_Rica
  available: boolean;
  requiredBlocks?: number;
  consecutiveBlocks?: string[];
  conflictDetail?: string;
}

export interface DayAvailabilityItem {
  id?: string;
  professionalId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isOpen: boolean;
  customNote?: string | null;
}

export interface BookingResponseDTO {
  id: string;
  referenceCode: string;
  clientName: string;
  clientPhone: string;
  countryCode?: string;
  modality: Modality;
  locationName?: string | null;
  locationFeeCRC?: number;
  customAddress?: string | null;
  professional?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
  serviceName: string;
  durationMinutes: number;
  priceBaseCRC: number;
  discountCRC: number;
  totalCRC: number;
  startTime: string; // ISO UTC
  endTime: string;   // ISO UTC
  status: BookingStatus;
  clientNotes?: string | null;
  staffNotes?: string | null;
  hasConflict?: boolean;
  conflictMessage?: string | null;
  createdAt: string;
}
