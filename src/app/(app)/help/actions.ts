"use server"

import { redirect } from "next/navigation"

import { getAppSession } from "@/lib/auth"
import { createAnonSupabaseClient } from "@/lib/supabase/anon"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const CATEGORIES = ["general", "bug", "billing", "feature", "refund", "cancel"] as const

export async function submitSupportTicketAction(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim()
  const subject = String(formData.get("subject") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()
  const contactEmail = String(formData.get("contact_email") ?? "").trim()

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    redirect("/help/contact?e=category")
  }
  if (subject.length < 2 || subject.length > 200) {
    redirect("/help/contact?e=subject")
  }
  if (body.length < 8 || body.length > 8000) {
    redirect("/help/contact?e=body")
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirect("/help/contact?e=email")
  }

  const session = await getAppSession()
  const supabase =
    session?.mode === "supabase" ? await createServerSupabaseClient() : createAnonSupabaseClient()

  if (!supabase) {
    redirect("/help/contact?e=server")
  }

  const userId = session?.mode === "supabase" ? session.user.id : null

  const { error } = await supabase.from("support_tickets").insert({
    user_id: userId,
    category,
    subject,
    body,
    contact_email: contactEmail,
    status: "new",
  })

  if (error) {
    console.warn("[submitSupportTicketAction]", error.message)
    redirect("/help/contact?e=db")
  }

  redirect("/help/contact?ok=1")
}
