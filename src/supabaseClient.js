import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ שגיאה: משתני הסביבה של Supabase לא מוגדרים!')
  console.error('ודא שקובץ .env קיים ומכיל:')
  console.error('VITE_SUPABASE_URL=...')
  console.error('VITE_SUPABASE_ANON_KEY=...')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
})