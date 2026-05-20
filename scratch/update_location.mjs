import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wlajbpbcmmwuvmqokbsd.supabase.co";
const SUPABASE_KEY = "sb_publishable_e2uDg1OHR2ded8rrvKRHmA_E8hfCAid";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Update all class_slots location
const { data, error, count } = await supabase
  .from("class_slots")
  .update({ location: "Arpoador, Rio de Janeiro" })
  .neq("id", "00000000-0000-0000-0000-000000000000")
  .select("id");

if (error) {
  console.error("Erro ao atualizar class_slots:", error.message);
} else {
  console.log(`✅ ${data?.length ?? 0} aulas atualizadas com localização "Arpoador, Rio de Janeiro"`);
}

// Also update all weekly_schedule_templates location
const { data: tData, error: tErr } = await supabase
  .from("weekly_schedule_templates")
  .update({ location: "Arpoador, Rio de Janeiro" })
  .neq("id", "00000000-0000-0000-0000-000000000000")
  .select("id");

if (tErr) {
  console.error("Erro ao atualizar templates:", tErr.message);
} else {
  console.log(`✅ ${tData?.length ?? 0} templates atualizados com localização "Arpoador, Rio de Janeiro"`);
}

process.exit(0);
