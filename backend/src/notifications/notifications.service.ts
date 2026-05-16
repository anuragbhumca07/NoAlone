import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseAdmin: any = null;

  constructor(private prisma: PrismaService) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
          });
        }
        this.firebaseAdmin = admin;
        this.logger.log('Firebase initialized');
      }
    } catch (e) {
      this.logger.warn('Firebase not initialized: ' + e.message);
    }
  }

  async sendToUser(userId: string, notification: { title: string; body: string; data?: Record<string, string> }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken || !this.firebaseAdmin) return;

    try {
      await this.firebaseAdmin.messaging().send({
        token: user.fcmToken,
        notification: { title: notification.title, body: notification.body },
        data: notification.data || {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (e) {
      this.logger.error(`Failed to send push to ${userId}: ${e.message}`);
    }
  }

  async sendToMultiple(userIds: string[], notification: { title: string; body: string; data?: Record<string, string> }) {
    await Promise.allSettled(userIds.map((id) => this.sendToUser(id, notification)));
  }
}
