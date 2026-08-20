import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lemufalsvghlugiapapr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_6xbru2AuvbfdUn-m1tIpqQ_-5riVqOe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
