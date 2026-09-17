import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pdzigcfswhwylphiawvo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkemlnY2Zzd2h3eWxwaGlhd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjkzMTMsImV4cCI6MjEwNTE0NTMxM30.C8bRz41DCko5bOye_xgcKxx4cKNLjguQthwm8Bz-ziE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
