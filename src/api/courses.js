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


export async function getCourses() {
  try {
    
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        college:college_id(id, college_name)
      `)
      .order('display_order', { ascending: true });

    if (coursesError) throw coursesError;

    
    const mappedData = coursesData?.map(course => ({
      ...course,
      college_name: course.college?.college_name || null
    })) || [];

    console.log('📚 Courses with college mapping:', mappedData.map(c => ({ course_name: c.course_name, college_id: c.college_id, college_name: c.college_name })));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { data: null, error };
  }
}


export async function createCourse(courseData) {
  try {
    
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    let nextOrder = 1;
    if (courses && courses.length > 0) {
      nextOrder = courses[0].display_order + 1;
    }

    const { data, error } = await supabase
      .from('courses')
      .insert([
        {
          course_name: courseData.name,
          course_code: courseData.code,
          description: courseData.description,
          college_id: courseData.collegeId,
          display_order: nextOrder
        }
      ])
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error creating course:', error);
    return { data: null, error };
  }
}


export async function updateCourse(id, courseData) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .update({
        course_name: courseData.name,
        course_code: courseData.code,
        description: courseData.description,
        college_id: courseData.collegeId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating course:', error);
    return { data: null, error };
  }
}


export async function deleteCourse(id) {
  try {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting course:', error);
    return { error };
  }
}


export async function reorderCourses() {
  try {
    const { error } = await supabase
      .rpc('manual_reorder_courses');

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error reordering courses:', error);
    return { error };
  }
}


export async function checkCourseExists(courseName, excludeId = null) {
  try {
    let query = supabase
      .from('courses')
      .select('id, course_name')
      .ilike('course_name', courseName.trim());
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { exists: data && data.length > 0, data: data || [], error: null };
  } catch (error) {
    console.error('Error checking course existence:', error);
    return { exists: false, data: null, error };
  }
}


export async function searchCourses(query) {
  try {
    
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .or(`course_name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('display_order', { ascending: true });

    if (coursesError) throw coursesError;

    
    const { data: collegesData, error: collegesError } = await supabase
      .from('colleges')
      .select('id, college_name');

    if (collegesError) throw collegesError;

    
    const collegeMap = new Map();
    collegesData?.forEach(college => {
      collegeMap.set(college.id, college.college_name);
    });

    
    const mappedData = coursesData?.map(course => ({
      ...course,
      college_name: course.college_id ? (collegeMap.get(course.college_id) || course.college_name || null) : null
    })) || [];

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error searching courses:', error);
    return { data: null, error };
  }
}
