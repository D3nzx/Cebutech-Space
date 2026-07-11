import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, MapPin, User, BookOpen, GraduationCap, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import SimpleSelector from '../../../SimpleSelector';
import LocationSelector from '../../../LocationSelector';
import { getSubjectsByProgram } from '../../../../api/facultyQualifications';
import { useModalPersistence } from '../../../../hooks/useModalPersistence';

function ScheduleFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingSchedule,
  initialFormData = null,
  initialStep = null,
  subjects,
  faculty,
  locations,
  courses,
  courseSubjectOfferings = [],
  approvalStatus = null
}) {
  const [currentStep, setCurrentStep] = useState(initialStep || 1);
  const [formData, setFormData] = useState({
    subject_id: '',
    offering_type: '', // 'LEC' or 'LAB'
    faculty_id: '',
    location_id: '',
    course_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    section: '',
    year_level: '',
    semester: '',
    school_year: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [programSubjects, setProgramSubjects] = useState([]);
  const [qualifiedFaculty, setQualifiedFaculty] = useState([]);
  const [selectedSubjectMetadata, setSelectedSubjectMetadata] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationTitle, setValidationTitle] = useState('Missing Required Fields');
  const [validationIntro, setValidationIntro] = useState('');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  // Handle scrollbar auto-hide after 5 seconds of inactivity
  const handleScrollbarVisibility = useCallback(() => {
    setShowScrollbar(true);
    
    // Clear existing timeout
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    
    // Set new timeout to hide scrollbar after 5 seconds
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 5000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current);
      }
    };
  }, []);

  // Use modal persistence hook to save/restore form state across page refreshes
  const { clearModalState } = useModalPersistence(
    'scheduleFormModal',
    formData,
    currentStep,
    isOpen,
    setFormData,
    setCurrentStep,
    () => {} // setIsOpen not needed here since parent controls isOpen
  );

  const totalSteps = 4;
  const steps = [
    { number: 1, title: 'Academic Period', icon: GraduationCap },
    { number: 2, title: 'Course & Class', icon: BookOpen },
    { number: 3, title: 'Subject & Faculty', icon: User },
    { number: 4, title: 'Schedule & Location', icon: Clock }
  ];

  const daysOfWeek = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
  ];

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const semesters = ['1st Semester', '2nd Semester'];

  const openValidationModal = useCallback((errorsList, options = {}) => {
    const { title = 'Missing Required Fields', intro } = options;
    setValidationErrors(errorsList);
    setValidationTitle(title);
    setValidationIntro(
      intro ||
        (currentStep === 4
          ? 'Please fill in the following required fields before adding a new schedule:'
          : 'Please fill in the following required fields before proceeding:')
    );
    setShowValidationModal(true);
  }, [currentStep]);

  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setFormData({
      subject_id: '',
      offering_type: '',
      faculty_id: '',
      location_id: '',
      course_id: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      section: '',
      year_level: '',
      semester: '',
      school_year: ''
    });
    setErrors({});
    setProgramSubjects([]);
    setQualifiedFaculty([]);
    setSelectedSubjectMetadata(null);
    // Clear persisted state when user manually closes the modal
    clearModalState();
    // Also clear the prefill data from parent so form resets on reopen
    sessionStorage.removeItem('modal_scheduleFormModal');
    onClose();
  }, [onClose, clearModalState]);

  // Load program subjects when course changes
  useEffect(() => {
    if (!formData.course_id) {
      setProgramSubjects([]);
      return;
    }

    const loadProgramSubjects = async () => {
      const { data, error } = await getSubjectsByProgram(formData.course_id);
      if (!error && data) {
        setProgramSubjects(data);
      }
    };

    loadProgramSubjects();
  }, [formData.course_id]);

  // Load faculty when subject changes (no qualification checks)
  useEffect(() => {
    if (!formData.subject_id) {
      setQualifiedFaculty([]);
      setSelectedSubjectMetadata(null);
      return;
    }

    // Find metadata for selected subject
    const metadata = programSubjects.find(s => s.id === formData.subject_id);
    setSelectedSubjectMetadata(metadata);

    // Use only faculty that were already filtered by program (passed from parent)
    // Faculty filtering by program is done in the parent Scheduling component
    console.log('📚 Faculty available for this program:', faculty?.length || 0);
    setQualifiedFaculty(faculty || []);
  }, [formData.subject_id, faculty, programSubjects]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingSchedule) {
      console.log('📝 Editing schedule:', editingSchedule);
      console.log('📝 course_subject_offering:', editingSchedule.course_subject_offering);
      console.log('📝 offering_type:', editingSchedule.course_subject_offering?.offering_type);
      setFormData({
        subject_id: editingSchedule.subject_id || '',
        offering_type: editingSchedule.course_subject_offering?.offering_type || '',
        faculty_id: editingSchedule.faculty_id || '',
        location_id: editingSchedule.location_id || '',
        course_id: editingSchedule.course_id || '',
        day_of_week: editingSchedule.day_of_week || '',
        start_time: editingSchedule.start_time || '',
        end_time: editingSchedule.end_time || '',
        section: editingSchedule.section || '',
        year_level: editingSchedule.year_level || '',
        semester: editingSchedule.semester ? `${editingSchedule.semester}${editingSchedule.semester === 1 ? 'st' : 'nd'} Semester` : '',
        school_year: editingSchedule.school_year || ''
      });

      // When editing, set selectedSubjectMetadata so Component Type buttons display
      if (editingSchedule.subject_id && programSubjects.length > 0) {
        const metadata = programSubjects.find(s => s.id === editingSchedule.subject_id);
        setSelectedSubjectMetadata(metadata || null);
      }

      setCurrentStep(initialStep || 1);
      return;
    }

    if (initialFormData) {
      console.log('📋 Prefilling form with:', initialFormData);
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      
      // Convert semester number to string format (1 -> "1st Semester", 2 -> "2nd Semester")
      let semesterValue = initialFormData.semester || '';
      if (typeof semesterValue === 'number') {
        semesterValue = semesterValue === 1 ? '1st Semester' : semesterValue === 2 ? '2nd Semester' : '';
      }
      
      setFormData({
        subject_id: initialFormData.subject_id || '',
        offering_type: initialFormData.offering_type || 'LEC',
        faculty_id: initialFormData.faculty_id || '',
        location_id: initialFormData.location_id || '',
        course_id: initialFormData.course_id || '',
        day_of_week: initialFormData.day_of_week || '',
        start_time: initialFormData.start_time || '07:00',
        end_time: initialFormData.end_time || '15:00',
        section: initialFormData.section || '',
        year_level: initialFormData.year_level || '',
        semester: semesterValue,
        school_year: initialFormData.school_year || `${currentYear}-${nextYear}`
      });
      setCurrentStep(initialStep || 1);
      return;
    }

    // Fresh form defaults - do NOT restore from sessionStorage on page refresh
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    console.log('✨ Creating fresh form');
    setFormData({
      subject_id: '',
      offering_type: 'LEC',
      faculty_id: '',
      location_id: '',
      course_id: '',
      day_of_week: '',
      start_time: '07:00',
      end_time: '15:00',
      section: '',
      year_level: '',
      semester: '',
      school_year: `${currentYear}-${nextYear}`
    });
    setCurrentStep(initialStep || 1);
  }, [editingSchedule, initialFormData, isOpen, initialStep]);

  const getFieldLabel = (fieldName) => {
    const labels = {
      school_year: 'School Year',
      semester: 'Semester',
      year_level: 'Year Level',
      section: 'Section',
      subject_id: 'Subject',
      offering_type: 'Component Type',
      faculty_id: 'Faculty',
      day_of_week: 'Day',
      start_time: 'Start Time',
      end_time: 'End Time',
      location_id: 'Room/Location'
    };
    return labels[fieldName] || fieldName;
  };

  const validateStep = (step, shouldSetErrors = true) => {
    const newErrors = {};
    const errorMessages = [];
    let isValid = true;

    if (step === 1) {
      if (!formData.school_year) {
        newErrors.school_year = 'School year is required';
        errorMessages.push('School Year is required');
        isValid = false;
      }
      if (!formData.semester) {
        newErrors.semester = 'Semester is required';
        errorMessages.push('Semester is required');
        isValid = false;
      }
    } else if (step === 2) {
      if (!formData.year_level) {
        newErrors.year_level = 'Year level is required';
        errorMessages.push('Year Level is required');
        isValid = false;
      }
      if (!formData.section) {
        newErrors.section = 'Section is required';
        errorMessages.push('Section is required');
        isValid = false;
      }
    } else if (step === 3) {
      if (!formData.subject_id) {
        newErrors.subject_id = 'Subject is required';
        errorMessages.push('Subject is required');
        isValid = false;
      }
      if (!formData.offering_type) {
        newErrors.offering_type = 'Component type is required';
        errorMessages.push('Component Type is required');
        isValid = false;
      }
      if (!formData.faculty_id) {
        newErrors.faculty_id = 'Faculty is required';
        errorMessages.push('Faculty is required');
        isValid = false;
      }
    } else if (step === 4) {
      if (!formData.day_of_week) {
        newErrors.day_of_week = 'Day is required';
        errorMessages.push('Day is required');
        isValid = false;
      }
      if (!formData.start_time) {
        newErrors.start_time = 'Start time is required';
        errorMessages.push('Start Time is required');
        isValid = false;
      }
      if (!formData.end_time) {
        newErrors.end_time = 'End time is required';
        errorMessages.push('End Time is required');
        isValid = false;
      }
      if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
        newErrors.end_time = 'End time must be after start time';
        errorMessages.push('End Time must be after Start Time');
        isValid = false;
      }
      if (!formData.location_id) {
        newErrors.location_id = 'Location is required';
        errorMessages.push('Room/Location is required');
        isValid = false;
      }
    }

    if (shouldSetErrors) {
      setErrors(newErrors);
    }
    
    if (!isValid && !shouldSetErrors) {
      openValidationModal(errorMessages);
    }
    
    return isValid;
  };

  const handleNext = (e) => {
    // Prevent form submission and double-clicks
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('🔵 handleNext called for step:', currentStep);
    if (isNavigating) {
      console.log('⚠️ Already navigating, ignoring click');
      return;
    }
    
    // Validate current step and show modal if validation fails
    const errorMessages = [];
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.school_year) {
        errorMessages.push('School Year is required');
        isValid = false;
      }
      if (!formData.semester) {
        errorMessages.push('Semester is required');
        isValid = false;
      }
    } else if (currentStep === 2) {
      if (!formData.year_level) {
        errorMessages.push('Year Level is required');
        isValid = false;
      }
      if (!formData.section) {
        errorMessages.push('Section is required');
        isValid = false;
      }
    } else if (currentStep === 3) {
      if (!formData.subject_id) {
        errorMessages.push('Subject is required');
        isValid = false;
      }
      if (!formData.offering_type) {
        errorMessages.push('Component Type is required');
        isValid = false;
      }
      if (!formData.faculty_id) {
        errorMessages.push('Faculty is required');
        isValid = false;
      }

      // Check if units are configured for the selected subject and component
      const offering = courseSubjectOfferings?.find(
        (o) =>
          o.course_id === formData.course_id &&
          o.subject_id === formData.subject_id &&
          o.offering_type === formData.offering_type
      );

      if (!offering) {
        errorMessages.push('Units are not configured for this subject/component. Please check the subject settings.');
        isValid = false;
      }
    }

    if (isValid) {
      // Validation passed - move to next step
      setIsNavigating(true);
      setErrors({});
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      // Re-enable navigation after a short delay
      setTimeout(() => setIsNavigating(false), 300);
    } else {
      // Validation failed - show modal with error messages
      openValidationModal(errorMessages);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔴 handleSubmit called! currentStep:', currentStep);
    
    // Validate all steps before submitting
    let allValid = true;
    const newErrors = {};
    const errorMessages = [];
    
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step, false)) {
        allValid = false;
        if (step < currentStep) {
          setCurrentStep(step);
        }
        // Collect errors from step 4 for modal display
        if (step === 4) {
          if (!formData.day_of_week) errorMessages.push('Day is required');
          if (!formData.start_time) errorMessages.push('Start Time is required');
          if (!formData.end_time) errorMessages.push('End Time is required');
          if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
            errorMessages.push('End Time must be after Start Time');
          }
          if (!formData.location_id) errorMessages.push('Room/Location is required');
        }
      }
    }

    if (!allValid) {
      // Show validation modal if we have error messages
      if (errorMessages.length > 0) {
        openValidationModal(errorMessages);
      }
      return;
    }

    console.log('✅ Form validation passed');
    setIsSubmitting(true);
    try {
      // Convert semester string to integer (e.g., "1st Semester" -> 1, "2nd Semester" -> 2)
      const semesterNum = formData.semester.includes('1') ? 1 : 2;
      
      // Find the course_subject_offering_id based on subject_id, course_id, and offering_type
      let course_subject_offering_id = null;
      if (formData.subject_id && formData.course_id && formData.offering_type) {
        const offering = courseSubjectOfferings?.find(o => 
          o.subject_id === formData.subject_id && 
          o.course_id === formData.course_id && 
          o.offering_type === formData.offering_type
        );
        course_subject_offering_id = offering?.id || null;
        console.log('🔍 Looking for course_subject_offering:', {
          subject_id: formData.subject_id,
          course_id: formData.course_id,
          offering_type: formData.offering_type,
          found_id: course_subject_offering_id
        });
      }
      
      const submitData = {
        ...formData,
        semester: semesterNum,
        course_subject_offering_id: course_subject_offering_id
      };
      
      console.log('📝 Submitting schedule with data:', submitData);
      console.log('✅ course_subject_offering_id set to:', course_subject_offering_id);
      console.log('✅ offering_type in payload:', submitData.offering_type);
      const submitResult = await onSubmit(submitData);
      if (submitResult?.error) {
        openValidationModal([submitResult.error], {
          title: 'Validation Error',
          intro: 'Please resolve the following issue before saving this schedule:'
        });
        return;
      }
      handleClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle school year input with auto-formatting
  const handleSchoolYearChange = (e) => {
    const input = e.target.value;
    
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    // Limit to 4 digits for the start year
    const startYear = digitsOnly.slice(0, 4);
    
    // Auto-format: if we have 4 digits, add "-" and calculate end year (+1)
    let formatted = '';
    if (startYear.length === 4) {
      const start = parseInt(startYear);
      if (start >= 2000 && start <= 2100) {
        const endYear = start + 1;
        formatted = `${startYear}-${endYear}`;
      } else {
        // Invalid year, just show what they typed
        formatted = startYear;
      }
    } else if (startYear.length > 0) {
      formatted = startYear;
    }
    
    setFormData(prev => ({ ...prev, school_year: formatted }));
    if (errors.school_year) {
      setErrors(prev => ({ ...prev, school_year: '' }));
    }
  };

  // Handle school year input keydown for better UX (allow backspace, delete, arrow keys)
  const handleSchoolYearKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, arrow keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  const selectedSubject = subjects?.find(s => s.id === formData.subject_id);
  const selectedFaculty = faculty?.find(f => f.id === formData.faculty_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        aria-hidden="true"
        style={{ 
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)'
        }}
      ></div>
      
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5 flex items-center justify-between border-b border-blue-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="bg-white/10 text-white border border-white/20 rounded-xl p-2.5 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/20 hover:scale-105"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-8 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <Check size={18} />
                      ) : (
                        <StepIcon size={18} />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <div className={`text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-500'}`}>
                        Step {step.number}
                      </div>
                      <div className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-slate-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div 
          className="overflow-y-auto flex-1"
          onScroll={handleScrollbarVisibility}
          style={{
            scrollbarWidth: showScrollbar ? 'auto' : 'none',
            msOverflowStyle: showScrollbar ? 'auto' : 'none',
          }}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
            }
            div::-webkit-scrollbar-thumb {
              background: ${showScrollbar ? '#cbd5e1' : 'transparent'};
              border-radius: 4px;
              transition: background 0.3s ease;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <form id="schedule-form" onSubmit={handleSubmit} className="p-8">
            {/* Step 1: Academic Period */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <GraduationCap size={48} className="text-blue-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Academic Period</h3>
                  <p className="text-slate-600">Set the school year and semester for this schedule</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      School Year
                    </label>
                    <input
                      type="text"
                      name="school_year"
                      value={formData.school_year}
                      onChange={handleSchoolYearChange}
                      onKeyDown={handleSchoolYearKeyDown}
                      placeholder="Type year"
                      maxLength={9}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Semester
                    </label>
                    <SimpleSelector
                      options={semesters.map(sem => ({ value: sem, label: sem }))}
                      value={formData.semester}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, semester: value }));
                        if (errors.semester) setErrors(prev => ({ ...prev, semester: '' }));
                      }}
                      placeholder="Select Semester"
                      searchable={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Course & Class */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <BookOpen size={48} className="text-blue-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Course & Class Details</h3>
                  <p className="text-slate-600">Select the program, year level, and section</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Assigned Program
                    </label>
                    <input
                      type="text"
                      value={courses?.find(c => c.id === formData.course_id)?.course_name || ''}
                      readOnly
                      className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-blue-500 transition-all border-slate-300 bg-slate-50 text-slate-600 cursor-default"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Year Level
                      </label>
                      <SimpleSelector
                        options={yearLevels.map(year => ({ value: year, label: year }))}
                        value={formData.year_level}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, year_level: value }));
                          if (errors.year_level) setErrors(prev => ({ ...prev, year_level: '' }));
                        }}
                        placeholder="Select Year Level"
                        searchable={false}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Section
                      </label>
                      <SimpleSelector
                        options={[
                          { value: 'A', label: 'A' },
                          { value: 'B', label: 'B' },
                          { value: 'C', label: 'C' },
                          { value: 'D', label: 'D' },
                          { value: '1', label: '1' },
                          { value: '2', label: '2' },
                          { value: '3', label: '3' },
                          { value: '4', label: '4' }
                        ]}
                        value={formData.section}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, section: value }));
                          if (errors.section) setErrors(prev => ({ ...prev, section: '' }));
                        }}
                        placeholder="Select Section"
                        searchable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Subject & Faculty */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <User size={48} className="text-blue-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Subject & Faculty</h3>
                  <p className="text-slate-600">Choose the subject and assign a faculty member</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Subject
                    </label>
                    <SimpleSelector
                      options={programSubjects.map(subject => {
                        const label = `${subject?.subject_code || ''} - ${subject?.subject_name || ''}`;
                        return { value: subject?.id, label };
                      }) || []}
                      value={formData.subject_id}
                      onChange={(value) => {
                        const isClearing = !value;
                        setFormData(prev => ({
                          ...prev,
                          subject_id: value,
                          offering_type: isClearing ? '' : prev.offering_type,
                          faculty_id: isClearing ? '' : prev.faculty_id
                        }));
                        if (isClearing) {
                          setQualifiedFaculty([]);
                          setSelectedSubjectMetadata(null);
                        }
                        if (errors.subject_id) setErrors(prev => ({ ...prev, subject_id: '' }));
                      }}
                      placeholder={!formData.course_id ? "Select a program first" : "Select Subject"}
                      disabled={!formData.course_id}
                      searchable={true}
                    />
                  </div>

                  {selectedSubjectMetadata && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Component Type
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, offering_type: 'LEC' }));
                            if (errors.offering_type) setErrors(prev => ({ ...prev, offering_type: '' }));
                          }}
                          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                            formData.offering_type === 'LEC'
                              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          <span>📚</span>
                          <span>Lecture (LEC)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, offering_type: 'LAB' }));
                            if (errors.offering_type) setErrors(prev => ({ ...prev, offering_type: '' }));
                          }}
                          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                            formData.offering_type === 'LAB'
                              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          <span>🔬</span>
                          <span>Laboratory (LAB)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedSubjectMetadata && formData.offering_type && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      {(() => {
                        const offering = courseSubjectOfferings?.find(
                          (o) =>
                            o.course_id === formData.course_id &&
                            o.subject_id === formData.subject_id &&
                            o.offering_type === formData.offering_type
                        );

                        const lecUnits = offering?.lecture_units ?? null;
                        const labUnits = offering?.lab_units ?? null;
                        const contactHours = offering?.contact_hours ?? null;
                        const totalUnits = 
                          formData.offering_type === 'LEC' 
                            ? lecUnits 
                            : formData.offering_type === 'LAB' 
                            ? labUnits 
                            : null;

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Units
                              </p>
                              <span className="text-xs font-semibold text-slate-600">
                                {selectedSubjectMetadata?.subject_code}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-slate-500 font-semibold">LEC</p>
                                <p className="text-sm font-bold text-slate-900">
                                  {typeof lecUnits === 'number' ? lecUnits : '—'}
                                </p>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-slate-500 font-semibold">LAB</p>
                                <p className="text-sm font-bold text-slate-900">
                                  {typeof labUnits === 'number' ? labUnits : '—'}
                                </p>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-slate-500 font-semibold">TOTAL</p>
                                <p className="text-sm font-bold text-slate-900">
                                  {typeof totalUnits === 'number' ? totalUnits : '—'}
                                </p>
                              </div>
                            </div>

                            {typeof contactHours === 'number' && (
                              <p className="text-xs text-slate-600 font-medium">
                                Contact hours: <span className="font-bold text-slate-900">{contactHours}</span>
                              </p>
                            )}

                            {!offering && (
                              <p className="text-xs text-amber-700 font-semibold">
                                Units not configured for this subject/component in course offerings.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Faculty {formData.offering_type && formData.faculty_id && (
                        <span className={`ml-2 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          formData.offering_type === 'LEC'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {formData.offering_type === 'LEC' ? '📚 Lecture' : '🔬 Laboratory'}
                        </span>
                      )}
                    </label>
                    <SimpleSelector
                      options={qualifiedFaculty.map(fac => ({
                        value: fac.id,
                        label: `${fac.first_name} ${fac.last_name}`
                      }))}
                      value={formData.faculty_id}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, faculty_id: value }));
                        if (errors.faculty_id) setErrors(prev => ({ ...prev, faculty_id: '' }));
                      }}
                      placeholder={
                        !formData.subject_id 
                          ? "Select a subject first" 
                          : qualifiedFaculty.length === 0 
                          ? "No faculty available for this program" 
                          : "Select Faculty"
                      }
                      disabled={!formData.subject_id || qualifiedFaculty.length === 0}
                      searchable={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Schedule & Location */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Clock size={48} className="text-blue-600 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Schedule & Location</h3>
                  <p className="text-slate-600">Set the day, time, and location for this schedule</p>
                </div>
                
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Day
                    </label>
                    <SimpleSelector
                      options={daysOfWeek}
                      value={formData.day_of_week}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, day_of_week: value }));
                        if (errors.day_of_week) setErrors(prev => ({ ...prev, day_of_week: '' }));
                      }}
                      placeholder="Select Day"
                      searchable={false}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleChange}
                        max="21:00"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleChange}
                        max="21:00"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Room/Location
                    </label>
                    <LocationSelector
                      locations={locations || []}
                      value={formData.location_id}
                      onChange={(locationId) => {
                        setFormData(prev => ({ ...prev, location_id: locationId }));
                        if (errors.location_id) setErrors(prev => ({ ...prev, location_id: '' }));
                      }}
                      placeholder="Select Location"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 pb-6 px-8 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={currentStep === 1 ? handleClose : handlePrevious}
            className="px-6 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all duration-200 font-medium shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center gap-2"
            disabled={isSubmitting}
          >
            <ChevronLeft size={18} />
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          <div className="flex gap-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isNavigating || isSubmitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                form="schedule-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {isSubmitting ? 'Saving...' : editingSchedule && approvalStatus === 'requested_change' ? 'Resend Schedule' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setShowValidationModal(false)}
            aria-hidden="true"
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between border-b border-red-800">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-white" />
                <h3 className="text-lg font-bold text-white">{validationTitle}</h3>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="bg-white/10 text-white border border-white/20 rounded-lg p-1.5 hover:bg-white/20 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-600 text-sm mb-4">
                {validationIntro}
              </p>
              <ul className="space-y-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-red-500 font-bold leading-5">•</span>
                    <span className="text-slate-700 text-sm">{error}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleFormModal;
