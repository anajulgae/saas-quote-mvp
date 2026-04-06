/**
 * 한국형 달력 표시(일요일·공휴일 빨강, 토요일 파랑).
 * 브라우저 로컬 날짜 기준이므로 한국에서 쓰면 KST와 일치합니다.
 *
 * 고정 공휴일(양력) + 설·추석·대체공휴일 등은 연도별 ISO 목록으로 보강합니다.
 * (목록은 officeholidays.com 등 공개 캘린더를 참고해 수동 갱신)
 */

import { cn } from "@/lib/utils"

/** 매년 동일한 양력 공휴일(MM-DD) */
const FIXED_PUBLIC_HOLIDAY_MM_DD = new Set([
  "01-01",
  "03-01",
  "05-05",
  "06-06",
  "08-15",
  "10-03",
  "10-09",
  "12-25",
])

/**
 * 설·추석·부처님·대체공휴일 등 변동일(YYYY-MM-DD).
 * 2028년 이후는 고정 공휴일 + 일요일만 자동 반영되며, 이 Set은 연 1회 정도 보강하면 됩니다.
 */
const VARIABLE_PUBLIC_HOLIDAYS_ISO = new Set<string>([
  // 2024
  "2024-02-09",
  "2024-02-10",
  "2024-02-11",
  "2024-02-12",
  "2024-05-06",
  "2024-05-15",
  "2024-09-16",
  "2024-09-17",
  "2024-09-18",
  // 2025
  "2025-01-27",
  "2025-01-28",
  "2025-01-29",
  "2025-01-30",
  "2025-10-05",
  "2025-10-06",
  "2025-10-07",
  // 2026
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-02",
  "2026-05-24",
  "2026-05-25",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-10-05",
  // 2027
  "2027-02-06",
  "2027-02-07",
  "2027-02-08",
  "2027-02-09",
  "2027-05-13",
  "2027-09-14",
  "2027-09-15",
  "2027-09-16",
  "2027-10-04",
])

export function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** `YYYY-MM-DD`를 로컬 달력 날짜(정오)로 해석 */
export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim())
  if (!m) {
    return null
  }
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0)
  return Number.isFinite(date.getTime()) ? date : null
}

/** 일요일 시작 그리드. 이전·다음 달 날짜 칸은 `padding`만 두고 숫자는 넣지 않음 */
export type KoreanMonthGridSlot = { kind: "padding" } | { kind: "day"; date: Date }

export function buildKoreanMonthGridSlots(anchorMonthStart: Date): KoreanMonthGridSlot[] {
  const y = anchorMonthStart.getFullYear()
  const month = anchorMonthStart.getMonth()
  const first = new Date(y, month, 1, 12, 0, 0, 0)
  const lead = first.getDay()
  const daysInMonth = new Date(y, month + 1, 0).getDate()
  const slots: KoreanMonthGridSlot[] = []
  for (let i = 0; i < lead; i++) {
    slots.push({ kind: "padding" })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    slots.push({ kind: "day", date: new Date(y, month, d, 12, 0, 0, 0) })
  }
  const tail = (7 - (slots.length % 7)) % 7
  for (let i = 0; i < tail; i++) {
    slots.push({ kind: "padding" })
  }
  return slots
}

/** 일요일이 아닌 날에도 적용되는 국가 공휴일(대체공휴일·연휴 등) */
export function isKoreanPublicHoliday(date: Date): boolean {
  const key = formatLocalDateKey(date)
  if (VARIABLE_PUBLIC_HOLIDAYS_ISO.has(key)) {
    return true
  }
  const mmdd = key.slice(5)
  return FIXED_PUBLIC_HOLIDAY_MM_DD.has(mmdd)
}

/** 달력에서 숫자·헤더를 빨간색으로 쓸 날: 일요일 또는 공휴일 */
export function isKoreanCalendarRedDay(date: Date): boolean {
  return date.getDay() === 0 || isKoreanPublicHoliday(date)
}

/** 토요일이면서 공휴일·일요일 규칙의 빨간 날이 아닐 때만 파란 표시 */
export function isKoreanCalendarBlueSaturday(date: Date): boolean {
  return date.getDay() === 6 && !isKoreanCalendarRedDay(date)
}

export const koreanWeekdayHeaders = [
  { label: "일", tone: "red" as const },
  { label: "월", tone: "neutral" as const },
  { label: "화", tone: "neutral" as const },
  { label: "수", tone: "neutral" as const },
  { label: "목", tone: "neutral" as const },
  { label: "금", tone: "neutral" as const },
  { label: "토", tone: "blue" as const },
]

export function koreanHeaderTextClass(tone: "red" | "blue" | "neutral"): string {
  if (tone === "red") {
    return "text-red-600 dark:text-red-400"
  }
  if (tone === "blue") {
    return "text-blue-600 dark:text-blue-400"
  }
  return "text-muted-foreground"
}

/** 월간 셀 안 날짜 숫자(오늘 링·배경 포함) */
export function koreanCalendarDayNumberCn(date: Date, opts: { isToday: boolean }): string {
  const redDay = isKoreanCalendarRedDay(date)
  const blueSat = isKoreanCalendarBlueSaturday(date)
  return cn(
    "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
    opts.isToday && "bg-primary/12 ring-1 ring-primary/30",
    redDay && "text-red-600 dark:text-red-400",
    !redDay && blueSat && "text-blue-600 dark:text-blue-400",
    !redDay && !blueSat && opts.isToday && "text-primary",
    !redDay && !blueSat && !opts.isToday && "text-foreground"
  )
}

/** 선택한 날짜 제목·리스트의 날짜 문자열 강조 */
export function koreanCalendarDateTitleCn(date: Date | null): string {
  if (!date) {
    return "text-foreground"
  }
  const red = isKoreanCalendarRedDay(date)
  const blue = isKoreanCalendarBlueSaturday(date)
  if (red) {
    return "text-red-600 dark:text-red-400"
  }
  if (blue) {
    return "text-blue-600 dark:text-blue-400"
  }
  return "text-foreground"
}

/** 일정 리스트 한 줄 안의 날짜 부분(본문 톤과 구분) */
export function koreanCalendarListDateCn(date: Date | null): string {
  if (!date) {
    return "text-muted-foreground"
  }
  const red = isKoreanCalendarRedDay(date)
  const blue = isKoreanCalendarBlueSaturday(date)
  if (red) {
    return "text-red-600 dark:text-red-400"
  }
  if (blue) {
    return "text-blue-600 dark:text-blue-400"
  }
  return "text-muted-foreground"
}
