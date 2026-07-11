import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { AlertCircle, ChevronDown, ChevronUp, Printer, Eye, X } from 'lucide-react';
import SimpleSelector from '../../SimpleSelector';
import WeeklyTimetable from './Scheduling/WeeklyTimetable';
import ctuLogo from '../../../assets/svg/CTU_logo.svg';
import bagongPilipinasLogo from '../../../assets/images/Bagong_Pilipinas_logo.png';
import ReportsPrintView from '../../Shared/ReportsPrintView';

const ctuCcFormat = new URL('../../../assets/images/CTU CC FORMAT.png', import.meta.url).href;
import { createReportApprovalRequest, getRequestsForRole, deleteApprovalRequest, archiveApprovalRequest, restoreApprovalRequest } from '../../../api/reportApprovals';
import { notifyDeanForReportReview } from '../../../api/notifications';

function Reports({ programHeadData }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'approved' | 'archived'
  const [approvedSearch, setApprovedSearch] = useState('');
  const [approvedSort, setApprovedSort] = useState('newest'); // 'newest' | 'oldest' | 'name_az' | 'name_za'
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [deanName, setDeanName] = useState('Dean');
  const [campusDirectorName, setCampusDirectorName] = useState('Campus Director');
  const [isViewMode, setIsViewMode] = useState(false);
  const [isViewModePage2, setIsViewModePage2] = useState(false);
  const [approvedPreviewRequest, setApprovedPreviewRequest] = useState(null);
  const [approvedPreviewPage, setApprovedPreviewPage] = useState(1);
  const [isApprovedPreviewMode, setIsApprovedPreviewMode] = useState(false);
  const [selectedYearPage2, setSelectedYearPage2] = useState('');
  const [selectedSectionPage2, setSelectedSectionPage2] = useState('');
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [sending, setSending] = useState(false);
  const [timeNow, setTimeNow] = useState(() => Date.now());

  const relativeTimeFormatter = useMemo(() => new Intl.RelativeTimeFormat('en', { numeric: 'auto' }), []);

  const formatFullName = (first, middle, last) => {
    const parts = [first, middle, last].map((p) => (p || '').trim()).filter(Boolean);
    return parts.join(' ').trim();
  };

  useEffect(() => {
    if (programHeadData && programHeadData.id) {
      const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
          // Step 1: Fetch raw schedules filtered by Program Head and status
          const { data: rawSchedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .eq('created_by_program_head_id', programHeadData.id);

          if (schedulesError) throw schedulesError;
          console.log('Reports.jsx - Step 1: Fetched Raw Schedules:', rawSchedules);

          if (!rawSchedules || rawSchedules.length === 0) {
            console.log('Reports.jsx: No raw schedules found for this program head.');
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
            programHeadIds.length > 0 ? supabase.from('program_heads').select('id, first_name, last_name').in('id', programHeadIds) : Promise.resolve({ data: [] }),
            courseIds.length > 0 ? supabase.from('courses').select('id, course_code, course_name').in('id', courseIds) : Promise.resolve({ data: [] }),
            courseSubjectOfferingIds.length > 0 ? supabase.from('course_subject_offerings').select('id, offering_type, lecture_units, lab_units, contact_hours').in('id', courseSubjectOfferingIds) : Promise.resolve({ data: [] }),
          ]);

          // Step 4: Create maps for efficient lookup
          const subjectsMap = new Map(subjectsRes.data.map(s => [s.id, s]));
          const locationsMap = new Map(locationsRes.data.map(l => [l.id, l]));
          const facultyMap = new Map(facultyRes.data.map(f => [f.id, f]));
          const sectionsMap = new Map(sectionsRes.data.map(s => [s.id, s]));
          const programHeadsMap = new Map(programHeadsRes.data.map(p => [p.id, p]));
          const coursesMap = new Map(coursesRes.data.map(c => [c.id, c]));
          const offeringsMap = new Map((offeringsRes?.data || []).map(o => [o.id, o]));

          console.log('Raw Schedules:', rawSchedules);
          console.log('Section IDs:', sectionIds);
          console.log('Sections Map:', sectionsMap);
          console.log('Enriched Schedules:', sectionsMap);

          // Step 5: Manually join the data
          const enrichedSchedules = rawSchedules.map(schedule => ({
            ...schedule,
            // Keys expected by WeeklyTimetable (Class Management design)
            subject: subjectsMap.get(schedule.subject_id) || null,
            location: locationsMap.get(schedule.location_id) || null,
            faculty: facultyMap.get(schedule.faculty_id) || null,
            course: coursesMap.get(schedule.course_id) || null,
            course_subject_offering: offeringsMap.get(schedule.course_subject_offering_id) || null,
            // Legacy keys retained (not used by WeeklyTimetable)
            subjects: subjectsMap.get(schedule.subject_id) || null,
            locations: locationsMap.get(schedule.location_id) || null,
            sections: sectionsMap.get(schedule.section_id) || null,
            program_heads: programHeadsMap.get(schedule.created_by_program_head_id) || null,
          }));

          console.log('Enriched Schedules:', enrichedSchedules);
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
  }, [programHeadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadApprovals = async () => {
      if (!programHeadData?.id) {
        setApprovalRequests([]);
        return;
      }
      const { data } = await getRequestsForRole('program_head', programHeadData.id);
      setApprovalRequests(data || []);
    };
    loadApprovals();
  }, [programHeadData]);

  useEffect(() => {
    if (!programHeadData?.id) return;

    const channel = supabase
      .channel(`program_head_report_approvals_${programHeadData.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'report_approval_requests',
        filter: `program_head_id=eq.${programHeadData.id}`
      }, async () => {
        const { data } = await getRequestsForRole('program_head', programHeadData.id);
        setApprovalRequests(data || []);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [programHeadData?.id]);

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

  // Reset Page 2 filters when faculty changes
  useEffect(() => {
    setSelectedYearPage2('');
    setSelectedSectionPage2('');
  }, [selectedFaculty]);

  const getRelativeTimeLabel = (date) => {
    if (!date) return null;
    const diffMs = date.getTime() - timeNow;
    const diffMinutes = Math.round(diffMs / 60000);

    if (Math.abs(diffMinutes) < 60) {
      return relativeTimeFormatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return relativeTimeFormatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return relativeTimeFormatter.format(diffDays, 'day');
  };

  const facultyOptions = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const facultyMap = new Map();
    schedules.forEach(schedule => {
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
    const first = programHeadData?.first_name || programHeadData?.firstName || '';
    const middle = programHeadData?.middle_name || programHeadData?.middleName || '';
    const last = programHeadData?.last_name || programHeadData?.lastName || '';
    const full = formatFullName(first, middle, last);
    return full || 'Program Head';
  }, [programHeadData]);

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

  // Get available years and sections for Page 2 filtering
  const availableYearsPage2 = useMemo(() => {
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

  const availableSectionsPage2 = useMemo(() => {
    if (!selectedFaculty || !selectedYearPage2) return [];
    const sections = new Set();
    
    filteredSchedules.forEach(s => {
      const yearValue = extractYearLevel(s);
      
      if (yearValue === selectedYearPage2) {
        const sectionName = extractSectionName(s);
        if (sectionName) {
          sections.add(sectionName);
        }
      }
    });
    
    console.log('Available Sections for Year', selectedYearPage2, ':', Array.from(sections));
    return Array.from(sections).sort();
  }, [filteredSchedules, selectedFaculty, selectedYearPage2]);

  // Filter schedules for Page 2 based on year and section
  const filteredSchedulesPage2 = useMemo(() => {
    if (!selectedFaculty) return [];
    if (!selectedYearPage2 || !selectedSectionPage2) return filteredSchedules;
    
    return filteredSchedules.filter(s => {
      const yearValue = extractYearLevel(s);
      const sectionValue = extractSectionName(s);
      
      return yearValue === selectedYearPage2 && sectionValue === selectedSectionPage2;
    });
  }, [filteredSchedules, selectedFaculty, selectedYearPage2, selectedSectionPage2]);

  const currentApproval = useMemo(() => {
    if (!approvalRequests || approvalRequests.length === 0 || !selectedFaculty) return null;
    const match = approvalRequests.find((req) => {
      if (req.faculty_id !== selectedFaculty) return false;

      if (selectedYearPage2) {
        if (req.academic_year !== selectedYearPage2) return false;
      }

      if (selectedSectionPage2) {
        if (req.section !== selectedSectionPage2) return false;
      }

      return true;
    });
    return match || null;
  }, [approvalRequests, selectedFaculty, selectedSectionPage2, selectedYearPage2]);

  const latestDeanComment = useMemo(() => {
    const comments = Array.isArray(currentApproval?.comments) ? currentApproval.comments : [];
    const deanComments = comments
      .filter((comment) => comment?.actor_role === 'dean')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return deanComments[deanComments.length - 1] || null;
  }, [currentApproval]);

  const latestCampusDirectorComment = useMemo(() => {
    const comments = Array.isArray(currentApproval?.comments) ? currentApproval.comments : [];
    const campusDirectorComments = comments
      .filter((comment) => comment?.actor_role === 'campus_director')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return campusDirectorComments[campusDirectorComments.length - 1] || null;
  }, [currentApproval]);

  const approvedRequests = useMemo(() => {
    const list = Array.isArray(approvalRequests) ? approvalRequests : [];
    return list.filter((r) => (r?.status === 'cd_approved' || r?.status === 'ready') && !r?.archived_at);
  }, [approvalRequests]);

  const archivedApprovedRequests = useMemo(() => {
    const list = Array.isArray(approvalRequests) ? approvalRequests : [];
    return list.filter((r) => (r?.status === 'cd_approved' || r?.status === 'ready') && !!r?.archived_at);
  }, [approvalRequests]);

  const approvedRequestsDisplay = useMemo(() => {
    const q = (approvedSearch || '').trim().toLowerCase();

    const filtered = approvedRequests.filter((req) => {
      if (!q) return true;
      const payload = req?.report_payload || {};
      const page2Meta = payload.page2Meta || {};

      const haystack = [
        payload.facultyLabel,
        page2Meta.degree,
        page2Meta.year,
        page2Meta.section
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    const getApprovedAt = (req) => {
      const v = req?.updated_at || req?.created_at;
      const d = v ? new Date(v) : null;
      return d && Number.isFinite(d.getTime()) ? d : null;
    };

    const getName = (req) => {
      const payload = req?.report_payload || {};
      return (payload.facultyLabel || '').toString();
    };

    const sorted = [...filtered].sort((a, b) => {
      if (approvedSort === 'oldest') {
        const da = getApprovedAt(a);
        const db = getApprovedAt(b);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      }
      if (approvedSort === 'name_az') {
        return getName(a).localeCompare(getName(b));
      }
      if (approvedSort === 'name_za') {
        return getName(b).localeCompare(getName(a));
      }
      const da = getApprovedAt(a);
      const db = getApprovedAt(b);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    return sorted;
  }, [approvedRequests, approvedSearch, approvedSort]);

  const archivedRequestsDisplay = useMemo(() => {
    const q = (approvedSearch || '').trim().toLowerCase();

    const filtered = archivedApprovedRequests.filter((req) => {
      if (!q) return true;
      const payload = req?.report_payload || {};
      const page2Meta = payload.page2Meta || {};

      const haystack = [
        payload.facultyLabel,
        page2Meta.degree,
        page2Meta.year,
        page2Meta.section
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    const getApprovedAt = (req) => {
      const v = req?.updated_at || req?.created_at;
      const d = v ? new Date(v) : null;
      return d && Number.isFinite(d.getTime()) ? d : null;
    };

    const getName = (req) => {
      const payload = req?.report_payload || {};
      return (payload.facultyLabel || '').toString();
    };

    const sorted = [...filtered].sort((a, b) => {
      if (approvedSort === 'oldest') {
        const da = getApprovedAt(a);
        const db = getApprovedAt(b);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      }
      if (approvedSort === 'name_az') {
        return getName(a).localeCompare(getName(b));
      }
      if (approvedSort === 'name_za') {
        return getName(b).localeCompare(getName(a));
      }
      const da = getApprovedAt(a);
      const db = getApprovedAt(b);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    return sorted;
  }, [archivedApprovedRequests, approvedSearch, approvedSort]);

  const handleDeleteApprovedRequest = async (requestId) => {
    if (!requestId || !programHeadData?.id) return;

    const confirmed = window.confirm('Delete this approved report? This will remove the approval record but will not delete any schedules.');
    if (!confirmed) return;

    try {
      const { error, count } = await deleteApprovalRequest(requestId);
      if (error) {
        console.error('Error deleting approved report', error);
        window.alert('Unable to remove this approved report. Please check database permissions or try again.');
        return;
      }
      if (!count) {
        window.alert('No records were deleted. This usually means your account lacks DELETE permission or the record no longer exists.');
        return;
      }
      const refreshed = await getRequestsForRole('program_head', programHeadData.id);
      setApprovalRequests(refreshed.data || []);
    } catch (err) {
      console.error('Error deleting approved report', err);
      window.alert('Unexpected error while removing the approved report. Please try again or check the console for details.');
    }
  };

  const handleArchiveApprovedRequest = async (requestId) => {
    if (!requestId || !programHeadData?.id) return;

    const confirmed = window.confirm('Archive this approved report? You can restore it later from the Archived tab.');
    if (!confirmed) return;

    try {
      const { error } = await archiveApprovalRequest({ requestId });
      if (error) {
        console.error('Error archiving approved report', error);
        window.alert(`Unable to archive this approved report. ${error.message || 'Please try again.'}`);
        return;
      }
      const refreshed = await getRequestsForRole('program_head', programHeadData.id);
      setApprovalRequests(refreshed.data || []);
    } catch (err) {
      console.error('Error archiving approved report', err);
      window.alert('Unexpected error while archiving the approved report. Please try again or check the console for details.');
    }
  };

  const handleRestoreArchivedRequest = async (requestId) => {
    if (!requestId || !programHeadData?.id) return;

    const confirmed = window.confirm('Restore this archived report to Approved?');
    if (!confirmed) return;

    try {
      const { error } = await restoreApprovalRequest({ requestId });
      if (error) {
        console.error('Error restoring archived report', error);
        window.alert(`Unable to restore this archived report. ${error.message || 'Please try again.'}`);
        return;
      }
      const refreshed = await getRequestsForRole('program_head', programHeadData.id);
      setApprovalRequests(refreshed.data || []);
    } catch (err) {
      console.error('Error restoring archived report', err);
      window.alert('Unexpected error while restoring the archived report. Please try again or check the console for details.');
    }
  };

  // Summary rows for Page 1 (Program by Teacher) - shows all courses with sections
  const summaryRows = useMemo(() => {
    const list = Array.isArray(filteredSchedules) ? filteredSchedules : [];
    if (list.length === 0) return [];

    const keyForRow = (s) => {
      const subjectCode = s?.subject?.subject_code || '';
      const offeringType = s?.course_subject_offering?.offering_type || '';
      const yearLevel = extractYearLevel(s) || '';
      const section = extractSectionName(s) || '';
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

      const yearLevel = extractYearLevel(s) || '';
      const section = extractSectionName(s) || '';
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
  }, [filteredSchedules, extractSectionName, extractYearLevel]);

  // Calculate summary totals for Page 1 (Program by Teacher)
  // Uses filteredSchedules (all schedules for selected faculty)
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

    const courseCodeFor = (schedule) => schedule?.course?.course_code || schedule?.subject?.subject_code || '';
    
    // Rule 1: Preparations = distinct course codes only
    // Lecture and Lab components of the same course count as one (1) preparation
    const preparationSet = new Set();
    for (const schedule of list) {
      const courseCode = courseCodeFor(schedule);
      if (courseCode) {
        preparationSet.add(courseCode);
      }
    }

    // Rule 2: Units = Count units per unique course (same as preparations logic)
    // If same course is taught to multiple sections, count units only once per course
    // Standard: Lecture 2 units + Lab 3 units = 5 units per course
    const courseUnitsMap = new Map(); // key: courseCode, value: { lecUnits, labUnits }
    
    for (const schedule of list) {
      const courseCode = courseCodeFor(schedule);
      if (!courseCode) continue;
      
      const off = schedule?.course_subject_offering;
      const offeringType = off?.offering_type || '';
      
      // Create unique key for course only (not including section)
      if (!courseUnitsMap.has(courseCode)) {
        courseUnitsMap.set(courseCode, { lecUnits: 0, labUnits: 0 });
      }
      
      const units = courseUnitsMap.get(courseCode);
      
      // Add lecture units if this is a lecture offering
      if (offeringType === 'LEC' || offeringType === 'LECTURE') {
        const lecUnits = Number(off?.lecture_units || 0);
        if (lecUnits > 0) {
          units.lecUnits = Math.max(units.lecUnits, lecUnits); // Use max if multiple entries
        } else {
          // Default: 2 units for lecture if not specified
          units.lecUnits = Math.max(units.lecUnits, 2);
        }
      }
      
      // Add lab units if this is a lab offering
      if (offeringType === 'LAB' || offeringType === 'LABORATORY') {
        const labUnits = Number(off?.lab_units || 0);
        if (labUnits > 0) {
          units.labUnits = Math.max(units.labUnits, labUnits); // Use max if multiple entries
        } else {
          // Default: 3 units for lab if not specified
          units.labUnits = Math.max(units.labUnits, 3);
        }
      }
    }
    
    // Calculate total units: sum (lecUnits + labUnits) for each unique course
    let totalUnits = 0;
    for (const [courseCode, units] of courseUnitsMap.entries()) {
      const courseUnits = units.lecUnits + units.labUnits;
      if (courseUnits > 0) {
        totalUnits += courseUnits;
      }
    }

    // Rule 3: Hours/Week = sum ALL contact hours (lecture + lab) for entire week
    // Count every hour block that appears in the schedule
    const totalHours = list.reduce((acc, s) => {
      const start = parseTimeToMinutes(s?.start_time);
      const end = parseTimeToMinutes(s?.end_time);
      if (start == null || end == null || end <= start) return acc;
      return acc + (end - start) / 60;
    }, 0);

    return {
      preparations: preparationSet.size,
      units: totalUnits,
      hoursPerWeek: totalHours,
    };
  }, [filteredSchedules, extractSectionName, extractYearLevel]);

  // Summary totals for Page 2 (Program by Section) - uses filtered schedules for specific section
  const summaryTotalsPage2 = useMemo(() => {
    const list = Array.isArray(filteredSchedulesPage2) ? filteredSchedulesPage2 : [];
    if (list.length === 0) {
      return { preparations: 0, units: 0, hoursPerWeek: 0 };
    }

    const parseTimeToMinutes = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return null;
      const [hours, minutes] = timeString.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
    };

    const courseCodeFor = (schedule) => schedule?.course?.course_code || schedule?.subject?.subject_code || '';
    
    // Preparations = distinct course codes only
    const preparationSet = new Set();
    for (const schedule of list) {
      const courseCode = courseCodeFor(schedule);
      if (courseCode) {
        preparationSet.add(courseCode);
      }
    }

    // Units = Count units per unique course (same as Page 1 logic)
    const courseUnitsMap = new Map(); // key: courseCode, value: { lecUnits, labUnits }
    
    for (const schedule of list) {
      const courseCode = courseCodeFor(schedule);
      if (!courseCode) continue;
      
      const off = schedule?.course_subject_offering;
      const offeringType = off?.offering_type || '';
      
      if (!courseUnitsMap.has(courseCode)) {
        courseUnitsMap.set(courseCode, { lecUnits: 0, labUnits: 0 });
      }
      
      const units = courseUnitsMap.get(courseCode);
      
      // Add lecture units if this is a lecture offering
      if (offeringType === 'LEC' || offeringType === 'LECTURE') {
        const lecUnits = Number(off?.lecture_units || 0);
        if (lecUnits > 0) {
          units.lecUnits = Math.max(units.lecUnits, lecUnits);
        } else {
          units.lecUnits = Math.max(units.lecUnits, 2);
        }
      }
      
      // Add lab units if this is a lab offering
      if (offeringType === 'LAB' || offeringType === 'LABORATORY') {
        const labUnits = Number(off?.lab_units || 0);
        if (labUnits > 0) {
          units.labUnits = Math.max(units.labUnits, labUnits);
        } else {
          units.labUnits = Math.max(units.labUnits, 3);
        }
      }
    }
    
    // Calculate total units: sum (lecUnits + labUnits) for each unique course
    let totalUnits = 0;
    for (const [courseCode, units] of courseUnitsMap.entries()) {
      const courseUnits = units.lecUnits + units.labUnits;
      if (courseUnits > 0) {
        totalUnits += courseUnits;
      }
    }

    // Hours/Week = sum ALL contact hours for the filtered section only
    const totalHours = list.reduce((acc, s) => {
      const start = parseTimeToMinutes(s?.start_time);
      const end = parseTimeToMinutes(s?.end_time);
      if (start == null || end == null || end <= start) return acc;
      return acc + (end - start) / 60;
    }, 0);

    return {
      preparations: preparationSet.size,
      units: totalUnits,
      hoursPerWeek: totalHours,
    };
  }, [filteredSchedulesPage2]);

  const summaryRowsPage2 = useMemo(() => {
    const list = Array.isArray(filteredSchedulesPage2) ? filteredSchedulesPage2 : [];
    if (list.length === 0) return [];

    // For Program by Section (Page 2), we want units per course in this section,
    // computed from (lecture_units + lab_units) for its distinct offerings.
    const rowsMap = new Map(); // key: subjectCode, value: { descriptiveTitle, units }
    const seenSubjectOffering = new Set(); // key: subjectCode__offeringId

    for (const s of list) {
      const subjectCode = s?.subject?.subject_code || '';
      if (!subjectCode) continue;

      const off = s?.course_subject_offering;
      const offeringId = s?.course_subject_offering_id || off?.id || '';
      const seenKey = `${subjectCode}__${offeringId}`;
      if (seenSubjectOffering.has(seenKey)) continue;
      if (seenKey) seenSubjectOffering.add(seenKey);

      const lecUnits = Number(off?.lecture_units || 0);
      const labUnits = Number(off?.lab_units || 0);
      const unitsForThisOffering = lecUnits + labUnits;
      if (!Number.isFinite(unitsForThisOffering) || unitsForThisOffering <= 0) continue;

      const descriptiveTitle = s?.subject?.subject_name || 'Unknown Subject';
      const existing = rowsMap.get(subjectCode) || { descriptiveTitle, units: 0 };

      rowsMap.set(subjectCode, {
        descriptiveTitle,
        units: existing.units + unitsForThisOffering,
      });
    }

    const out = [];
    for (const [subjectCode, value] of rowsMap.entries()) {
      out.push({
        courseCode: subjectCode,
        descriptiveTitle: value.descriptiveTitle,
        units: value.units,
      });
    }

    return out;
  }, [filteredSchedulesPage2]);

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

  const approvalStatusLabels = {
    pending: 'Pending (Dean)',
    dean_rejected: 'Returned by Dean',
    dean_approved: 'Waiting for Campus Director',
    cd_rejected: 'Returned by Campus Director',
    cd_approved: 'Approved (Campus Director)',
    ready: 'Ready to print'
  };

  const handleSendToDean = async () => {
    if (!programHeadData?.id || !selectedFaculty) return;

    if (currentApproval && (currentApproval.status === 'cd_approved' || currentApproval.status === 'ready') && !currentApproval.archived_at) {
      window.alert('This report is already approved and cannot be sent to the Dean again.');
      return;
    }
    setSending(true);
    try {
      // Fetch dean and campus director IDs
      const [deanRes, cdRes] = await Promise.all([
        supabase.from('deans').select('id').limit(1).maybeSingle(),
        supabase.from('campus_directors').select('id').limit(1).maybeSingle()
      ]);

      const payload = {
        programHeadName,
        facultyLabel: selectedFacultyLabel,
        filteredSchedules,
        filteredSchedulesPage2,
        summaryTotals,
        summaryRows,
        summaryRowsPage2,
        summaryTotalsPage2: summaryTotalsPage2,
        page2Meta: {
          year: selectedYearPage2,
          section: selectedSectionPage2,
          degree: programHeadData?.program || ''
        },
        deanName,
        campusDirectorName,
        printProgramTypeText,
        printAcademicPeriodText
      };

      const { data, error } = await createReportApprovalRequest({
        programHeadId: programHeadData.id,
        deanId: deanRes.data?.id || null,
        campusDirectorId: cdRes.data?.id || null,
        facultyId: selectedFaculty,
        academicYear: selectedYearPage2 || null,
        section: selectedSectionPage2 || null,
        reportPayload: payload
      });

      if (!error && data) {
        await notifyDeanForReportReview({
          deanId: data.dean_id || deanRes.data?.id,
          approvalId: data.id,
          facultyLabel: selectedFacultyLabel
        });
        const refreshed = await getRequestsForRole('program_head', programHeadData.id);
        setApprovalRequests(refreshed.data || []);
      } else {
        console.error('Error sending report for approval', error);
      }
    } finally {
      setSending(false);
    }
  };

  const closeApprovedPreview = () => {
    setIsApprovedPreviewMode(false);
    setApprovedPreviewRequest(null);
    setApprovedPreviewPage(1);
  };

  if (isApprovedPreviewMode && approvedPreviewRequest) {
    const payload = approvedPreviewRequest?.report_payload || {};
    const page2Meta = payload.page2Meta || {};
    const page = approvedPreviewPage;
    const isTeacher = page === 1;
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 font-sans">
        <div className="relative w-full h-full max-w-[8.5in] max-h-[14in] bg-white shadow-2xl overflow-auto rounded-lg hide-scrollbar">
          <style>{` .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar::-webkit-scrollbar-track { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>

          <div className="sticky top-0 z-[200] bg-white/95 backdrop-blur border-b border-slate-200 px-3 py-2 flex items-center justify-end gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setApprovedPreviewPage(1)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                    isTeacher
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                  }`}
                  style={{ outline: 'none', border: 'none' }}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Program by Teacher"
                >
                  Teacher
                </button>
                <button
                  type="button"
                  onClick={() => setApprovedPreviewPage(2)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                    !isTeacher
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                  }`}
                  style={{ outline: 'none', border: 'none' }}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Program by Section"
                >
                  Section
                </button>
              </div>

              <button
                type="button"
                onClick={() => handlePrint()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
              >
                <Printer size={16} />
                Print
              </button>

              <button
                type="button"
                onClick={closeApprovedPreview}
                className="p-2 rounded-lg bg-white/10 text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <ReportsPrintView
            embedded={true}
            page={page}
            onClose={closeApprovedPreview}
            onPrint={() => handlePrint()}
            programHeadName={payload.programHeadName}
            facultyLabel={payload.facultyLabel}
            filteredSchedules={page === 1 ? (payload.filteredSchedules || []) : (payload.filteredSchedulesPage2 || payload.filteredSchedules || [])}
            summaryTotals={page === 1 ? (payload.summaryTotals || {}) : (payload.summaryTotalsPage2 || payload.summaryTotals || {})}
            summaryRows={payload.summaryRows || []}
            summaryRowsPage2={payload.summaryRowsPage2 || []}
            roleName={'Dean'}
            roleDisplayName={payload.deanName || deanName}
            page2DegreeText={page2Meta.degree || programHeadData?.program || ''}
            page2YearText={page2Meta.year || ''}
            page2SectionText={page2Meta.section || ''}
            reviewedDisplayName={payload.deanName || deanName}
            approvedDisplayName={payload.campusDirectorName || campusDirectorName}
            pageTitle={page === 1 ? 'Preview - Page 1' : 'Preview - Page 2'}
            showProgramTypeAndAcademicPeriod={true}
            printProgramTypeText={payload.printProgramTypeText}
            printAcademicPeriodText={payload.printAcademicPeriodText}
          />
        </div>
      </div>
    );
  }

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
        onPrint={() => handlePrint()}
        programHeadName={programHeadName}
        facultyLabel={selectedFacultyLabel}
        filteredSchedules={filteredSchedulesPage2}
        summaryTotals={summaryTotalsPage2}
        summaryRowsPage2={summaryRowsPage2}
        roleName={'Dean'}
        roleDisplayName={deanName}
        page2DegreeText={programHeadData?.program || ''}
        page2YearText={selectedYearPage2}
        page2SectionText={selectedSectionPage2}
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
      <style>{printStyles}</style>
      <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 print:hidden">
        {/* Tabs */}
        <div className="mb-4">
          <nav className="flex flex-wrap gap-2 sm:gap-3 -mb-px text-sm font-medium" aria-label="Report tabs">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                activeTab === 'active'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Active Schedules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                activeTab === 'approved'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Approved Reports
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                activeTab === 'archived'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700 hover:shadow-lg'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Archived Reports
            </button>
          </nav>
        </div>

        {activeTab === 'active' ? (
          <>
            {/* Title Section */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Active Schedules Report</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2">View and manage faculty schedules for the {programHeadData?.program} program</p>
            </div>

            {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 pb-6 border-b border-slate-200">
            <button
              onClick={() => setIsViewMode(true)}
              disabled={!selectedFaculty}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              type="button"
              title={!selectedFaculty ? "Please select a faculty member first" : ""}
            >
              <span>Page 1</span>
            </button>
            <button
              onClick={() => setIsViewModePage2(true)}
              disabled={!selectedFaculty || !selectedYearPage2 || !selectedSectionPage2}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              type="button"
              title={!selectedFaculty ? "Please select a faculty member first" : !selectedYearPage2 || !selectedSectionPage2 ? "Please select both Year and Section to view Page 2" : ""}
            >
              <span>Page 2</span>
            </button>
            <button
              onClick={handleSendToDean}
              disabled={!selectedFaculty || !selectedYearPage2 || !selectedSectionPage2 || sending || (currentApproval && (currentApproval.status === 'cd_approved' || currentApproval.status === 'ready') && !currentApproval.archived_at)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              type="button"
              title={!selectedFaculty ? 'Select faculty first' : (!selectedYearPage2 || !selectedSectionPage2 ? 'Select year and section first' : (currentApproval && (currentApproval.status === 'cd_approved' || currentApproval.status === 'ready') && !currentApproval.archived_at ? 'Already approved' : 'Send to Dean'))}
            >
              {sending ? 'Sending...' : 'Send to Dean'}
            </button>
            {currentApproval && !currentApproval.archived_at && (
              (currentApproval.status === 'cd_approved' || currentApproval.status === 'ready') ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                  Approved
                </span>
              ) : currentApproval.status === 'dean_approved' ? null : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                  {approvalStatusLabels[currentApproval.status] || currentApproval.status}
                </span>
              )
            )}
          </div>

            {/* Filters Section */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Filters</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="faculty-filter" className="block text-sm font-medium text-slate-700 mb-2">Faculty Member</label>
                  <SimpleSelector
                    id="faculty-filter"
                    value={selectedFaculty}
                    onChange={setSelectedFaculty}
                    options={facultyOptions}
                    placeholder="Select a faculty member"
                    searchable={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="year-filter" className="block text-sm font-medium text-slate-700 mb-2">Academic Year</label>
                    <SimpleSelector
                      id="year-filter"
                      value={selectedYearPage2}
                      onChange={(value) => {
                        setSelectedYearPage2(value);
                        setSelectedSectionPage2('');
                      }}
                      options={availableYearsPage2.map(year => ({ value: year, label: year }))}
                      placeholder="Select year"
                      disabled={!selectedFaculty || availableYearsPage2.length === 0}
                    />
                  </div>

                  <div>
                    <label htmlFor="section-filter" className="block text-sm font-medium text-slate-700 mb-2">Section</label>
                    <SimpleSelector
                      id="section-filter"
                      value={selectedSectionPage2}
                      onChange={(value) => setSelectedSectionPage2(value)}
                      options={availableSectionsPage2.map(section => ({ value: section, label: section }))}
                      placeholder="Select section"
                      disabled={!selectedYearPage2 || availableSectionsPage2.length === 0}
                    />
                  </div>
                </div>
                {!currentApproval?.archived_at && currentApproval?.status === 'dean_rejected' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 rounded-lg bg-amber-100 p-2">
                        <AlertCircle className="text-amber-600" size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                          Comment from Dean
                        </p>
                        <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                          {latestDeanComment?.comment || 'No comment provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!currentApproval?.archived_at && currentApproval?.status === 'cd_rejected' && (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 rounded-lg bg-sky-100 p-2">
                        <AlertCircle className="text-sky-600" size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                          Comment from Campus Director
                        </p>
                        <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                          {latestCampusDirectorComment?.comment || 'No comment provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'approved' ? (
          <>
            {/* Approved Reports Tab Content */}
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Approved Reports</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2">View reports that have been approved by the Dean and Campus Director.</p>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-md">
                <label htmlFor="approved-search" className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <input
                  id="approved-search"
                  value={approvedSearch}
                  onChange={(e) => setApprovedSearch(e.target.value)}
                  placeholder="Search by faculty, degree, year, or section"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>

              <div className="w-full sm:w-56">
                <label htmlFor="approved-sort" className="block text-sm font-medium text-slate-700 mb-2">Sort</label>
                <select
                  id="approved-sort"
                  value={approvedSort}
                  onChange={(e) => setApprovedSort(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                >
                  <option value="newest">Newest approved</option>
                  <option value="oldest">Oldest approved</option>
                  <option value="name_az">Faculty name A–Z</option>
                  <option value="name_za">Faculty name Z–A</option>
                </select>
              </div>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{approvedRequestsDisplay.length}</span> report{approvedRequestsDisplay.length === 1 ? '' : 's'}
            </div>

            {approvedRequestsDisplay.length > 0 ? (
              <div className="space-y-3">
                {approvedRequestsDisplay.map((req) => {
                  const payload = req?.report_payload || {};
                  const page2Meta = payload.page2Meta || {};
                  const approvedAt = req.approved_at || req.updated_at || req.created_at;
                  const approvedAtDate = approvedAt ? new Date(approvedAt) : null;
                  const approvedAtLabel = approvedAtDate
                    ? approvedAtDate.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : null;
                  const approvedRelative = approvedAtDate ? getRelativeTimeLabel(approvedAtDate) : null;

                  const chipDegree = page2Meta.degree;
                  const chipYear = page2Meta.year ? `${page2Meta.year}` : '';
                  return (
                    <div key={req.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-900 truncate">{payload.facultyLabel || 'Report'}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {chipDegree ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {chipDegree}
                                </span>
                              ) : null}
                              {chipYear ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {chipYear}
                                </span>
                              ) : null}
                            </div>
                            {approvedAtLabel && (
                              <p className="text-xs text-slate-500 mt-2">
                                Approved on {approvedAtLabel}
                                {approvedRelative ? ` (${approvedRelative})` : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Approved
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleArchiveApprovedRequest(req.id)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 w-full sm:w-auto"
                          >
                            Archive
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApprovedPreviewRequest(req);
                              setApprovedPreviewPage(1);
                              setIsApprovedPreviewMode(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center text-sm text-slate-600">
                No matching approved reports.
              </div>
            )}
          </>
        ) : (
          <>
            {/* Archived Reports Tab Content */}
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Archived Reports</h1>
              <p className="text-sm sm:text-base text-slate-600 mt-2">View reports you archived after the semester ended. You can restore them to the Approved tab.</p>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-md">
                <label htmlFor="approved-search" className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <input
                  id="approved-search"
                  value={approvedSearch}
                  onChange={(e) => setApprovedSearch(e.target.value)}
                  placeholder="Search by faculty, degree, year, or section"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>

              <div className="w-full sm:w-56">
                <label htmlFor="approved-sort" className="block text-sm font-medium text-slate-700 mb-2">Sort</label>
                <select
                  id="approved-sort"
                  value={approvedSort}
                  onChange={(e) => setApprovedSort(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                >
                  <option value="newest">Newest approved</option>
                  <option value="oldest">Oldest approved</option>
                  <option value="name_az">Faculty name A–Z</option>
                  <option value="name_za">Faculty name Z–A</option>
                </select>
              </div>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{archivedRequestsDisplay.length}</span> report{archivedRequestsDisplay.length === 1 ? '' : 's'}
            </div>

            {archivedRequestsDisplay.length > 0 ? (
              <div className="space-y-3">
                {archivedRequestsDisplay.map((req) => {
                  const payload = req?.report_payload || {};
                  const page2Meta = payload.page2Meta || {};
                  const approvedAt = req.approved_at || req.updated_at || req.created_at;
                  const approvedAtDate = approvedAt ? new Date(approvedAt) : null;
                  const approvedAtLabel = approvedAtDate
                    ? approvedAtDate.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : null;

                  const chipDegree = page2Meta.degree;
                  const chipYear = page2Meta.year ? `${page2Meta.year}` : '';
                  const approvedRelative = approvedAtDate ? getRelativeTimeLabel(approvedAtDate) : null;
                  const archivedAtDate = req.archived_at ? new Date(req.archived_at) : null;
                  const archivedAtLabel = archivedAtDate
                    ? archivedAtDate.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : null;
                  const archivedRelative = archivedAtDate ? getRelativeTimeLabel(archivedAtDate) : null;

                  return (
                    <div key={req.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-900 truncate">{payload.facultyLabel || 'Report'}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {chipDegree ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {chipDegree}
                                </span>
                              ) : null}
                              {chipYear ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  {chipYear}
                                </span>
                              ) : null}
                            </div>
                            {approvedAtLabel && (
                              <p className="text-xs text-slate-500 mt-2">
                                Approved on {approvedAtLabel}
                                {approvedRelative ? ` (${approvedRelative})` : ''}
                              </p>
                            )}
                            {archivedAtLabel && (
                              <p className="text-xs text-slate-500 mt-1">
                                Archived on {archivedAtLabel}
                                {archivedRelative ? ` (${archivedRelative})` : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-800 border border-slate-200 whitespace-nowrap">
                              Archived
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleRestoreArchivedRequest(req.id)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 w-full sm:w-auto"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApprovedPreviewRequest(req);
                              setApprovedPreviewPage(1);
                              setIsApprovedPreviewMode(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center text-sm text-slate-600">
                No matching archived reports.
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <div className="report-avoid-break">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0">
            <img src={ctuLogo} alt="CTU Logo" className="h-14 w-auto sm:h-20" />
            <div className="text-center leading-tight flex-shrink-0 px-0">
              <p className="text-[10px] sm:text-[12px]">Republic of the Philippines</p>
              <p className="text-[13px] sm:text-[16px] font-semibold">CEBU TECHNOLOGICAL UNIVERSITY</p>
              <p className="text-[10px] sm:text-[12px] font-semibold">CONSOLACION CAMPUS</p>
              <p className="text-[9px] sm:text-[11px]">Gov. F. B. Harrison Ave., Nangka, Consolacion, Cebu, Philippines</p>
              <p className="text-[9px] sm:text-[11px]">Website: http://www.ctu.edu.ph  E-mail: cduconsolacion@ctu.edu.ph</p>
              <p className="text-[10px] sm:text-[12px] font-semibold">COLLEGE OF COMPUTING, BUSINESS, AND MANAGEMENT</p>
            </div>
            <img src={bagongPilipinasLogo} alt="Bagong Pilipinas Logo" className="h-14 w-auto sm:h-20" />
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

      {activeTab === 'active'
        ? (!selectedFaculty ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-16 text-center">
              <Eye size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Select a Faculty Member</h3>
              <p className="text-slate-600 mt-2">Choose a faculty member from the filters above to view their active schedules</p>
            </div>
          ) : filteredSchedulesPage2.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 md:p-16 text-center">
              <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No Active Schedules Found</h3>
              <p className="text-slate-600 mt-2">{selectedYearPage2 && selectedSectionPage2 ? 'There are no active schedules for the selected faculty, year, and section.' : 'There are no active schedules for the selected faculty member.'}</p>
            </div>
          ) : (
            <div className="hidden print:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto print:shadow-none print:border-none">
              <div className="report-timetable">
                <WeeklyTimetable schedules={filteredSchedulesPage2} programHeadData={{}} showLegend={false} showCourseInfo={false} showYearPrefix={false} printCompact={true} highlightApprovedOnly={true} />
              </div>

              <div className="px-2 pt-2 report-avoid-break report-summary">
                <div className="border-t-2 border-black pt-2">
                  <table className="w-full text-[12px]">
                  <thead>
                    <tr>
                      <th colSpan={3} className="text-center font-bold py-1">SUMMARY OF COURSES</th>
                    </tr>
                    <tr className="border-b border-black">
                      <th className="text-left font-bold py-1">Course code</th>
                      <th className="text-center font-bold py-1">Descriptive Title</th>
                      <th className="text-right font-bold py-1">Degree/Yr/Sec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row, idx) => (
                      <tr key={`${row.courseCode}-${row.degreeYrSec}-${idx}`}>
                        <td className="py-0 pr-2">{row.courseCode}</td>
                        <td className="py-0 px-2 text-center">{row.descriptiveTitle}</td>
                        <td className="py-0 pl-2 text-right">{row.degreeYrSec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-10 text-[12px]">
                  <div className="space-y-1">
                    <div className="flex items-end gap-2">
                      <span className="w-24 md:w-32">No. of Preparations:</span>
                      <span className="flex-1 border-b border-black font-semibold">{summaryTotals.preparations}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="w-24 md:w-32">No. of Units:</span>
                      <span className="flex-1 border-b border-black font-semibold">{summaryTotals.units}</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="w-24 md:w-32">No. of Hours/Week:</span>
                      <span className="flex-1 border-b border-black font-semibold">{Number.isFinite(summaryTotals.hoursPerWeek) ? summaryTotals.hoursPerWeek : 0}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-end gap-2">
                      <span className="w-28 md:w-40">Administrative Designation:</span>
                      <span className="flex-1 border-b border-black"></span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="w-28 md:w-40">Production:</span>
                      <span className="flex-1 border-b border-black"></span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="w-28 md:w-40">Extension:</span>
                      <span className="flex-1 border-b border-black"></span>
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="w-28 md:w-40">Research:</span>
                      <span className="flex-1 border-b border-black"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden print:block px-2 pt-1 mt-2 report-avoid-break report-signature">
              <div className="grid grid-cols-3 text-[12px] font-semibold">
                <div className="text-center">Prepared by:</div>
                <div className="text-center">Reviewed, Certified True and Correct:</div>
                <div className="text-center">Approved:</div>
              </div>

              <div className="mt-1 grid grid-cols-3">
                <div className="text-center">
                  <p className="text-[12px] font-bold">{programHeadName}</p>
                  <div className="mx-auto h-7 w-44 border-b border-black flex items-end justify-center overflow-hidden">
                  </div>
                  <p className="text-[12px] font-bold">Program Coordinator</p>
                </div>

                <div className="text-center">
                  <p className="text-[12px] font-bold">{deanName}</p>
                  <div className="mx-auto h-7 w-44 border-b border-black flex items-end justify-center overflow-hidden">
                  </div>
                  <p className="text-[12px]">College Dean</p>
                </div>

                <div className="text-center">
                  <p className="text-[12px] font-bold">{campusDirectorName}</p>
                  <div className="mx-auto h-7 w-44 border-b border-black flex items-end justify-center overflow-hidden">
                  </div>
                  <p className="text-[12px]">Campus Director</p>
                </div>
              </div>

              <div className="mt-2 flex justify-center">
                <img src={ctuCcFormat} alt="CTU CC Format" className="max-w-full max-h-10 h-auto object-contain" />
              </div>
            </div>
          </div>
        ))
        : null}
      </div>

    </>
  );
}

export default Reports;
