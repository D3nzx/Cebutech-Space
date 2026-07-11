import { supabase } from "../lib/supabaseClient";

export async function getSubjects() {
  return await supabase
    .from("subjects")
    .select("*")
    .order("subject_code", { ascending: true })
    .order("subject_name", { ascending: true });
}

export async function createSubject(subject) {
  return await supabase
    .from("subjects")
    .insert([subject])
    .select()
    .single();
}

export async function updateSubject(id, subject) {
  return await supabase
    .from("subjects")
    .update(subject)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteSubject(id) {
  return await supabase
    .from("subjects")
    .delete()
    .eq("id", id);
}

export async function checkSubjectExists(subject_name, excludeId = null) {
  let query = supabase
    .from("subjects")
    .select("id")
    .eq("subject_name", subject_name);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query;
  return { exists: data && data.length > 0, error };
}
