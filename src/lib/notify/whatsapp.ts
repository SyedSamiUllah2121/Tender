import { Notifier, NotificationPayload } from './index';

/**
 * WhatsApp Notifier conforming to Meta WhatsApp Business Cloud API v21.0
 * Endpoint: https://graph.facebook.com/v21.0/{phone_number_id}/messages
 */
export class WhatsAppNotifier implements Notifier {
  private phoneNumberId: string;
  private apiToken: string;

  constructor(phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '', apiToken = process.env.WHATSAPP_API_TOKEN || '') {
    this.phoneNumberId = phoneNumberId;
    this.apiToken = apiToken;
  }

  async send(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    // Format recipient phone number to E.164 (UAE e.g. 97150xxxxxxx)
    let cleanPhone = payload.to.replace(/[\s\-\+\(\)]/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '971' + cleanPhone.substring(1);
    }

    // Build standard Meta WhatsApp Cloud API body
    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: payload.templateName ? 'template' : 'text',
      ...(payload.templateName
        ? {
            template: {
              name: payload.templateName,
              language: { code: 'en' },
              components: [
                {
                  type: 'body',
                  parameters: Object.entries(payload.templateVariables || {}).map(([_, text]) => ({
                    type: 'text',
                    text,
                  })),
                },
              ],
            },
          }
        : {
            text: {
              preview_url: Boolean(payload.linkUrl),
              body: `${payload.title}\n\n${payload.body}${payload.linkUrl ? `\nView: ${payload.linkUrl}` : ''}`,
            },
          }),
    };

    console.log('[WhatsAppNotifier] Outbound Meta Cloud API Request:', JSON.stringify(metaPayload, null, 2));

    if (this.phoneNumberId && this.apiToken) {
      try {
        const response = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        });
        const data = await response.json();
        return { success: response.ok, id: data?.messages?.[0]?.id, error: data?.error?.message };
      } catch (err: any) {
        console.error('[WhatsAppNotifier] Error sending WhatsApp message:', err);
        return { success: false, error: err.message };
      }
    }

    // In prototype/mock mode without active token, log to console
    return { success: true, id: `wamid.HBgM${Date.now()}` };
  }
}

export const whatsappNotifier = new WhatsAppNotifier();
