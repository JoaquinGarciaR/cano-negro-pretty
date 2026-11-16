import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { catalogRouter } from './routes/catalog';
import { availabilityRouter } from './routes/availability';
import { bookingRouter } from './routes/booking';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { prisma } from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de CORS amplia para desarrollo local y red móvil (LAN)
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Rutas de la API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    salon: 'Caño Negro Pretty',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/catalog', catalogRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[API] Cano Negro Pretty API escuchando en http://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando servidor...');
  await prisma.$disconnect();
  server.close();
});
