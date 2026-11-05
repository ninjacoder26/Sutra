"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseConfigured = Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY)
  && !SUPABASE_URL.includes("example") && !SUPABASE_ANON_KEY.includes("example");

let sb: any = null;
let initError: string | null = null;

if (supabaseConfigured && typeof window !== "undefined") {
  try {
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
  }
} else if (!supabaseConfigured) {
  initError = "Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.";
}

export { sb, supabaseConfigured, initError, createClient };
