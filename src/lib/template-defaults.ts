import type { Template } from "@/types/domain"

export function defaultQuoteSummaryFromTemplates(templates: Template[]): string {
  const quoteTemplates = templates.filter((t) => t.type === "quote")
  const preferred =
    quoteTemplates.find((t) => t.isDefault) ?? quoteTemplates[0] ?? null
  return preferred?.content?.trim() ?? ""
}

export function defaultReminderMessageFromTemplates(templates: Template[]): string {
  const reminderTemplates = templates.filter((t) => t.type === "reminder")
  const preferred =
    reminderTemplates.find((t) => t.isDefault) ?? reminderTemplates[0] ?? null
  return preferred?.content?.trim() ?? ""
}
