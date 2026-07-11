import { supabase } from "../lib/supabaseClient";


export const getStudents = async () => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching students:", error);
      return { data: null, error: error.message };
    }

    console.log("✅ Students fetched successfully:", {
      count: data?.length || 0,
      sample: data?.[0] || null,
      allFields: data?.[0] ? Object.keys(data[0]) : []
    });

    return { data, error: null };
  } catch (err) {
    console.error("❌ Exception fetching students:", err);
    return { data: null, error: err.message };
  }
};


export const getStudentById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching student:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Exception fetching student:", err);
    return { data: null, error: err.message };
  }
};


export const createStudent = async (studentData) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .insert([studentData])
      .select()
      .single();

    if (error) {
      console.error("Error creating student:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Exception creating student:", err);
    return { data: null, error: err.message };
  }
};


export const updateStudent = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating student:", error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Exception updating student:", err);
    return { data: null, error: err.message };
  }
};


export const deleteStudent = async (id) => {
  try {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting student:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error("Exception deleting student:", err);
    return { error: err.message };
  }
};


export const checkStudentExists = async (email, studentId, excludeId = null) => {
  try {
    let query = supabase
      .from("students")
      .select("id", { count: "exact" });

    if (email) {
      query = query.eq("email", email);
    }

    if (studentId) {
      query = query.or(`student_id.eq.${studentId}`);
    }

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error checking student existence:", error);
      return { exists: false, error: error.message };
    }

    return { exists: count > 0, error: null };
  } catch (err) {
    console.error("Exception checking student existence:", err);
    return { exists: false, error: err.message };
  }
};


export const disableStudentAccount = async (id) => {
  try {
    console.log("🔒 Attempting to disable student account:", id);
    const { data, error } = await supabase
      .from("students")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error disabling student account:", error);
      return { data: null, error: error.message };
    }

    console.log("✅ Student account disabled successfully:", data);
    return { data, error: null };
  } catch (err) {
    console.error("❌ Exception disabling student account:", err);
    return { data: null, error: err.message };
  }
};


export const enableStudentAccount = async (id) => {
  try {
    console.log("🔓 Attempting to enable student account:", id);
    const { data, error } = await supabase
      .from("students")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error enabling student account:", error);
      return { data: null, error: error.message };
    }

    console.log("✅ Student account enabled successfully:", data);
    return { data, error: null };
  } catch (err) {
    console.error("❌ Exception enabling student account:", err);
    return { data: null, error: err.message };
  }
};
