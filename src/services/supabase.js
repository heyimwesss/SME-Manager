import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://xhleuxdeqpnvwcespcmh.supabase.co"
const supabaseKey = "sb_publishable_l1bXGn4aQUWqXaWUP82qAw_9cEG3KM5"

export const supabase = createClient(supabaseUrl, supabaseKey)
