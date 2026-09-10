/**
 * Pure link helpers, safe to import from client components.
 *
 * Kept apart from the notifier implementations so that browser bundles never
 * pull in the modules that read WhatsApp/email credentials from process.env.
 */

/**
 * Click-to-chat web WhatsApp deep link generator
 */
export function getWhatsAppUrl(phone: string, text: string): string {
  let clean = phone.replace(/[\s\-\+\(\)]/g, '');
  if (clean.startsWith('05')) {
    clean = '971' + clean.substring(1);
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}
