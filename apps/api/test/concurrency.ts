import { createBooking, updateBookingStatus } from '../src/services/booking';
import { calculateAvailability } from '../src/services/availability';
import { buildWhatsAppMessage } from '@cano/shared';
import { prisma } from '../src/prisma';
import assert from 'assert';

async function runTests() {
  console.log('[Test] Iniciando Suite de Pruebas de Concurrencia y Reglas de Negocio...\n');

  // Limpiar posibles reservas previas del test
  await prisma.booking.deleteMany({
    where: { clientName: { in: ['Clienta Ana (Test)', 'Clienta Beatriz (Test)'] } }
  });

  const testStartTime = '2026-11-25T15:00:00.000Z'; // Futuro

  // Desbloquear el dia de prueba para Elena Mora
  await prisma.dayAvailability.upsert({
    where: {
      professionalId_date: {
        professionalId: 'prof_elena',
        date: '2026-11-25'
      }
    },
    update: { startTime: '08:00', endTime: '17:00', isOpen: true },
    create: { professionalId: 'prof_elena', date: '2026-11-25', startTime: '08:00', endTime: '17:00', isOpen: true }
  });

  // Test 1: Crear dos solicitudes en la misma franja para la misma esteticista
  console.log('1️⃣ Creando solicitudes simultáneas en el mismo horario...');
  const bookingA = await createBooking({
    clientName: 'Clienta Ana (Test)',
    clientPhone: '88881111',
    modality: 'AT_STATION',
    professionalId: 'prof_elena',
    serviceId: 'srv_unas_semi',
    startTime: testStartTime,
    acceptDataPolicy: true
  });
  console.log(`   ✓ Solicitud A creada: #${bookingA.referenceCode} (${bookingA.status})`);

  const bookingB = await createBooking({
    clientName: 'Clienta Beatriz (Test)',
    clientPhone: '88882222',
    modality: 'AT_STATION',
    professionalId: 'prof_elena',
    serviceId: 'srv_unas_semi',
    startTime: testStartTime,
    acceptDataPolicy: true
  });
  console.log(`   ✓ Solicitud B creada: #${bookingB.referenceCode} (${bookingB.status})`);

  // Test 2: Confirmar la solicitud A debe tener éxito
  console.log('\n2️⃣ Confirmando Solicitud A...');
  const confirmedA = await updateBookingStatus(bookingA.id, { status: 'CONFIRMED' });
  assert.strictEqual(confirmedA.status, 'CONFIRMED');
  console.log(`   ✓ Solicitud A confirmada exitosamente.`);

  // Test 3: Confirmar la solicitud B debe fallar con error CONFLICT
  console.log('\n3️⃣ Intentando confirmar Solicitud B (debe fallar por colisión atómica)...');
  let conflictCaught = false;
  try {
    await updateBookingStatus(bookingB.id, { status: 'CONFIRMED' });
  } catch (err: any) {
    if (err.code === 'CONFLICT') {
      conflictCaught = true;
      console.log(`   ✓ Correcto: El motor atómico rechazó la confirmación con error CONFLICT.`);
      console.log(`     Detalle: ${err.message}`);
    } else {
      throw err;
    }
  }
  assert.strictEqual(conflictCaught, true, 'Se esperaba error de CONFLICT por doble reserva');

  // Test 4: Cancelar A y reintentar B
  console.log('\n4️⃣ Cancelando Solicitud A y reintentando Solicitud B...');
  await updateBookingStatus(bookingA.id, { status: 'CANCELLED' });
  console.log(`   ✓ Solicitud A cancelada (agenda liberada).`);

  const confirmedB = await updateBookingStatus(bookingB.id, { status: 'CONFIRMED' });
  assert.strictEqual(confirmedB.status, 'CONFIRMED');
  console.log(`   ✓ Solicitud B ahora confirmada con éxito sin colisión.`);

  // Test 5: Comprobación de mensajes de WhatsApp
  console.log('\n5️⃣ Verificando generación de mensaje de WhatsApp con doble voz...');
  const waProf = buildWhatsAppMessage({
    voice: 'AS_PROFESSIONAL',
    clientName: confirmedB.clientName,
    clientPhone: confirmedB.clientPhone,
    professionalName: confirmedB.professional.name,
    serviceName: confirmedB.snapshotServiceName,
    formattedDate: 'Miércoles 25 de Noviembre',
    formattedTime: '09:00 AM',
    durationMinutes: confirmedB.snapshotDurationMinutes,
    modality: confirmedB.modality,
    totalCRC: confirmedB.snapshotTotalCRC,
    referenceCode: confirmedB.referenceCode
  });
  assert(waProf.includes('Soy Elena Mora de Caño Negro Pretty'));
  console.log('   ✓ Voz como Esteticista validada.');

  const waBiz = buildWhatsAppMessage({
    voice: 'AS_BUSINESS',
    clientName: confirmedB.clientName,
    clientPhone: confirmedB.clientPhone,
    professionalName: confirmedB.professional.name,
    serviceName: confirmedB.snapshotServiceName,
    formattedDate: 'Miércoles 25 de Noviembre',
    formattedTime: '09:00 AM',
    durationMinutes: confirmedB.snapshotDurationMinutes,
    modality: confirmedB.modality,
    totalCRC: confirmedB.snapshotTotalCRC,
    referenceCode: confirmedB.referenceCode
  });
  assert(waBiz.includes('Te escribimos de Caño Negro Pretty'));
  console.log('   ✓ Voz como Negocio validada.');

  // Limpiar
  await prisma.booking.deleteMany({
    where: { clientName: { in: ['Clienta Ana (Test)', 'Clienta Beatriz (Test)'] } }
  });

  console.log('\n[Test] TODAS LAS PRUEBAS DE CONCURRENCIA Y REGLAS DE NEGOCIO PASARON SATISFACTORIAMENTE!\n');
}

runTests()
  .catch((e) => {
    console.error('Error en pruebas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
