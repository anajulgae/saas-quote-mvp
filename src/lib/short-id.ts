import { randomBytes } from "node:crypto"

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

/**
 * URL-safe short ID (default 10 chars ≈ 62^10 ≈ 8.4 × 10^17 combinations).
 * No external dependency — uses node:crypto for randomness.
 */
export function shortId(length = 10): string {
  const bytes = randomBytes(length)
  let result = ""
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return result
}
