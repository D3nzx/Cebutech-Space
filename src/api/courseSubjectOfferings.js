import { supabase } from '../lib/supabaseClient';


export async function getCourseSubjectOfferings() {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .select(`
        *,
        course:courses(id, course_name, description),
        subject:subjects(id, subject_name, subject_code, description)
      `)
      .neq('offering_type', 'LEC-LAB')
      .order('course_id', { ascending: true })
      .order('subject_id', { ascending: true })
      .order('offering_type', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching course subject offerings:', error);
    return { data: null, error };
  }
}


export async function reactivateCourseSubjectOffering(id) {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error reactivating course subject offering:', error);
    return { data: null, error };
  }
}


export async function getOfferingsBySubject(subjectId) {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .select(`
        *,
        course:courses(id, course_name, description),
        subject:subjects(id, subject_name, subject_code, description)
      `)
      .eq('subject_id', subjectId)
      .neq('offering_type', 'LEC-LAB')
      .order('course_id', { ascending: true })
      .order('offering_type', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching offerings by subject:', error);
    return { data: null, error };
  }
}


export async function getOfferingsByCourse(courseId) {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .select(`
        *,
        course:courses(id, course_name, description),
        subject:subjects(id, subject_name, subject_code, description)
      `)
      .eq('course_id', courseId)
      .neq('offering_type', 'LEC-LAB')
      .order('subject_id', { ascending: true })
      .order('offering_type', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching offerings by course:', error);
    return { data: null, error };
  }
}


export async function createCourseSubjectOffering(offeringData) {
  try {
    if (offeringData?.offering_type === 'LEC-LAB') {
      throw new Error("Unsupported offering type 'LEC-LAB'. Only 'LEC' and 'LAB' are allowed.");
    }
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .insert([
        {
          course_id: offeringData.course_id,
          subject_id: offeringData.subject_id,
          offering_type: offeringData.offering_type,
          lecture_units: offeringData.lecture_units || 0,
          lab_units: offeringData.lab_units || 0,
          contact_hours: offeringData.contact_hours || 0,
          is_active: true
        }
      ])
      .select();

    if (error) throw error;
    console.log('✅ Course subject offering created successfully:', data[0]);
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error creating course subject offering:', error);
    return { data: null, error };
  }
}


export async function updateCourseSubjectOffering(id, offeringData) {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .update({
        lecture_units: offeringData.lecture_units,
        lab_units: offeringData.lab_units,
        contact_hours: offeringData.contact_hours,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error updating course subject offering:', error);
    return { data: null, error };
  }
}


export async function deactivateCourseSubjectOffering(id) {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error deactivating course subject offering:', error);
    return { data: null, error };
  }
}
