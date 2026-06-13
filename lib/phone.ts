/**
 * Normalize a Nigerian phone number to E.164 (+234XXXXXXXXXX).
 * Accepts: 0803..., 803..., 234803..., +234803... and spaced variants.
 * Returns null if it can't be coerced into a valid 10-digit NG subscriber number.
 */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')

  let subscriber: string | null = null
  if (digits.length === 11 && digits.startsWith('0')) {
    subscriber = digits.slice(1) // 0803... -> 803...
  } else if (digits.length === 10) {
    subscriber = digits // 803...
  } else if (digits.length === 13 && digits.startsWith('234')) {
    subscriber = digits.slice(3)
  } else if (digits.length === 14 && digits.startsWith('2340')) {
    subscriber = digits.slice(4)
  }

  if (!subscriber || subscriber.length !== 10) return null
  return `+234${subscriber}`
}
