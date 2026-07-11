import { supabase } from "../lib/supabaseClient";

export const getDeans = async () => {
  try {
    const { data, error } = await supabase
      .from("deans")
      .select(
        "id, dean_code, first_name, middle_name, last_name, email, gender, contact_number, address, is_active, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

export const checkDeanExists = async (email, excludeId = null) => {
  try {
    let query = supabase.from("deans").select("id", { count: "exact" });

    if (email) {
      query = query.eq("email", email);
    }

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { count, error } = await query;

    if (error) {
      return { exists: false, error: error.message };
    }

    return { exists: (count || 0) > 0, error: null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
};

export const updateDean = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from("deans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

export const deleteDean = async (id) => {
  try {
    const { error } = await supabase.from("deans").delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
};

export const disableDeanAccount = async (id) => {
  try {
    const { data, error } = await supabase
      .from("deans")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};

export const enableDeanAccount = async (id) => {
  try {
    const { data, error } = await supabase
      .from("deans")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
};
