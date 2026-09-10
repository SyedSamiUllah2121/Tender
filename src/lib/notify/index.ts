export interface NotificationPayload {
  to: string; // phone or email
  title: string;
  body: string;
  linkUrl?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
}

export interface Notifier {
  send(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }>;
}

export * from './deepLink';
export * from './whatsapp';
export * from './email';
