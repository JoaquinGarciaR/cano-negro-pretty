import webPush from 'web-push';
import { prisma } from '../prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contacto@canonegropretty.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn('Error configurando VAPID keys para web-push:', e);
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
  options?: { urgency?: 'very-low' | 'low' | 'normal' | 'high'; ttl?: number; topic?: string }
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  });

  const payloadString = JSON.stringify(payload);
  let sentCount = 0;

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payloadString,
        {
          // 'high' fuerza entrega inmediata en Apple APNs (iOS) y Google FCM (Android),
          // evitando que el SO del iPhone ponga la notificación en cola para ahorrar batería.
          urgency: options?.urgency || 'high',
          TTL: options?.ttl ?? 86400, // 24 horas de retención en caso de pérdida temporal de señal
          topic: options?.topic
        }
      );
      sentCount++;
    } catch (err: any) {
      // Si la suscripción expiró o fue deshabilitada (HTTP 410 Gone o 404)
      if (err.statusCode === 410 || err.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.warn('Error enviando push notification:', err?.message || err);
      }
    }
  }

  return { total: subscriptions.length, sent: sentCount };
}

export async function sendPushToSalon(businessId: string, payload: { title: string; body: string; url?: string }) {
  const users = await prisma.user.findMany({
    where: { businessId },
    select: { id: true }
  });

  let totalSent = 0;
  for (const u of users) {
    const res = await sendPushToUser(u.id, payload);
    totalSent += res.sent;
  }
  return totalSent;
}

export async function sendPushToProfessional(
  professionalId: string,
  payload: { title: string; body: string; url?: string }
) {
  const user = await prisma.user.findFirst({
    where: { professionalId },
    select: { id: true }
  });
  if (!user) return { total: 0, sent: 0 };
  return await sendPushToUser(user.id, payload);
}

export async function sendPushToOwners(
  businessId: string,
  payload: { title: string; body: string; url?: string }
) {
  const owners = await prisma.user.findMany({
    where: { businessId, role: 'OWNER' },
    select: { id: true }
  });
  let totalSent = 0;
  for (const o of owners) {
    const res = await sendPushToUser(o.id, payload);
    totalSent += res.sent;
  }
  return totalSent;
}
