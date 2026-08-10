import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dywkqllxqpoyjejmrrie.supabase.co";
const supabaseKey = "sb_publishable_u7apqCXw_kZryedU3Bq89Q_xMRP4khR";

export const supabase = createClient(supabaseUrl, supabaseKey);