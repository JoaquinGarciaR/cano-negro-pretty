import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Iniciando carga inicial para Caño Negro Pretty...');

  // 1. Leer catálogo de config/services.json
  const configPath = path.resolve(__dirname, '../../../config/services.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`No se encontró config/services.json en: ${configPath}`);
  }
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 2. Negocio Principal
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
  console.log(`✅ Negocio configurado: ${business.name}`);

  // 3. Usuarios y Profesionales
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('admin123', salt);
  const staffPasswordHash = await bcrypt.hash('pretty123', salt);

  // Propietaria
  await prisma.user.upsert({
    where: { email: 'admin@canonegropretty.com' },
    update: {},
    create: {
      email: 'admin@canonegropretty.com',
      passwordHash: defaultPasswordHash,
      name: 'Doña Carmen (Propietaria)',
      role: UserRole.OWNER,
      businessId: business.id
    }
  });

  // Profesionales
  for (const prof of configData.professionals) {
    const professional = await prisma.professional.upsert({
      where: { id: prof.id },
      update: {
        name: prof.name,
        bio: prof.bio,
        avatarUrl: prof.avatarUrl,
        active: prof.active,
        businessId: business.id
      },
      create: {
        id: prof.id,
        name: prof.name,
        bio: prof.bio,
        avatarUrl: prof.avatarUrl,
        active: prof.active,
        businessId: business.id
      }
    });

    // Usuario para la profesional
    const staffEmail = `${prof.id.replace('prof_', '')}@canonegropretty.com`;
    await prisma.user.upsert({
      where: { email: staffEmail },
      update: {
        professionalId: professional.id
      },
      create: {
        email: staffEmail,
        passwordHash: staffPasswordHash,
        name: prof.name,
        role: UserRole.STAFF,
        businessId: business.id,
        professionalId: professional.id
      }
    });

    // Horarios regulares (Lunes a Sábado 8:00 AM - 5:00 PM)
    for (let day = 0; day <= 6; day++) {
      const isWorkingDay = day >= 1 && day <= 6; // Lunes a Sábado
      await prisma.schedule.upsert({
        where: {
          professionalId_dayOfWeek: {
            professionalId: professional.id,
            dayOfWeek: day
          }
        },
        update: {
          startTime: '08:00',
          endTime: '17:00',
          isWorkingDay
        },
        create: {
          professionalId: professional.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '17:00',
          isWorkingDay
        }
      });
    }

    console.log(`[Seed] Profesional registrada con agenda semanal: ${professional.name}`);

    // Desbloquear fechas de muestra para los proximos 14 dias
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
              professionalId: professional.id,
              date: dateStr
            }
          },
          update: {
            startTime: '08:00',
            endTime: '17:00',
            isOpen: true
          },
          create: {
            professionalId: professional.id,
            date: dateStr,
            startTime: '08:00',
            endTime: '17:00',
            isOpen: true
          }
        });
      }
    }
  }

  // 4. Localidades y Descuentos Domicilio
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
  console.log(`✅ ${configData.locations.length} Localidades de Caño Negro registradas.`);

  // 5. Servicios
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

    // Habilitar a profesionales asignadas
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
  console.log(`✅ ${configData.services.length} Servicios registrados y vinculados.`);

  // 6. Paquetes Combinados
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

    // Componentes del paquete
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

  console.log('\n[Seed] Completado con exito para Cano Negro Pretty');
  console.log('Credenciales por defecto:');
  console.log('Propietaria: admin@canonegropretty.com / admin123');
  console.log('Esteticista Elena: elena@canonegropretty.com / pretty123');
  console.log('Esteticista Sofía: sofia@canonegropretty.com / pretty123');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
