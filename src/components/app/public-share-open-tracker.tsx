"use client"

import { useEffect, useRef } from "react"

import {
  recordPublicInvoiceShareOpen,
  recordPublicQuoteShareOpen,
} from "@/lib/public-share-open"

export function PublicQuoteShareOpenTracker({ token }: { token: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) {
      return
    }
    fired.current = true
    void recordPublicQuoteShareOpen(token)
  }, [token])
  return null
}

export function PublicInvoiceShareOpenTracker({ token }: { token: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) {
      return
    }
    fired.current = true
    void recordPublicInvoiceShareOpen(token)
  }, [token])
  return null
}
