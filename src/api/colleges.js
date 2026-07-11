import { supabase } from '../lib/supabaseClient';

export async function getColleges() {
  try {
    const { data, error } = await supabase
      .from('colleges')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return { data: null, error };
  }
}

export async function createCollege(collegeData) {
  try {
    const { data: colleges, error: fetchError } = await supabase
      .from('colleges')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    let nextOrder = 1;
    if (colleges && colleges.length > 0) {
      nextOrder = (colleges[0].display_order ?? 0) + 1;
    }

    const { data, error } = await supabase
      .from('colleges')
      .insert([
        {
          college_name: collegeData.name,
          college_code: collegeData.code,
          description: collegeData.description || null,
          display_order: nextOrder,
        },
      ])
      .select();

    if (error) throw error;
    return { data: data?.[0] ?? null, error: null };
  } catch (error) {
    console.error('Error creating college:', error);
    return { data: null, error };
  }
}

export async function updateCollege(id, collegeData) {
  try {
    const { data, error } = await supabase
      .from('colleges')
      .update({
        college_name: collegeData.name,
        college_code: collegeData.code,
        description: collegeData.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data: data?.[0] ?? null, error: null };
  } catch (error) {
    console.error('Error updating college:', error);
    return { data: null, error };
  }
}

export async function deleteCollege(id) {
  try {
    const { error } = await supabase
      .from('colleges')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting college:', error);
    return { error };
  }
}

export async function checkCollegeExists({ name, code, excludeId = null }) {
  try {
    const nameTrimmed = (name ?? '').trim();
    const codeTrimmed = (code ?? '').trim();

    if (!nameTrimmed && !codeTrimmed) {
      return { exists: false, data: [], error: null };
    }

    const conditions = [];
    if (nameTrimmed) conditions.push(`college_name.ilike.${nameTrimmed}`);
    if (codeTrimmed) conditions.push(`college_code.ilike.${codeTrimmed}`);

    let query = supabase
      .from('colleges')
      .select('id, college_name, college_code')
      .or(conditions.join(','));

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { exists: (data?.length ?? 0) > 0, data: data || [], error: null };
  } catch (error) {
    console.error('Error checking college existence:', error);
    return { exists: false, data: null, error };
  }
}
