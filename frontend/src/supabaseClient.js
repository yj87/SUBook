import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zrznabvueccpkhhgepfc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyem5hYnZ1ZWNjcGtoaGdlcGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzI0MTAsImV4cCI6MjEwOTAwODQxMH0.-dQE0-igIG2XtO0umTJ-y4oT4P38aT8KV1OR0OeRScE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TEMPORARY DEBUG — remove after fixing the 403
if (typeof window !== 'undefined') window.supabase = supabase;