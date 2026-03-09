import DOMPurify from "dompurify"

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe formatting tags but strips scripts and dangerous attributes.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover"],
  })
}

/**
 * Strip all HTML tags from a string, returning plain text.
 * Useful for notification messages, previews, etc.
 */
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
}
