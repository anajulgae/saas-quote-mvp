import type { NotificationPreferences } from "@/types/domain"

export function defaultNotificationPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    inquiryInApp: true,
    inquiryBrowser: true,
    inquiryEmail: true,
    quoteEventsInApp: true,
    quoteEventsBrowser: false,
    quoteEventsEmail: false,
    invoiceEventsInApp: true,
    invoiceEventsBrowser: false,
    invoiceEventsEmail: false,
    reminderEventsInApp: true,
    reminderEventsBrowser: false,
    reminderEventsEmail: false,
  }
}
