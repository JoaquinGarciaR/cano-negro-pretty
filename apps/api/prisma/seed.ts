import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const isCleanup =
    process.argv.includes('--reset') ||
    process.argv.includes('--cleanup') ||
    process.env.RESET_DB === 'true' ||
    process.env.CLEANUP === 'true';

  const isSeedMock =
    process.argv.includes('--mock') ||
    process.env.SEED_MOCK_DATA === 'true' ||
    process.env.SEED_BOOKINGS === 'true';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌸 Caño Negro Pretty · Inicialización de Base de Datos');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[Modo] Cleanup / Reinicio a 0: ${isCleanup ? 'SI (Activado)' : 'NO'}`);
  console.log(`[Modo] Inyectar Citas de Prueba: ${isSeedMock ? 'SI (Activado)' : 'NO'}`);

  // 1. Opcional: Cleanup total de datos de transacciones (Poner en 0)
  if (isCleanup) {
    console.log('\n🧹 [Cleanup] Eliminando registros transaccionales previos...');
    await prisma.notification.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.timeBlock.deleteMany({});
    await prisma.dayAvailability.deleteMany({});
    console.log('✅ Bandeja de citas, bloqueos, auditorías y notificaciones restablecidas a 0.');
  }

  // 2. Leer catálogo maestro de config/services.json
  const configPath = path.resolve(__dirname, '../../../config/services.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`No se encontró config/services.json en: ${configPath}`);
  }
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 3. Negocio Principal
  const business = await prisma.business.upsert({
    where: { id: 'cano_negro_pretty_main' },
    update: {
      name: 'Caño Negro Pretty',
      currency: 'CRC',
      timezone: 'America/Costa_Rica',
      homeVisitBufferMinutes: 30,
      stationBufferMinutes: 15
    },
    create: {
      id: 'cano_negro_pretty_main',
      name: 'Caño Negro Pretty',
      currency: 'CRC',
      timezone: 'America/Costa_Rica',
      homeVisitBufferMinutes: 30,
      stationBufferMinutes: 15
    }
  });
  console.log(`\n🏢 Negocio configurado: ${business.name} (${business.timezone})`);

  // 4. Configuración de Contraseñas y Hashes Bcrypt
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const elenaPassword = process.env.STAFF_PASSWORD_ELENA || 'pretty123';
  const sofiaPassword = process.env.STAFF_PASSWORD_SOFIA || 'pretty123';

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminPassword, salt);
  const elenaHash = await bcrypt.hash(elenaPassword, salt);
  const sofiaHash = await bcrypt.hash(sofiaPassword, salt);

  // 5. Instanciar los 3 Perfiles Iniciales Obligatorios
  console.log('\n👥 Configurando los 3 perfiles principales del salón:');

  // Perfil 1: Propietaria (Doña Carmen)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@canonegropretty.com' },
    update: {
      name: 'Doña Carmen (Propietaria)',
      passwordHash: adminHash,
      role: UserRole.OWNER,
      businessId: business.id
    },
    create: {
      email: 'admin@canonegropretty.com',
      passwordHash: adminHash,
      name: 'Doña Carmen (Propietaria)',
      role: UserRole.OWNER,
      businessId: business.id
    }
  });
  console.log(`  1. Propietaria: ${adminUser.name} <${adminUser.email}> (Rol: OWNER)`);

  // Perfil 2: Esteticista Elena Mora
  const profElena = await prisma.professional.upsert({
    where: { id: 'prof_elena' },
    update: {
      name: 'Elena Mora',
      bio: 'Especialista en Uñas Acrílicas, Gel y Diseños de Tendencia',
      avatarUrl: 'https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=150',
      active: true,
      businessId: business.id
    },
    create: {
      id: 'prof_elena',
      name: 'Elena Mora',
      bio: 'Especialista en Uñas Acrílicas, Gel y Diseños de Tendencia',
      avatarUrl: 'https://images.unsplash.com/photo-1595959183082-7b570b7e08e2?w=150',
      active: true,
      businessId: business.id
    }
  });

  const elenaUser = await prisma.user.upsert({
    where: { email: 'elena@canonegropretty.com' },
    update: {
      name: 'Elena Mora',
      passwordHash: elenaHash,
      role: UserRole.STAFF,
      professionalId: profElena.id,
      businessId: business.id
    },
    create: {
      email: 'elena@canonegropretty.com',
      passwordHash: elenaHash,
      name: 'Elena Mora',
      role: UserRole.STAFF,
      professionalId: profElena.id,
      businessId: business.id
    }
  });
  console.log(`  2. Esteticista: ${elenaUser.name} <${elenaUser.email}> (Vinculada a prof_elena)`);

  // Perfil 3: Esteticista Sofía Vargas
  const profSofia = await prisma.professional.upsert({
    where: { id: 'prof_sofia' },
    update: {
      name: 'Sofía Vargas',
      bio: 'Experta en Pestañas Pelo a Pelo, Lifting y Peinados para Ocasiones Especiales',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      active: true,
      businessId: business.id
    },
    create: {
      id: 'prof_sofia',
      name: 'Sofía Vargas',
      bio: 'Experta en Pestañas Pelo a Pelo, Lifting y Peinados para Ocasiones Especiales',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      active: true,
      businessId: business.id
    }
  });

  const sofiaUser = await prisma.user.upsert({
    where: { email: 'sofia@canonegropretty.com' },
    update: {
      name: 'Sofía Vargas',
      passwordHash: sofiaHash,
      role: UserRole.STAFF,
      professionalId: profSofia.id,
      businessId: business.id
    },
    create: {
      email: 'sofia@canonegropretty.com',
      passwordHash: sofiaHash,
      name: 'Sofía Vargas',
      role: UserRole.STAFF,
      professionalId: profSofia.id,
      businessId: business.id
    }
  });
  console.log(`  3. Esteticista: ${sofiaUser.name} <${sofiaUser.email}> (Vinculada a prof_sofia)`);

  // 6. Configurar Horarios Semanales y Disponibilidad (Lunes a Sábado 8:00 AM - 5:00 PM)
  const professionals = [profElena, profSofia];
  for (const prof of professionals) {
    for (let day = 0; day <= 6; day++) {
      const isWorkingDay = day >= 1 && day <= 6; // Lunes a Sábado
      await prisma.schedule.upsert({
        where: {
          professionalId_dayOfWeek: {
            professionalId: prof.id,
            dayOfWeek: day
          }
        },
        update: {
          startTime: '08:00',
          endTime: '17:00',
          isWorkingDay
        },
        create: {
          professionalId: prof.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          isWorkingDay
        }
      });
    }

    // Desbloquear fechas para los próximos 14 días laborables
    const today = new Date();
    for (let offset = 1; offset <= 14; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        const dateStr = d.toISOString().split('T')[0];
        await prisma.dayAvailability.upsert({
          where: {
            professionalId_date: {
              professionalId: prof.id,
              date: dateStr
            }
          },
          update: {
            startTime: '08:00',
            endTime: '17:00',
            isOpen: true
          },
          create: {
            professionalId: prof.id,
            date: dateStr,
            startTime: '08:00',
            endTime: '17:00',
            isOpen: true
          }
        });
      }
    }
  }
  console.log('✅ Horarios semanales y días abiertos habilitados para ambas especialistas.');

  // 7. Localidades Domicilio de Caño Negro
  for (const loc of configData.locations) {
    const existing = await prisma.locationDiscount.findFirst({
      where: { businessId: business.id, name: loc.name }
    });
    if (!existing) {
      await prisma.locationDiscount.create({
        data: {
          businessId: business.id,
          name: loc.name,
          discountCRC: loc.discountCRC || 0,
          active: true
        }
      });
    }
  }
  console.log(`✅ ${configData.locations.length} Localidades y tarifas de domicilio registradas.`);

  // 8. Servicios del Catálogo
  for (const srv of configData.services) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: {
        name: srv.name,
        category: srv.category,
        description: srv.description,
        imageUrl: srv.imageUrl,
        priceCRC: srv.priceCRC,
        durationBlocks: srv.durationBlocks,
        active: srv.active,
        businessId: business.id
      },
      create: {
        id: srv.id,
        name: srv.name,
        category: srv.category,
        description: srv.description,
        imageUrl: srv.imageUrl,
        priceCRC: srv.priceCRC,
        durationBlocks: srv.durationBlocks,
        active: srv.active,
        businessId: business.id
      }
    });

    if (srv.enabledProfessionals && srv.enabledProfessionals.length > 0) {
      for (const profId of srv.enabledProfessionals) {
        await prisma.professionalService.upsert({
          where: {
            professionalId_serviceId: {
              professionalId: profId,
              serviceId: srv.id
            }
          },
          update: {},
          create: {
            professionalId: profId,
            serviceId: srv.id
          }
        });
      }
    }
  }
  console.log(`✅ ${configData.services.length} Servicios configurados y vinculados.`);

  // 9. Paquetes Combinados
  for (const pkg of configData.packages) {
    await prisma.package.upsert({
      where: { id: pkg.id },
      update: {
        name: pkg.name,
        description: pkg.description,
        imageUrl: pkg.imageUrl,
        extraPriceCRC: pkg.extraPriceCRC || 0,
        totalDurationBlocks: pkg.totalDurationBlocks,
        active: pkg.active,
        businessId: business.id
      },
      create: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        imageUrl: pkg.imageUrl,
        extraPriceCRC: pkg.extraPriceCRC || 0,
        totalDurationBlocks: pkg.totalDurationBlocks,
        active: pkg.active,
        businessId: business.id
      }
    });

    for (const compId of pkg.componentServiceIds) {
      await prisma.packageService.upsert({
        where: {
          packageId_serviceId: {
            packageId: pkg.id,
            serviceId: compId
          }
        },
        update: {},
        create: {
          packageId: pkg.id,
          serviceId: compId
        }
      });
    }
  }
  console.log(`✅ ${configData.packages.length} Paquetes combinados registrados.`);

  // 10. Opcional: Inyectar Citas de Prueba / Demostración
  if (isSeedMock) {
    console.log('\n🧪 [Mock] Generando citas de prueba para el salón:');

    const tomorrow10 = new Date();
    tomorrow10.setDate(tomorrow10.getDate() + 1);
    tomorrow10.setHours(10, 0, 0, 0);
    const tomorrow11 = new Date(tomorrow10);
    tomorrow11.setMinutes(tomorrow10.getMinutes() + 60);

    // Cita 1: Sin Asignar (Bandeja general)
    await prisma.booking.upsert({
      where: { referenceCode: 'CNP-MOCK1' },
      update: {},
      create: {
        referenceCode: 'CNP-MOCK1',
        businessId: business.id,
        clientName: 'María Fernanda Rojas',
        clientPhone: '+50688990011',
        modality: 'STATION',
        professionalId: null, // Sin asignar
        serviceId: 'unas_gel_semi',
        snapshotServiceName: 'Esmaltado en Gel Semipermanente',
        snapshotDurationMinutes: 60,
        snapshotPriceCRC: 15000,
        snapshotTotalCRC: 15000,
        startTime: tomorrow10,
        endTime: tomorrow11,
        status: 'PENDING',
        clientNotes: 'Cita de prueba sin asignar en bandeja compartida.'
      }
    });
    console.log('  • Cita #CNP-MOCK1: María Fernanda Rojas (Pendiente sin asignar)');

    // Cita 2: Asignada a Elena Mora, Confirmada
    const afterTomorrow2pm = new Date();
    afterTomorrow2pm.setDate(afterTomorrow2pm.getDate() + 2);
    afterTomorrow2pm.setHours(14, 0, 0, 0);
    const afterTomorrow3pm = new Date(afterTomorrow2pm);
    afterTomorrow3pm.setMinutes(afterTomorrow2pm.getMinutes() + 60);

    await prisma.booking.upsert({
      where: { referenceCode: 'CNP-MOCK2' },
      update: {},
      create: {
        referenceCode: 'CNP-MOCK2',
        businessId: business.id,
        clientName: 'Lucía Monge Solís',
        clientPhone: '+50687654321',
        modality: 'HOME_VISIT',
        customAddress: '50m norte del Ebais de Caño Negro',
        professionalId: 'prof_elena',
        serviceId: 'pestanas_clasicas',
        snapshotServiceName: 'Extensiones de Pestañas Clásicas',
        snapshotDurationMinutes: 60,
        snapshotPriceCRC: 20000,
        snapshotLocationFeeCRC: 2000,
        snapshotTotalCRC: 22000,
        startTime: afterTomorrow2pm,
        endTime: afterTomorrow3pm,
        status: 'CONFIRMED',
        staffNotes: 'Cita de prueba confirmada para Elena a domicilio.'
      }
    });
    console.log('  • Cita #CNP-MOCK2: Lucía Monge Solís (Confirmada con Elena)');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Base de Datos Inicializada con Éxito');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Credenciales de Acceso:');
  console.log(`• Propietaria : admin@canonegropretty.com  / [${adminPassword}]`);
  console.log(`• Elena Mora  : elena@canonegropretty.com  / [${elenaPassword}]`);
  console.log(`• Sofía Vargas: sofia@canonegropretty.com  / [${sofiaPassword}]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
