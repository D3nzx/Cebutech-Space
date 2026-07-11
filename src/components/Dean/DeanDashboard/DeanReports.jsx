import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { AlertCircle, ChevronDown, ChevronUp, Printer, Eye, X } from 'lucide-react';
import SimpleSelector from '../../SimpleSelector';
import WeeklyTimetable from '../../ProgramHead/ProgramHeadDashboard/Scheduling/WeeklyTimetable';
import ctuLogo from '../../../assets/svg/CTU_logo.svg';
import bagongPilipinasLogo from '../../../assets/images/Bagong_Pilipinas_logo.png';
import ReportsPrintView from '../../Shared/ReportsPrintView';

const ctuCcFormat = new URL('../../../assets/images/CTU CC FORMAT.png', import.meta.url).href;
import ReportApprovalViewer from '../../Shared/ReportApprovalViewer';
import { getRequestsForRole, updateRequestStatus } from '../../../api/reportApprovals';
import { notifyCampusDirectorForReportReview, notifyProgramHeadOnDecision } from '../../../api/notifications';

function DeanReports({ deanData }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProgramHead, setSelectedProgramHead] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [deanName, setDeanName] = useState('Dean');
  const [campusDirectorName, setCampusDirectorName] = useState('Campus Director');
  const [isViewMode, setIsViewMode] = useState(false);
  const [isViewModePage2, setIsViewModePage2] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const formatFullName = (first, middle, last) => {
    const parts = [first, middle, last].map((p) => (p || '').trim()).filter(Boolean);
    return parts.join(' ').trim();
  };

  useEffect(() => {
    if (deanData && deanData.id) {
      const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
          // Step 1: Fetch all active raw schedules
          const { data: rawSchedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true);

          if (schedulesError) throw schedulesError;

          if (!rawSchedules || rawSchedules.length === 0) {
            setSchedules([]);
            setLoading(false);
            return;
          }

          // Step 2: Gather all unique foreign key IDs
          const subjectIds = [...new Set(rawSchedules.map(s => s.subject_id).filter(Boolean))];
          const locationIds = [...new Set(rawSchedules.map(s => s.location_id).filter(Boolean))];
          const facultyIds = [...new Set(rawSchedules.map(s => s.faculty_id).filter(Boolean))];
          const courseIds = [...new Set(rawSchedules.map(s => s.course_id).filter(Boolean))];
          const sectionIds = [...new Set(rawSchedules.map(s => s.section_id).filter(Boolean))];
          const programHeadIds = [...new Set(rawSchedules.map(s => s.created_by_program_head_id).filter(Boolean))];
          const courseSubjectOfferingIds = [...new Set(rawSchedules.map(s => s.course_subject_offering_id).filter(Boolean))];

          // Step 3: Fetch related data in parallel
          const [subjectsRes, locationsRes, facultyRes, sectionsRes, programHeadsRes, coursesRes, offeringsRes] = await Promise.all([
            subjectIds.length > 0 ? supabase.from('subjects').select('*').in('id', subjectIds) : Promise.resolve({ data: [] }),
            locationIds.length > 0 ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
            facultyIds.length > 0 ? supabase.from('faculty').select('*').in('id', facultyIds) : Promise.resolve({ data: [] }),
            sectionIds.length > 0 ? supabase.from('sections').select('id, section_name, year_levels(year_level)').in('id', sectionIds) : Promise.resolve({ data: [] }),
            programHeadIds.length > 0 ? supabase.from('program_heads').select('*').in('id', programHeadIds) : Promise.resolve({ data: [] }),
            courseIds.length > 0 ? supabase.from('courses').select('id, course_code, course_name').in('id', courseIds) : Promise.resolve({ data: [] }),
            courseSubjectOfferingIds.length > 0 ? supabase.from('course_subject_offerings').select('id, offering_type, lecture_units, lab_units, contact_hours').in('id', courseSubjectOfferingIds) : Promise.resolve({ data: [] }),
          ]);

          // Step 4: Create maps for efficient lookup (tolerate partial failures)
          const subjectsMap = new Map((subjectsRes?.data || []).map(s => [s.id, s]));
          const locationsMap = new Map((locationsRes?.data || []).map(l => [l.id, l]));
          const facultyMap = new Map((facultyRes?.data || []).map(f => [f.id, f]));
          const sectionsMap = new Map((sectionsRes?.data || []).map(s => [s.id, s]));
          const programHeadsMap = new Map((programHeadsRes?.data || []).map(p => [p.id, p]));
          const coursesMap = new Map((coursesRes?.data || []).map(c => [c.id, c]));
          const offeringsMap = new Map((offeringsRes?.data || []).map(o => [o.id, o]));

          // Step 5: Manually join the data
          const enrichedSchedules = rawSchedules.map(schedule => ({
            ...schedule,
            subject: subjectsMap.get(schedule.subject_id) || null,
            location: locationsMap.get(schedule.location_id) || null,
            faculty: facultyMap.get(schedule.faculty_id) || null,
            course: coursesMap.get(schedule.course_id) || null,
            course_subject_offering: offeringsMap.get(schedule.course_subject_offering_id) || null,
            sections: sectionsMap.get(schedule.section_id) || null,
            program_heads: programHeadsMap.get(schedule.created_by_program_head_id) || null,
          }));

          setSchedules(enrichedSchedules);

        } catch (err) {
          console.error('Error fetching schedules:', err);
          setError('Failed to load active schedules. Please try again later.');
          setSchedules([]);
        } finally {
          setLoading(false);
        }
      };

      fetchSchedules();
    } else {
      setLoading(false);
      setSchedules([]);
    }
  }, [deanData]);

  useEffect(() => {
    const loadApprovals = async () => {
      if (!deanData?.id) {
        setApprovalRequests([]);
        return;
      }
      const { data } = await getRequestsForRole('dean', deanData.id);
      setApprovalRequests(data || []);
    };
    loadApprovals();
  }, [deanData]);

  useEffect(() => {
    const fetchDean = async () => {
      try {
        const { data, error } = await supabase
          .from('deans')
          .select('first_name, middle_name, last_name')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const full = formatFullName(data.first_name, data.middle_name, data.last_name);
          setDeanName(full || 'Dean');
        }
      } catch (err) {
        console.error('Error fetching dean name:', err);
        setDeanName('Dean');
      }
    };

    fetchDean();
  }, []);

  useEffect(() => {
    const fetchCampusDirectorInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('campus_directors')
          .select('first_name, middle_name, last_name')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const full = formatFullName(data.first_name, data.middle_name, data.last_name);
          setCampusDirectorName(full || 'Campus Director');
        }
      } catch (err) {
        console.error('Error fetching campus director info:', err);
        setCampusDirectorName('Campus Director');
      }
    };

    fetchCampusDirectorInfo();
  }, []);

  useEffect(() => {
    setSelectedFaculty('');
  }, [selectedProgramHead]);

  // Reset year and section when faculty changes
  useEffect(() => {
    setSelectedYear('');
    setSelectedSection('');
  }, [selectedFaculty]);

  // Helper function to extract year level from schedule
  const extractYearLevel = (schedule) => {
    if (!schedule) return null;
    
    // Try different possible data structures
    if (schedule.sections?.year_levels) {
      if (typeof schedule.sections.year_levels === 'object' && schedule.sections.year_levels.year_level) {
        return schedule.sections.year_levels.year_level;
      } else if (typeof schedule.sections.year_levels === 'string') {
        return schedule.sections.year_levels;
      }
    }
    
    if (schedule.year_level) return schedule.year_level;
    if (schedule.year) return schedule.year;
    
    return null;
  };

  // Helper function to extract section name from schedule
  const extractSectionName = (schedule) => {
    if (!schedule) return null;
    
    if (schedule.sections?.section_name) return schedule.sections.section_name;
    if (schedule.section_name) return schedule.section_name;
    if (schedule.section) return schedule.section;
    
    return null;
  };

  const facultyOptions = useMemo(() => {
    if (!schedules || schedules.length === 0 || !selectedProgramHead) return [];
    const facultyMap = new Map();
    schedules
      .filter(s => s.created_by_program_head_id === selectedProgramHead)
      .forEach(schedule => {
        if (schedule.faculty) {
          facultyMap.set(schedule.faculty.id, schedule.faculty);
        }
      });
    const facultyList = Array.from(facultyMap.values()).sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
    return facultyList.map(faculty => ({
      label: `${faculty.first_name} ${faculty.last_name}`,
      value: faculty.id,
    }));
  }, [schedules, selectedProgramHead]);

    const programHeadOptions = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const programHeadsMap = new Map();
    schedules.forEach(schedule => {
      if (schedule.program_heads) {
        programHeadsMap.set(schedule.program_heads.id, schedule.program_heads);
      }
    });
    const programHeadsList = Array.from(programHeadsMap.values()).sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
    return programHeadsList.map(ph => ({
      label: `${ph.first_name} ${ph.last_name} (${ph.program})`,
      value: ph.id,
    }));
  }, [schedules]);

  const selectedFacultyLabel = useMemo(() => {
    if (!selectedFaculty) return '';
    const match = facultyOptions.find(o => o.value === selectedFaculty);
    return match?.label || '';
  }, [facultyOptions, selectedFaculty]);


  const filteredSchedules = useMemo(() => {
    if (!selectedFaculty) return [];

    const normalizeDay = (day) => {
      if (!day) return '';
      const upper = day.trim().toUpperCase();
      if (upper.startsWith('MON')) return 'MON';
      if (upper.startsWith('TUE')) return 'TUE';
      if (upper.startsWith('WED')) return 'WED';
      if (upper.startsWith('THU')) return 'THU';
      if (upper.startsWith('FRI')) return 'FRI';
      if (upper.startsWith('SAT')) return 'SAT';
      if (upper.startsWith('SUN')) return 'SUN';
      return upper;
    };

    const filtered = schedules
      .filter(s => s.faculty_id === selectedFaculty)
      .map(s => ({ ...s, _dayKey: normalizeDay(s.day_of_week) }));

    const hasSunday = filtered.some(s => s._dayKey === 'SUN');
    const daysOrder = hasSunday
      ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const dayRank = daysOrder.reduce((acc, day, idx) => {
      acc[day] = idx;
      return acc;
    }, {});

    const timeToMinutes = (t) => {
      if (!t) return Number.MAX_SAFE_INTEGER;
      // Handles "HH:MM" or "HH:MM:SS"
      const parts = t.split(':');
      let hour = parseInt(parts[0], 10);
      let minute = parseInt(parts[1] || '0', 10);
      // If AM/PM notation is used
      const ampmMatch = t.toUpperCase().match(/AM|PM/);
      if (ampmMatch) {
        const isPM = ampmMatch[0] === 'PM';
        hour = hour % 12 + (isPM ? 12 : 0);
      }
      return hour * 60 + minute;
    };

    return filtered.slice().sort((a, b) => {
      const dayA = dayRank[a._dayKey] ?? Number.MAX_SAFE_INTEGER;
      const dayB = dayRank[b._dayKey] ?? Number.MAX_SAFE_INTEGER;
      const safeDayA = dayA;
      const safeDayB = dayB;
      if (safeDayA !== safeDayB) return safeDayA - safeDayB;
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
  }, [schedules, selectedFaculty]);

  const programHeadName = useMemo(() => {
    if (!selectedProgramHead) return 'Program Head';
    const programHead = programHeadOptions.find(p => p.value === selectedProgramHead);
    if (!programHead) return 'Program Head';
    // Extract just the name part from the label
    const nameMatch = programHead.label.match(/^(.*?)(?: \()/);
    return nameMatch ? nameMatch[1] : 'Program Head';
  }, [selectedProgramHead, programHeadOptions]);

  const selectedProgramHeadProgram = useMemo(() => {
    if (!selectedProgramHead) return '';
    const ph = schedules.find(s => s?.program_heads?.id === selectedProgramHead)?.program_heads;
    return ph?.program || '';
  }, [schedules, selectedProgramHead]);


  const summaryRows = useMemo(() => {
    const list = Array.isArray(filteredSchedules) ? filteredSchedules : [];
    if (list.length === 0) return [];

    const keyForRow = (s) => {
      const subjectCode = s?.subject?.subject_code || '';
      const offeringType = s?.course_subject_offering?.offering_type || '';
      const yearLevel = s?.year_level || '';
      const section = s?.section || '';
      const courseCode = s?.course?.course_code || '';
      return `${courseCode}__${subjectCode}__${offeringType}__${yearLevel}__${section}`;
    };

    const seen = new Set();
    const out = [];

    for (const s of list) {
      const key = keyForRow(s);
      if (seen.has(key)) continue;
      seen.add(key);

      const offeringType = s?.course_subject_offering?.offering_type;
      const subjectCode = s?.subject?.subject_code || 'N/A';
      const descriptiveTitleBase = s?.subject?.subject_name || 'Unknown Subject';
      const descriptiveTitle = offeringType ? `${descriptiveTitleBase} (${offeringType === 'LEC' ? 'Lec' : offeringType === 'LAB' ? 'Lab' : offeringType})` : descriptiveTitleBase;

      const yearLevel = s?.year_level || '';
      const section = s?.section || '';
      const courseCode = s?.course?.course_code || '';

      const yearNumber = (() => {
        const match = String(yearLevel).match(/\d+/);
        return match ? match[0] : '';
      })();

      const degreeYrSec = `${courseCode || ''}${(courseCode && (yearNumber || section)) ? ' ' : ''}${yearNumber || ''}${section || ''}`.trim();

      out.push({
        courseCode: subjectCode,
        descriptiveTitle,
        degreeYrSec,
      });
    }

    return out;
  }, [filteredSchedules]);

  const summaryTotals = useMemo(() => {
    const list = Array.isArray(filteredSchedules) ? filteredSchedules : [];
    if (list.length === 0) {
      return { preparations: 0, units: 0, hoursPerWeek: 0 };
    }

    const parseTimeToMinutes = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return null;
      const [hours, minutes] = timeString.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    // Preparations and units: count unique subject+offering across all schedules
    const prepMap = new Map();
    for (const s of list) {
      const subjectId = s?.subject_id;
      const offeringId = s?.course_subject_offering_id;
      const offeringType = s?.course_subject_offering?.offering_type || '';
      const key = `${subjectId || ''}__${offeringId || ''}__${offeringType}`;
      if (prepMap.has(key)) continue;

      const off = s?.course_subject_offering;
      const units = (() => {
        if (!off) return 0;
        if (off.offering_type === 'LEC') return Number(off.lecture_units || 0);
        if (off.offering_type === 'LAB') return Number(off.lab_units || 0);
        return Number(off.lecture_units || 0) + Number(off.lab_units || 0);
      })();

      prepMap.set(key, { units });
    }

    const totalUnits = Array.from(prepMap.values()).reduce((acc, v) => acc + (Number(v.units) || 0), 0);

    // Hours/Week: sum durations of all schedule entries (already per-day)
    const totalHours = list.reduce((acc, s) => {
      const start = parseTimeToMinutes(s?.start_time);
      const end = parseTimeToMinutes(s?.end_time);
      if (start == null || end == null || end <= start) return acc;
      return acc + (end - start) / 60;
    }, 0);

    return {
      preparations: prepMap.size,
      units: totalUnits,
      hoursPerWeek: totalHours,
    };
  }, [filteredSchedules]);

  // Get available years and sections for filtering
  const availableYears = useMemo(() => {
    if (!selectedFaculty) return [];
    const years = new Set();
    
    filteredSchedules.forEach(s => {
      const yearValue = extractYearLevel(s);
      if (yearValue) {
        years.add(yearValue);
      }
    });
    
    console.log('Available Years for Faculty:', Array.from(years));
    return Array.from(years).sort();
  }, [filteredSchedules, selectedFaculty]);

  const availableSections = useMemo(() => {
    if (!selectedFaculty || !selectedYear) return [];
    const sections = new Set();
    
    filteredSchedules.forEach(s => {
      const yearValue = extractYearLevel(s);
      
      if (yearValue === selectedYear) {
        const sectionName = extractSectionName(s);
        if (sectionName) {
          sections.add(sectionName);
        }
      }
    });
    
    console.log('Available Sections for Year', selectedYear, ':', Array.from(sections));
    return Array.from(sections).sort();
  }, [filteredSchedules, selectedFaculty, selectedYear]);

  // Filter schedules based on year and section
  const filteredSchedulesByYearSection = useMemo(() => {
    if (!selectedFaculty) return [];
    if (!selectedYear || !selectedSection) return filteredSchedules;
    
    return filteredSchedules.filter(s => {
      const yearValue = extractYearLevel(s);
      const sectionValue = extractSectionName(s);
      
      return yearValue === selectedYear && sectionValue === selectedSection;
    });
  }, [filteredSchedules, selectedFaculty, selectedYear, selectedSection]);

  const summaryTotalsPage2 = useMemo(() => {
    const list = Array.isArray(filteredSchedulesByYearSection) ? filteredSchedulesByYearSection : [];
    if (list.length === 0) {
      return { preparations: 0, units: 0, hoursPerWeek: 0 };
    }

    const parseTimeToMinutes = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return null;
      const [hours, minutes] = timeString.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    // Preparations and units: count unique subject+offering across all schedules
    const prepMap = new Map();
    for (const s of list) {
      const subjectId = s?.subject_id;
      const offeringId = s?.course_subject_offering_id;
      const offeringType = s?.course_subject_offering?.offering_type || '';
      const key = `${subjectId || ''}__${offeringId || ''}__${offeringType}`;
      if (prepMap.has(key)) continue;

      const off = s?.course_subject_offering;
      const units = (() => {
        if (!off) return 0;
        if (off.offering_type === 'LEC') return Number(off.lecture_units || 0);
        if (off.offering_type === 'LAB') return Number(off.lab_units || 0);
        return Number(off.lecture_units || 0) + Number(off.lab_units || 0);
      })();

      prepMap.set(key, { units });
    }

    const totalUnits = Array.from(prepMap.values()).reduce((acc, v) => acc + (Number(v.units) || 0), 0);

    // Hours/Week: sum durations of all schedule entries (already per-day)
    const totalHours = list.reduce((acc, s) => {
      const start = parseTimeToMinutes(s?.start_time);
      const end = parseTimeToMinutes(s?.end_time);
      if (start == null || end == null || end <= start) return acc;
      return acc + (end - start) / 60;
    }, 0);

    return {
      preparations: prepMap.size,
      units: totalUnits,
      hoursPerWeek: totalHours,
    };
  }, [filteredSchedulesByYearSection]);

  const summaryRowsPage2 = useMemo(() => {
    const list = Array.isArray(filteredSchedulesByYearSection) ? filteredSchedulesByYearSection : [];
    if (list.length === 0) return [];

    const keyForRow = (s) => {
      const subjectCode = s?.subject?.subject_code || '';
      const offeringType = s?.course_subject_offering?.offering_type || '';
      return `${subjectCode}__${offeringType}`;
    };

    const seen = new Set();
    const out = [];

    for (const s of list) {
      const key = keyForRow(s);
      if (seen.has(key)) continue;
      seen.add(key);

      const offeringType = s?.course_subject_offering?.offering_type;
      const subjectCode = s?.subject?.subject_code || 'N/A';
      const descriptiveTitleBase = s?.subject?.subject_name || 'Unknown Subject';
      const descriptiveTitle = offeringType ? `${descriptiveTitleBase} (${offeringType === 'LEC' ? 'Lec' : offeringType === 'LAB' ? 'Lab' : offeringType})` : descriptiveTitleBase;

      const off = s?.course_subject_offering;
      const units = (() => {
        if (!off) return 0;
        if (off.offering_type === 'LEC') return Number(off.lecture_units || 0);
        if (off.offering_type === 'LAB') return Number(off.lab_units || 0);
        return Number(off.lecture_units || 0) + Number(off.lab_units || 0);
      })();

      out.push({
        courseCode: subjectCode,
        descriptiveTitle,
        units,
      });
    }

    return out;
  }, [filteredSchedulesByYearSection]);

  const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  const printStyles = `
    @page {
      size: legal portrait;
      margin: 2mm;
    }
    @media print {
      body * {
        visibility: hidden;
      }
      .report-print-area,
      .report-print-area * {
        visibility: visible !important;
      }
      .report-print-area {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 0;
        background: white;
        transform: scale(0.86);
        transform-origin: top left;
        width: calc(100% / 0.86);
      }
      .report-print-area {
        font-size: 17px;
      }
      .report-timetable {
        transform: none;
        width: 100%;
      }
      .report-summary {
        font-size: 16px;
      }
      .report-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .report-signature {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
      }
      .report-print-area .print\\:hidden {
        display: none !important;
      }
      .report-print-area .print\\:block {
        display: block !important;
      }
      .report-print-area .print\\:shadow-none {
        box-shadow: none !important;
      }
      .report-print-area .print\\:border-none {
        border: none !important;
      }
      .report-print-area .print\\:p-0 {
        padding: 0 !important;
      }
      .report-print-area .print\\:overflow-visible {
        overflow: visible !important;
      }
    }
  `;

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Active Schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold mb-2">An Error Occurred</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const formatSemesterLabel = (semesterValue) => {
    if (semesterValue == null || semesterValue === '') return '';
    if (typeof semesterValue === 'number') {
      if (semesterValue === 1) return '1st Semester';
      if (semesterValue === 2) return '2nd Semester';
      return String(semesterValue);
    }
    const s = String(semesterValue);
    if (s.includes('Semester')) return s;
    if (s === '1') return '1st Semester';
    if (s === '2') return '2nd Semester';
    return s;
  };

  const printAcademicPeriodText = (() => {
    if (!selectedFaculty || !filteredSchedules || filteredSchedules.length === 0) {
      return 'Second Semester, A.Y. 2025-2026';
    }

    const semesterValues = Array.from(
      new Set(filteredSchedules.map(s => s?.semester).filter(v => v != null && v !== ''))
    );
    const schoolYearValues = Array.from(
      new Set(filteredSchedules.map(s => s?.school_year).filter(v => v != null && String(v).trim() !== ''))
    );

    const semesterLabel = semesterValues.length === 1
      ? formatSemesterLabel(semesterValues[0])
      : '';
    const schoolYearLabel = schoolYearValues.length === 1
      ? `A.Y. ${schoolYearValues[0]}`
      : '';

    if (semesterLabel && schoolYearLabel) return `${semesterLabel}, ${schoolYearLabel}`;
    if (semesterLabel) return semesterLabel;
    if (schoolYearLabel) return schoolYearLabel;
    return 'Second Semester, A.Y. 2025-2026';
  })();
  const printProgramTypeText = (() => {
    if (!selectedFaculty || !filteredSchedules || filteredSchedules.length === 0) {
      return 'Day Program';
    }

    const parseTimeToMinutes = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return null;
      const [hours, minutes] = timeString.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    const dayStart = 7 * 60; // 7:00 AM
    const dayEnd = 16 * 60; // 4:00 PM

    const hasNightSchedule = filteredSchedules.some(s => {
      const start = parseTimeToMinutes(s?.start_time);
      const end = parseTimeToMinutes(s?.end_time);
      if (start == null || end == null) return false;
      return start < dayStart || end > dayEnd;
    });

    return hasNightSchedule ? 'Night Program' : 'Day Program';
  })();

  const handleDecision = async (isApprove, comment) => {
    if (!activeRequest) return;

    // Only keep comments for rejections/concerns, not for approvals
    const effectiveComment = isApprove ? null : comment;

    setActionLoading(true);
    const status = isApprove ? 'dean_approved' : 'dean_rejected';
    await updateRequestStatus({
      requestId: activeRequest.id,
      status,
      actorRole: 'dean',
      actorId: deanData?.id,
      comment: effectiveComment
    });

    if (isApprove) {
      await notifyCampusDirectorForReportReview({
        campusDirectorId: activeRequest.campus_director_id,
        approvalId: activeRequest.id,
        facultyLabel: activeRequest?.report_payload?.facultyLabel
      });
    }
    await notifyProgramHeadOnDecision({
      programHeadId: activeRequest.program_head_id,
      approvalId: activeRequest.id,
      status,
      comment: effectiveComment
    });

    const refreshed = await getRequestsForRole('dean', deanData?.id);
    setApprovalRequests(refreshed.data || []);
    const updated = refreshed.data?.find((r) => r.id === activeRequest.id);
    setActiveRequest(updated || null);
    setActionLoading(false);
  };

  if (isViewMode) {
    return (
      <ReportsPrintView
        page={1}
        onClose={() => setIsViewMode(false)}
        onPrint={() => handlePrint()}
        programHeadName={programHeadName}
        facultyLabel={selectedFacultyLabel}
        filteredSchedules={filteredSchedules}
        summaryTotals={summaryTotals}
        summaryRows={summaryRows}
        summaryRowsPage2={summaryRowsPage2}
        roleName={'Dean'}
        roleDisplayName={deanName}
        approvedDisplayName={campusDirectorName}
        pageTitle={'Preview - Page 1'}
        showProgramTypeAndAcademicPeriod={true}
        printProgramTypeText={printProgramTypeText}
        printAcademicPeriodText={printAcademicPeriodText}
      />
    );
  }

  if (isViewModePage2) {
    return (
      <ReportsPrintView
        page={2}
        onClose={() => setIsViewModePage2(false)}
        onPrint={(p) => handlePrint(p)}
        programHeadName={programHeadName}
        facultyLabel={selectedFacultyLabel}
        filteredSchedules={filteredSchedulesByYearSection}
        summaryTotals={summaryTotalsPage2}
        summaryRowsPage2={summaryRowsPage2}
        roleName={'Dean'}
        roleDisplayName={deanName}
        page2DegreeText={selectedProgramHeadProgram}
        page2YearText={selectedYear}
        page2SectionText={selectedSection}
        reviewedDisplayName={deanName}
        approvedDisplayName={campusDirectorName}
        pageTitle={'Preview - Page 2'}
        showProgramTypeAndAcademicPeriod={true}
        printProgramTypeText={printProgramTypeText}
        printAcademicPeriodText={printAcademicPeriodText}
      />
    );
  }


  return (
    <>
      {activeRequest && (
        <ReportApprovalViewer
          request={activeRequest}
          role="dean"
          onClose={() => setActiveRequest(null)}
          onApprove={(comment) => handleDecision(true, comment)}
          onReject={(comment) => handleDecision(false, comment)}
          loading={actionLoading}
        />
      )}
      <style>{printStyles}</style>
      <div className="space-y-6 print:space-y-4 print:p-0">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print:hidden">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Active Schedules Report</h1>
            <p className="text-slate-600 mt-2">Approval view for faculty schedules</p>
          </div>
        </div>

        <div className="hidden print:block mb-4">
          <div className="report-avoid-break">
            <div className="flex items-center justify-center gap-0">
              <img src={ctuLogo} alt="CTU Logo" className="h-20 w-auto mr-3" />
              <div className="text-center leading-tight flex-shrink-0 px-0">
                <p className="text-[12px]">Republic of the Philippines</p>
                <p className="text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
                <p className="text-[12px] font-semibold">CONSOLACION CAMPUS</p>
                <p className="text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
                <p className="text-[11px]">Website: http://www.ctu.edu.ph  E-mail: cduconsolacion@ctu.edu.ph</p>
                <p className="text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
              </div>
              <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-20 w-auto ml-3" />
            </div>

            <div className="text-center mt-2">
              <p className="text-[16px] font-semibold">PROGRAM BY TEACHER</p>
              <p className="text-[13px]">{printProgramTypeText}</p>
              <p className="text-[13px] underline">{printAcademicPeriodText}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-10 text-[12px]">
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="w-28">Name:</span>
                  <span className="flex-1 border-b border-slate-500 font-semibold">{selectedFacultyLabel || ''}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Bachelor's Degree:</span>
                  <span className="flex-1 border-b border-slate-500"></span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Master's Degree:</span>
                  <span className="flex-1 border-b border-slate-500"></span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Doctorate Degree:</span>
                  <span className="flex-1 border-b border-slate-500"></span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28">Special Training:</span>
                  <span className="flex-1 border-b border-slate-500"></span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="grid grid-cols-[9rem_1fr] gap-x-2">
                  <span>Status of Appointment:</span>
                  <span></span>

                  <span></span>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-slate-700"></span>
                    <span>Permanent</span>
                  </div>

                  <span></span>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-slate-700"></span>
                    <span>Temporary</span>
                  </div>

                  <span></span>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-slate-700"></span>
                    <span>Contract of Service</span>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex gap-2">
                    <span className="w-16">Major:</span>
                    <span className="flex-1 border-b border-slate-500"></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-16">Minor:</span>
                    <span className="flex-1 border-b border-slate-500"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dean view: filters and timetable removed for a simpler approval-focused UI */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-700">
            This view is focused on handling approval requests. Use the notifications and approval dialog to review and act on reports.
          </p>
        </div>
      </div>
    </>
  );
}

export default DeanReports;
