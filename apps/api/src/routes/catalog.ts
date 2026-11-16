import { Router } from 'express';
import { prisma } from '../prisma';

export const catalogRouter = Router();

catalogRouter.get('/', async (req, res) => {
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cano_negro_pretty_main' }
    });

    const services = await prisma.service.findMany({
      where: { active: true },
      include: {
        professionals: {
          select: { professionalId: true }
        }
      }
    });

    const packages = await prisma.package.findMany({
      where: { active: true },
      include: {
        components: {
          include: { service: true }
        }
      }
    });

    const professionals = await prisma.professional.findMany({
      where: { active: true }
    });

    const locations = await prisma.locationDiscount.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });

    // Formatear servicios
    const formattedServices = services.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      imageUrl: s.imageUrl,
      priceCRC: s.priceCRC,
      durationBlocks: s.durationBlocks,
      durationMinutes: s.durationBlocks * 15,
      active: s.active,
      enabledProfessionalIds: s.professionals.map(p => p.professionalId)
    }));

    // Formatear paquetes
    const formattedPackages = packages.map(p => {
      const componentsSum = p.components.reduce((sum, c) => sum + c.service.priceCRC, 0);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        componentServiceIds: p.components.map(c => c.serviceId),
        extraPriceCRC: p.extraPriceCRC,
        totalPriceCRC: Math.max(0, componentsSum + p.extraPriceCRC),
        totalDurationBlocks: p.totalDurationBlocks,
        totalDurationMinutes: p.totalDurationBlocks * 15,
        active: p.active
      };
    });

    res.json({
      business: {
        name: business?.name || 'Caño Negro Pretty',
        currency: business?.currency || 'CRC',
        timezone: business?.timezone || 'America/Costa_Rica',
        homeVisitBufferMinutes: business?.homeVisitBufferMinutes || 30
      },
      services: formattedServices,
      packages: formattedPackages,
      professionals,
      locations
    });
  } catch (error: any) {
    console.error('Error al cargar catálogo:', error);
    res.status(500).json({ error: 'Error al obtener el catálogo de servicios' });
  }
});
