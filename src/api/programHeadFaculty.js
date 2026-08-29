import { supabase } from "../lib/supabaseClient";

export const getProgramHeadFaculty = async (programHeadId) => {
  try {
    const { data: programHead, error: phError } = await supabase
      .from("program_heads")
      .select("college, program")
      .eq("id", programHeadId)
      .single();

    if (phError || !programHead) {
      return { data: null, error: phError };
    }

    const query = supabase
      .from("faculty")
      .select("*")
      .eq("college", programHead.college)
      .eq("program", programHead.program);

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching faculty:", error);
    return { data: null, error };
  }
};
