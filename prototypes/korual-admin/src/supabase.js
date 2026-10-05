import {createClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL||'https://dtmmjkikyfgkeimhevso.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_JmGch41vs2HlbAzCUgT5Mg_1-YrvqGs';

export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
