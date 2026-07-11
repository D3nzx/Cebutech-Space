import { supabase } from '../lib/supabaseClient';


export const getSubjectsByProgram = async (courseId) => {
  try {
    const { data, error } = await supabase
      .from('course_subject_offerings')
      .select('*')
      .eq('course_id', courseId);

    if (error) throw error;

    console.log(`Fetching subjects for course ${courseId}:`, data); 

    
    if (data && data.length > 0) {
      const subjectIds = [...new Set(data.map(o => o.subject_id).filter(Boolean))];
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      const subjectsMap = {};
      if (subjectsData) {
        subjectsData.forEach(s => subjectsMap[s.id] = s);
      }

      
      const enrichedSubjects = subjectsData.map(subject => {
        
        const offerings = data.filter(o => o.subject_id === subject.id);
        
        const firstOffering = offerings[0] || {};
        
        return {
          ...subject,
          
          is_required: firstOffering.is_required,
          is_major: firstOffering.is_major,
          is_minor: firstOffering.is_minor,
          year_level: firstOffering.year_level,
          semester: firstOffering.semester,
          subject_category: firstOffering.subject_category,
          
          offerings: offerings.map(o => o.offering_type)
        };
      });

      console.log('Enriched subjects:', enrichedSubjects); 
      return { data: enrichedSubjects, error: null };
    }

    console.log('No offerings found for course:', courseId); 
    return { data: [], error: null };
  } catch (error) {
    console.error('Error fetching subjects by program:', error);
    return { data: null, error: error.message };
  }
};


export const getFacultyQualificationsBySubject = async (subjectId) => {
  try {
    const { data, error } = await supabase
      .from('faculty_qualifications')
      .select('*')
      .eq('subject_id', subjectId)
      .order('expertise_level', { ascending: false })
      .order('is_primary', { ascending: false });

    
    if (error) {
      console.warn('Faculty qualifications not available - using fallback mode', error);
      return { data: [], error: null };
    }

    
    if (data && data.length > 0) {
      const facultyIds = [...new Set(data.map(q => q.faculty_id).filter(Boolean))];
      
      const { data: facultyData, error: facultyError } = await supabase
        .from('faculty')
        .select('*')
        .in('id', facultyIds);

      if (facultyError) throw facultyError;

      const facultyMap = {};
      if (facultyData) {
        facultyData.forEach(f => facultyMap[f.id] = f);
      }

      
      const enrichedQualifications = data.map(qual => ({
        ...qual,
        faculty: facultyMap[qual.faculty_id] || null
      }));

      return { data: enrichedQualifications, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.warn('Error fetching faculty qualifications - using fallback mode:', error);
    return { data: [], error: null };
  }
};


export const getFacultyQualifications = async (facultyId) => {
  try {
    const { data, error } = await supabase
      .from('faculty_qualifications')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('is_primary', { ascending: false })
      .order('expertise_level', { ascending: false });

    if (error) throw error;

    
    if (data && data.length > 0) {
      const subjectIds = [...new Set(data.map(q => q.subject_id).filter(Boolean))];
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      const subjectsMap = {};
      if (subjectsData) {
        subjectsData.forEach(s => subjectsMap[s.id] = s);
      }

      
      const enrichedQualifications = data.map(qual => ({
        ...qual,
        subject: subjectsMap[qual.subject_id] || null
      }));

      return { data: enrichedQualifications, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.error('Error fetching faculty qualifications:', error);
    return { data: null, error: error.message };
  }
};


export const addFacultyQualification = async (facultyId, subjectId, qualificationData) => {
  try {
    const { data, error } = await supabase
      .from('faculty_qualifications')
      .upsert({
        faculty_id: facultyId,
        subject_id: subjectId,
        ...qualificationData
      }, {
        onConflict: 'faculty_id,subject_id'
      })
      .select('*')
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error adding faculty qualification:', error);
    return { data: null, error: error.message };
  }
};


export const validateFacultyForSubject = async (facultyId, subjectId, offeringType) => {
  try {
    const { data, error } = await supabase
      .from('faculty_qualifications')
      .select('*')
      .eq('faculty_id', facultyId)
      .eq('subject_id', subjectId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; 

    if (!data) {
      return {
        qualified: false,
        reason: 'Faculty has no qualification for this subject',
        data: null
      };
    }

    if (offeringType === 'LEC' && !data.can_teach_lecture) {
      return {
        qualified: false,
        reason: 'Faculty is not qualified to teach lectures in this subject',
        data
      };
    }

    if (offeringType === 'LAB' && !data.can_teach_lab) {
      return {
        qualified: false,
        reason: 'Faculty is not qualified to teach labs in this subject',
        data
      };
    }

    return {
      qualified: true,
      reason: 'Faculty is qualified',
      data
    };
  } catch (error) {
    console.error('Error validating faculty for subject:', error);
    return {
      qualified: false,
      reason: error.message,
      data: null
    };
  }
};
