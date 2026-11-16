const API_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000/api');

export async function fetchCatalog() {
  const res = await fetch(`${API_URL}/catalog`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error al cargar catálogo');
  return res.json();
}

export async function fetchOpenDays(professionalId?: string) {
  const query = professionalId ? `?professionalId=${encodeURIComponent(professionalId)}` : '';
  const res = await fetch(`${API_URL}/availability/open-days${query}`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Error al consultar días habilitados');
  return res.json();
}

export async function fetchAvailability(params: {
  professionalId?: string;
  serviceId?: string;
  packageId?: string;
  modality: 'AT_STATION' | 'HOME_VISIT';
  date: string;
}) {
  const query = new URLSearchParams({
    modality: params.modality,
    date: params.date,
    ...(params.professionalId ? { professionalId: params.professionalId } : {}),
    ...(params.serviceId ? { serviceId: params.serviceId } : {}),
    ...(params.packageId ? { packageId: params.packageId } : {})
  });

  const res = await fetch(`${API_URL}/availability?${query.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener disponibilidad');
  }
  return res.json();
}

export async function createBookingRequest(payload: any) {
  const res = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data.issues?.map((i: any) => i.message).join(', ') || data.error || 'Error al enviar reserva';
    throw new Error(message);
  }
  return data;
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
  return data;
}

export async function adminLogout() {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
}

export async function fetchAdminBookings(
  token?: string,
  filters?: { status?: string; professionalId?: string; date?: string; startDate?: string; endDate?: string }
) {
  const query = new URLSearchParams(filters as any);
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/bookings?${query.toString()}`, {
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  if (!res.ok) throw new Error('Error al cargar reservas');
  return res.json();
}

export async function updateBookingStatusApi(bookingId: string, status: string, staffNotes?: string, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify({ status, staffNotes })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al actualizar reserva');
  }
  return data;
}

export async function createManualBookingApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/bookings/manual`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    const detailMsg = data.details
      ? data.details.map((d: any) => d.message).join('; ')
      : data.issues
      ? data.issues.map((i: any) => i.message).join('; ')
      : data.error || 'Error al crear cita manual';
    throw new Error(detailMsg);
  }
  return data;
}

export async function assignBookingApi(bookingId: string, professionalId: string, staffNotes?: string, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/bookings/${bookingId}/assign`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify({ professionalId, staffNotes })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al asignar cita');
  }
  return data;
}

export async function createTimeBlockApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/time-blocks`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear bloqueo');
  return data;
}

export async function fetchAdminAvailability(professionalId?: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const query = professionalId ? `?professionalId=${professionalId}` : '';
  const res = await fetch(`${API_URL}/admin/availability${query}`, {
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  if (!res.ok) throw new Error('Error al consultar disponibilidad');
  return res.json();
}

export async function openDayApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/availability/open-day`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al habilitar día');
  return data;
}

export async function closeDayApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/availability/close-day`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al bloquear día');
  return data;
}

export async function batchOpenDaysApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/availability/batch-open`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al habilitar lote de días');
  return data;
}

export async function fetchAdminProfileApi(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/me`, {
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener perfil');
  return data;
}

export async function updateAdminProfileApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/me`, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar perfil');
  return data;
}

export async function fetchAdminServicesApi(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/services`, {
    headers,
    credentials: 'include',
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar servicios');
  return data.services || [];
}

export async function createAdminServiceApi(payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/services`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear servicio');
  return data;
}

export async function updateAdminServiceApi(id: string, payload: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/services/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar servicio');
  return data;
}

export async function toggleAdminServiceApi(id: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/services/${id}/toggle`, {
    method: 'PATCH',
    headers,
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cambiar estado del servicio');
  return data;
}

export async function deleteAdminServiceApi(id: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/services/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar servicio');
  return data;
}

// =========================================================================
// UBICACIONES Y TARIFAS DE DOMICILIO (ADMIN)
// =========================================================================

export async function fetchAdminLocationsApi(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/locations`, {
    headers,
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener ubicaciones');
  return data.locations || [];
}

export async function createAdminLocationApi(
  payload: { name: string; priceCRC: number; discountCRC?: number; active?: boolean },
  token?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/locations`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear localidad');
  return data;
}

export async function updateAdminLocationApi(
  id: string,
  payload: { name?: string; priceCRC?: number; discountCRC?: number },
  token?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/locations/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar localidad');
  return data;
}

export async function toggleAdminLocationApi(id: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/locations/${id}/toggle`, {
    method: 'PATCH',
    headers,
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al alternar estado de la localidad');
  return data;
}

export async function deleteAdminLocationApi(id: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/admin/locations/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar localidad');
  return data;
}
