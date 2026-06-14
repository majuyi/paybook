/**
 * The §9.3 credit reminder template. This is the ONLY format used for credit
 * reminders in v1; the Step 8 WhatsApp Business API will register and send this
 * same text. `amountOwed` is the already-formatted number (no ₦ — the template
 * adds it).
 */
export function creditReminderMessage(
  customerName: string,
  shopName: string,
  amountOwed: string,
): string {
  return (
    `Hello ${customerName},\n\n` +
    `This is a reminder from ${shopName}. You have an outstanding balance of ₦${amountOwed}.\n\n` +
    `Please settle at your earliest convenience. Thank you.\n\n` +
    `Sent via Paybook · paybook.ng`
  )
}

/** Build a wa.me deep link from an E.164 phone and a message. */
export function waMeLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
