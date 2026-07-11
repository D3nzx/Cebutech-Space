import { supabase } from "../lib/supabaseClient";

export const getProgramHeadFaculty = async (programHeadId) => {
  try {
    const { data, error } = await supabase
      .from("faculty")
      .select("*")
      .eq("program_head_id", programHeadId);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching faculty:", error);
    return { data: null, error };
  }
};
