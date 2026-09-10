import { Notifier, NotificationPayload } from './index';

export class EmailNotifier implements Notifier {
  async send(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    console.log('[EmailNotifier] Simulating outbound email:', {
      to: payload.to,
      subject: payload.title,
      body: payload.body,
      link: payload.linkUrl,
      timestamp: new Date().toISOString(),
    });
    return { success: true, id: `email_${Date.now()}` };
  }
}

export const emailNotifier = new EmailNotifier();
