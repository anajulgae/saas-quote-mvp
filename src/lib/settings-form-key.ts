import type { BusinessSettings, Template } from "@/types/domain"

/** 서버 `business_settings` 스냅샷이 바뀔 때만 폼을 리마운트하기 위한 안정 키 */
export function computeBusinessSettingsFormKey(settings: BusinessSettings): string {
  return [
    settings.id,
    settings.updatedAt ?? "",
    settings.businessName,
    settings.ownerName,
    settings.businessRegistrationNumber,
    settings.email,
    settings.phone,
    settings.paymentTerms,
    settings.bankAccount,
    settings.reminderMessage,
    settings.sealImageUrl ?? "",
    settings.sealEnabled ? "1" : "0",
  ].join("\u001f")
}

export function computeTemplatesSyncKey(templates: Template[]): string {
  return templates.map((t) => `${t.id}:${t.updatedAt ?? ""}:${t.content.length}:${t.name}`).join("|")
}
