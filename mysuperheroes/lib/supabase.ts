// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwmvoyltlzglhktneiya.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bXZveWx0bHpnbGhrdG5laXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTQ0NDMsImV4cCI6MjEwMDg5MDQ0M30.4shI9Ok5Kkns3vtswTkSV-0M5idBwEDHvzhvrrsYmpo';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bXZveWx0bHpnbGhrdG5laXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMxNDQ0MywiZXhwIjoyMTAwODkwNDQzfQ.CcG-IddEeAsORMuUSRlR8YkHlrq2gwGWH5__Q5GJXfk';

// Public client for frontend pages
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Administrative client for bypass controls (Admin page & AI trading rules)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});