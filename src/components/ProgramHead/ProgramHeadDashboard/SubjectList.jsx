import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { getSubjects, createSubject, updateSubject, deleteSubject, checkSubjectExists } from "../../../api/subjects";
import { getCourses, getColleges } from "../../../api/courses";
import { getCourseSubjectOfferings, getOfferingsBySubject, createCourseSubjectOffering, updateCourseSubjectOffering, deactivateCourseSubjectOffering, reactivateCourseSubjectOffering } from "../../../api/courseSubjectOfferings";
import SimpleSelector from "../../SimpleSelector";
import Modal from "./Modal";
import ErrorModal from "./ErrorModal";
import SuccessModal from "./SuccessModal";
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";

function SubjectList() {
  // State for subjects data
  const [subjects, setSubjects] = useState([]); // full list
  const [courses, setCourses] = useState([]); // courses list for dropdown
  const [colleges, setColleges] = useState([]); // colleges list for filtering
  const [loading, setLoading] = useState(false);
  const formContentRef = useRef(null);
 
  const courseOptions = useMemo(() => {
    const list = Array.isArray(courses) ? courses : [];
    const seenKeys = new Set();
    const out = [];

    for (const course of list) {
      const label = (course?.course_name || course?.name || course?.course_code || "").trim();
      if (!label) continue;

      const key = label.toLowerCase();
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      out.push({
        value: course.id,
        label,
      });
    }

    return out;
  }, [courses]);

  useEffect(() => {
    if (!Array.isArray(courses)) return;
    console.log('📚 SubjectList courses raw:', courses.map((c) => ({ id: c?.id, course_name: c?.course_name, course_code: c?.course_code })));
  }, [courses]);

  useEffect(() => {
    console.log('✅ SubjectList courseOptions (deduped by name):', courseOptions.map((o) => ({ value: o?.value, label: o?.label })));
  }, [courseOptions]);
  
  // Form state
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [credits, setCredits] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [enableLEC, setEnableLEC] = useState(true);
  const [enableLAB, setEnableLAB] = useState(false);
  const [lectureUnits, setLectureUnits] = useState("");
  const [labUnits, setLabUnits] = useState("");
  const [contactHours, setContactHours] = useState("");
  const [existingOfferings, setExistingOfferings] = useState([]);
  const [offeringEdits, setOfferingEdits] = useState({});
  const [editingId, setEditingId] = useState(null);

    
  // Handler to allow only letters and spaces in subject name
  const handleSubjectNameChange = useCallback((e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setSubjectName(value);
      setFormErrors((prev) => ({ ...prev, subjectName: "" }));
    }
  }, []);

  // Handler for subject code (alphanumeric and hyphens)
  const handleSubjectCodeChange = useCallback((e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\-]*$/.test(value)) {
      setSubjectCode(value);
      setFormErrors((prev) => ({ ...prev, subjectCode: "" }));
    }
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setSubjectDescription(e.target.value);
    setFormErrors((prev) => ({ ...prev, subjectDescription: "" }));
  }, []);

  const computeExpectedContactHours = useCallback((lecUnitsRaw, labUnitsRaw, lecEnabled, labEnabled) => {
    const lec = lecEnabled ? (lecUnitsRaw === "" ? 0 : Number(lecUnitsRaw)) : 0;
    const lab = labEnabled ? (labUnitsRaw === "" ? 0 : Number(labUnitsRaw)) : 0;
    const lecOk = Number.isFinite(lec) && lec >= 0;
    const labOk = Number.isFinite(lab) && lab >= 0;
    if (!lecOk || !labOk) return "";
    return String(lec * 1 + lab * 3);
  }, []);
  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const groupedOfferings = useMemo(() => {
    const list = Array.isArray(existingOfferings) ? existingOfferings : [];
    if (list.length === 0) return [];

    const byCourse = list.reduce((acc, off) => {
      if (!off.course_id) return acc;
      if (!acc[off.course_id]) {
        acc[off.course_id] = {
          course: off.course,
          LEC: null,
          LAB: null,
        };
      }
      if (off.offering_type === 'LEC') {
        acc[off.course_id].LEC = off;
      } else if (off.offering_type === 'LAB') {
        acc[off.course_id].LAB = off;
      }
      return acc;
    }, {});

    return Object.values(byCourse);
  }, [existingOfferings]);

  useEffect(() => {
    loadSubjects();
    loadCourses();
    loadColleges();
  }, []);

  // Scroll to top of form when modal opens
  useEffect(() => {
    if (showFormModal && formContentRef.current) {
      setTimeout(() => {
        formContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  }, [showFormModal]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await getSubjects();
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setSubjects(data || []);
      }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  
  const handleReactivateOffering = async (offering) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await reactivateCourseSubjectOffering(offering.id);
      if (error) {
        setError(error?.message || String(error));
        setShowErrorModal(true);
        return;
      }

      setExistingOfferings((prev) =>
        (Array.isArray(prev) ? prev : []).map((o) => (o.id === offering.id ? { ...o, is_active: true } : o))
      );

      setSuccessMessage('Program link reactivated successfully.');
      setShowSuccessModal(true);
    } catch (err) {
      setError(err?.message || 'Failed to reactivate program link.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateOffering = async (offering) => {
    if (!offering?.id) return;
    if (!window.confirm('Deactivate this program link? This will hide it from new scheduling for that program.')) {
      return;
    }

    setLoading(true);
    try {
      // Safeguard: block deactivation if used by any schedules
      const { data: usedSchedules, error: usedErr } = await supabase
        .from('schedules')
        .select('id')
        .eq('course_subject_offering_id', offering.id)
        .limit(1);

      if (usedErr) {
        setError(usedErr);
        setShowErrorModal(true);
        return;
      }

      if (Array.isArray(usedSchedules) && usedSchedules.length > 0) {
        setError(new Error('Cannot deactivate: this program link is already used in schedules.'));
        setShowErrorModal(true);
        return;
      }

      const { error: deactErr } = await deactivateCourseSubjectOffering(offering.id);
      if (deactErr) {
        setError(deactErr);
        setShowErrorModal(true);
        return;
      }

      // Update local state
      setExistingOfferings((prev) =>
        Array.isArray(prev)
          ? prev.map((o) => (o.id === offering.id ? { ...o, is_active: false } : o))
          : prev
      );
    } catch (e) {
      setError(e);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const { data, error } = await getCourses();
      if (error) {
        console.error("Error loading courses:", error);
      } else {
        setCourses(data || []);
      }
    } catch (err) {
      console.error("Exception loading courses:", err);
    }
  };

  const loadColleges = async () => {
    try {
      const { data, error } = await getColleges();
      if (error) {
        console.error("Error loading colleges:", error);
      } else {
        setColleges(data || []);
      }
    } catch (err) {
      console.error("Exception loading colleges:", err);
    }
  };

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter((s) =>
      (s.subject_code ?? '').toLowerCase().includes(query)
    );
  }, [subjects, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / pageSize));
  const pagedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  const isFormInvalid = !subjectName.trim() || !subjectDescription.trim() || loading;

  const resetForm = () => {
    setSubjectName("");
    setSubjectCode("");
    setSubjectDescription("");
    setCredits("");
    setSelectedCourseId("");
    setEnableLEC(true);
    setEnableLAB(false);
    setLectureUnits("");
    setLabUnits("");
    setContactHours("");
    setExistingOfferings([]);
    setOfferingEdits({});
    setEditingId(null);

    
    setFormErrors({});
  };

  useEffect(() => {
    const loadExistingOfferings = async () => {
      if (!showFormModal || !editingId) return;
      try {
        const { data, error } = await getOfferingsBySubject(editingId);
        if (error) {
          console.warn('⚠️ Error loading existing offerings:', error);
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setExistingOfferings(list);
        const edits = {};
        for (const off of list) {
          edits[off.id] = {
            lecture_units: off.lecture_units ?? 0,
            lab_units: off.lab_units ?? 0,
            contact_hours: off.contact_hours ?? 0
          };
        }
        setOfferingEdits(edits);
      } catch (e) {
        console.warn('⚠️ Exception loading existing offerings:', e);
      }
    };

    loadExistingOfferings();
  }, [showFormModal, editingId]);

  
  const handleSave = async (e) => {
    e.preventDefault();
    const validationErrors = {};

    if (!subjectName.trim()) {
      validationErrors.subjectName = "Subject name is required.";
    }

    if (!subjectDescription.trim()) {
      validationErrors.subjectDescription = "Subject description is required.";
    }

    // Only validate program+units when creating (not editing)
    if (!editingId && selectedCourseId) {
      if (!enableLEC && !enableLAB) {
        validationErrors.offeringTypes = "Select at least one component type (LEC/LAB).";
      }

      const lecValue = lectureUnits === "" ? null : Number(lectureUnits);
      const labValue = labUnits === "" ? null : Number(labUnits);

      if (enableLEC && (lecValue === null || Number.isNaN(lecValue) || lecValue < 0)) {
        validationErrors.lectureUnits = "Enter a valid LEC units value (0 or more).";
      }
      if (enableLAB && (labValue === null || Number.isNaN(labValue) || labValue < 0)) {
        validationErrors.labUnits = "Enter a valid LAB units value (0 or more).";
      }
    }


    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);
    try {
      const { exists, error: checkError } = await checkSubjectExists(subjectName.trim(), editingId);
      if (checkError) {
        setError(checkError);
        setShowErrorModal(true);
        return;
      }
      if (exists) {
        setModalData({ subjectName: subjectName.trim() });
        setShowDuplicateModal(true);
        return;
      }
      const subjectData = {
        subject_name: subjectName.trim(),
        subject_code: subjectCode.trim() || null,
        description: subjectDescription.trim(),
        credits: credits ? parseInt(credits, 10) : null
      };
      if (editingId) {
        const { data, error } = await updateSubject(editingId, subjectData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          // Option 1: update units only for existing program links
          if (Array.isArray(existingOfferings) && existingOfferings.length > 0) {
            for (const off of existingOfferings) {
              const edits = offeringEdits?.[off.id];
              if (!edits) continue;

              const lec = Number(edits.lecture_units);
              const lab = Number(edits.lab_units);
              const ch = Number(edits.contact_hours);

              if (Number.isNaN(lec) || lec < 0 || Number.isNaN(lab) || lab < 0 || Number.isNaN(ch) || ch < 0) {
                setError(new Error('Please enter valid units/contact hours (0 or more).'));
                setShowErrorModal(true);
                break;
              }

              const { error: updateErr } = await updateCourseSubjectOffering(off.id, {
                lecture_units: lec,
                lab_units: lab,
                contact_hours: ch
              });
              if (updateErr) {
                console.error('❌ Error updating course subject offering:', updateErr);
                setError(updateErr);
                setShowErrorModal(true);
                break;
              }
            }
          }

          setSubjects(prev => prev.map(s => s.id === editingId ? data : s));
          setSuccessMessage("Subject updated successfully!");
          setShowFormModal(false);
          setShowSuccessModal(true);
        }
      } else {
        const { data, error } = await createSubject(subjectData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          // Optionally create course_subject_offerings to link this subject to a program with units
          if (selectedCourseId) {
            const lecValue = lectureUnits === "" ? 0 : Number(lectureUnits);
            const labValue = labUnits === "" ? 0 : Number(labUnits);

            const offeringsToCreate = [];
            if (enableLEC) {
              offeringsToCreate.push({
                course_id: selectedCourseId,
                subject_id: data.id,
                offering_type: 'LEC',
                lecture_units: lecValue,
                lab_units: 0,
                contact_hours: lecValue * 1
              });
            }
            if (enableLAB) {
              offeringsToCreate.push({
                course_id: selectedCourseId,
                subject_id: data.id,
                offering_type: 'LAB',
                lecture_units: 0,
                lab_units: labValue,
                contact_hours: labValue * 3
              });
            }

            for (const off of offeringsToCreate) {
              const { error: offeringError } = await createCourseSubjectOffering(off);
              if (offeringError) {
                console.error('❌ Error creating course subject offering:', offeringError);
                setError(offeringError);
                setShowErrorModal(true);
                break;
              }
            }
          }

          setSubjects(prev => [...prev, data]);
          setSuccessMessage("Subject created successfully!");
          setShowFormModal(false);
          setShowSuccessModal(true);
        }
      }
      resetForm();
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject) => {
    setSubjectName(subject.subject_name);
    setSubjectCode(subject.subject_code || "");
    setSubjectDescription(subject.description || "");
    setCredits(subject.credits ? subject.credits.toString() : "");
    setSelectedCourseId("");
    setEnableLEC(true);
    setEnableLAB(false);
    setLectureUnits("");
    setLabUnits("");
    setContactHours("");
    setExistingOfferings([]);
    setOfferingEdits({});
    setEditingId(subject.id);
    setShowFormModal(true);
  };

  const handleNewSubject = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleDelete = (subject) => {
    setModalData(subject);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const { error } = await deleteSubject(modalData.id);
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setSubjects(prev => prev.filter(s => s.id !== modalData.id));
        setSuccessMessage("Subject deleted successfully!");
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((next) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
  }, [totalPages]);

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleNewSubject}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
        >
          Add New Subject
        </button>
      </div>

      {/* Subject List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Subject Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Find by subject code..."
                  className="w-full md:w-64 pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>Show {n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-32">Subject Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">Subject Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">Description</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-slate-600 text-sm">Loading subjects...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pagedSubjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No subjects found. {searchQuery && 'Try adjusting your search.'}</p>
                  </td>
                </tr>
              )}
              {!loading && pagedSubjects.map((subject, idx) => (
                <tr key={subject.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{subject.subject_code || '—'}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{subject.subject_name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 line-clamp-2">{subject.description || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(subject)} 
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Edit subject"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(subject)} 
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Remove subject"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, filteredSubjects.length)}</span> of <span className="font-semibold">{filteredSubjects.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1 || loading} 
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-medium">{currentPage} / {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages || loading} 
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Subject Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ WebkitOverflowScrolling: 'touch', contain: 'layout' }}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 relative">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-16 pointer-events-none"></div>

                {/* Close Button */}
                <button
                  onClick={handleCloseFormModal}
                  className="absolute right-4 top-4 z-10 p-2 bg-white hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <X size={20} className="text-slate-900" />
                </button>

                {/* Header Content */}
                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl border border-white/20 flex-shrink-0">
                    <BookOpen size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">
                      {editingId ? 'Edit Subject' : 'Add New Subject'}
                    </h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">
                      {editingId ? 'Update subject information and curriculum details' : 'Create a new subject for your institution'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" ref={formContentRef} style={{ contain: 'layout' }}>
                <div className="space-y-8 pb-4">
                  
                  {/* STEP 1: Subject Details */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Subject Details</span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the subject name, code, and credits</p>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Subject Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subjectName}
                          onChange={handleSubjectNameChange}
                          placeholder="e.g., Calculus I, Data Structures"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                            formErrors.subjectName
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.subjectName && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.subjectName}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Use only letters and spaces</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Subject Code
                          </label>
                          <input
                            type="text"
                            value={subjectCode}
                            onChange={handleSubjectCodeChange}
                            placeholder="e.g., CS101, MATH201"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                              formErrors.subjectCode
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          <p className="text-xs text-slate-600 mt-2">Alphanumeric code (optional)</p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Credits
                          </label>
                          <input
                            type="number"
                            value={credits}
                            onChange={(e) => setCredits(e.target.value)}
                            placeholder="e.g., 3"
                            min="0"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                            disabled={loading}
                          />
                          <p className="text-xs text-slate-600 mt-2">Number of credit units (optional)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Description */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">Description</span>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter subject description</p>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          value={subjectDescription}
                          onChange={handleDescriptionChange}
                          placeholder="Brief description of the subject, topics covered, learning objectives, and prerequisites..."
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all resize-none ${
                            formErrors.subjectDescription
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.subjectDescription && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.subjectDescription}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Include learning outcomes, key topics, and course requirements</p>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Program & Units */}
                  {!editingId && (
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        <span className="text-xs font-bold">STEP 3</span>
                        <span className="text-xs font-semibold">Program & Units</span>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                        <p className="text-xs text-slate-600 font-medium">Optional: link this subject to a program and set units</p>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Program (Course)
                          </label>
                          <SimpleSelector
                            options={courseOptions}
                            value={selectedCourseId}
                            onChange={(value) => {
                              setSelectedCourseId(value || "");
                              setFormErrors((prev) => ({ ...prev, offeringTypes: "", lectureUnits: "", labUnits: "", contactHours: "" }));
                            }}
                            placeholder="Search program (optional)"
                            disabled={loading}
                            searchable={true}
                          />
                          <p className="text-xs text-slate-600 mt-2">If you select a program, this subject will become available for scheduling under that program.</p>
                        </div>

                        {selectedCourseId && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-900 mb-2">
                                Component Types
                              </label>
                              <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={enableLEC}
                                    onChange={(e) => {
                                      setEnableLEC(e.target.checked);
                                      setFormErrors((prev) => ({ ...prev, offeringTypes: '', lectureUnits: '' }));
                                    }}
                                  />
                                  LEC
                                </label>
                                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={enableLAB}
                                    onChange={(e) => {
                                      setEnableLAB(e.target.checked);
                                      setFormErrors((prev) => ({ ...prev, offeringTypes: '', labUnits: '' }));
                                    }}
                                  />
                                  LAB
                                </label>
                              </div>
                              {formErrors.offeringTypes && (
                                <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.offeringTypes}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">LEC Units</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={lectureUnits}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setLectureUnits(next);
                                    setContactHours(computeExpectedContactHours(next, labUnits, enableLEC, enableLAB));
                                    setFormErrors((prev) => ({ ...prev, lectureUnits: '' }));
                                  }}
                                  disabled={!enableLEC || loading}
                                  placeholder="e.g., 3"
                                  className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                                    formErrors.lectureUnits
                                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                  } text-slate-900 placeholder-slate-400 font-semibold`}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">LEC Contact Hours</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={enableLEC ? (lectureUnits === "" ? "" : String(Number(lectureUnits) * 1)) : ""}
                                  onChange={() => {}}
                                  readOnly
                                  disabled={loading || !enableLEC}
                                  placeholder="e.g., 3"
                                  className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">LAB Units</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={labUnits}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    setLabUnits(next);
                                    setContactHours(computeExpectedContactHours(lectureUnits, next, enableLEC, enableLAB));
                                    setFormErrors((prev) => ({ ...prev, labUnits: '' }));
                                  }}
                                  disabled={!enableLAB || loading}
                                  placeholder="e.g., 1"
                                  className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                                    formErrors.labUnits
                                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                                  } text-slate-900 placeholder-slate-400 font-semibold`}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2">LAB Contact Hours</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={enableLAB ? (labUnits === "" ? "" : String(Number(labUnits) * 3)) : ""}
                                  onChange={() => {}}
                                  readOnly
                                  disabled={loading || !enableLAB}
                                  placeholder="e.g., 3"
                                  className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Program Links & Units (Edit) */}
                  {editingId && (
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        <span className="text-xs font-bold">STEP 3</span>
                        <span className="text-xs font-semibold">Program Links & Units</span>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                        <p className="text-xs text-slate-600 font-medium">Edit units for existing program links (cannot add/remove programs here)</p>

                        {groupedOfferings.length > 0 ? (
                          <div className="space-y-3">
                            {groupedOfferings.map((group) => (
                              <div key={group.course.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {group.course?.course_name || 'Program'}
                                  </p>
                                </div>

                                <div className="space-y-4">
                                  {/* LEC Offering */}
                                  {group.LEC && (
                                    <div className="border-l-4 border-blue-500 pl-4 py-2">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-xs text-slate-600 font-semibold">Type: LEC</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${group.LEC.is_active === false ? 'bg-slate-200 text-slate-700' : 'bg-emerald-200 text-emerald-800'}`}>
                                            {group.LEC.is_active === false ? 'Inactive' : 'Active'}
                                          </span>
                                          <button type="button" onClick={() => handleReactivateOffering(group.LEC)} disabled={loading || group.LEC.is_active !== false} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">Reactivate</button>
                                          <button type="button" onClick={() => handleDeactivateOffering(group.LEC)} disabled={loading || group.LEC.is_active === false} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Deactivate</button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">LEC Units</label>
                                          <input type="number" min="0" value={offeringEdits?.[group.LEC.id]?.lecture_units ?? 0} onChange={(e) => setOfferingEdits(prev => ({ ...prev, [group.LEC.id]: { ...(prev?.[group.LEC.id] || {}), lecture_units: e.target.value } }))} disabled={loading || group.LEC.is_active === false} className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 font-semibold" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Contact Hours</label>
                                          <input type="number" min="0" value={offeringEdits?.[group.LEC.id]?.contact_hours ?? 0} onChange={(e) => setOfferingEdits(prev => ({ ...prev, [group.LEC.id]: { ...(prev?.[group.LEC.id] || {}), contact_hours: e.target.value } }))} disabled={loading || group.LEC.is_active === false} className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 font-semibold" />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* LAB Offering */}
                                  {group.LAB && (
                                    <div className="border-l-4 border-amber-500 pl-4 py-2">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-xs text-slate-600 font-semibold">Type: LAB</p>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${group.LAB.is_active === false ? 'bg-slate-200 text-slate-700' : 'bg-emerald-200 text-emerald-800'}`}>
                                            {group.LAB.is_active === false ? 'Inactive' : 'Active'}
                                          </span>
                                          <button type="button" onClick={() => handleReactivateOffering(group.LAB)} disabled={loading || group.LAB.is_active !== false} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">Reactivate</button>
                                          <button type="button" onClick={() => handleDeactivateOffering(group.LAB)} disabled={loading || group.LAB.is_active === false} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Deactivate</button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">LAB Units</label>
                                          <input type="number" min="0" value={offeringEdits?.[group.LAB.id]?.lab_units ?? 0} onChange={(e) => setOfferingEdits(prev => ({ ...prev, [group.LAB.id]: { ...(prev?.[group.LAB.id] || {}), lab_units: e.target.value } }))} disabled={loading || group.LAB.is_active === false} className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 font-semibold" />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Contact Hours</label>
                                          <input type="number" min="0" value={offeringEdits?.[group.LAB.id]?.contact_hours ?? 0} onChange={(e) => setOfferingEdits(prev => ({ ...prev, [group.LAB.id]: { ...(prev?.[group.LAB.id] || {}), contact_hours: e.target.value } }))} disabled={loading || group.LAB.is_active === false} className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 font-semibold" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-xs text-amber-800 font-semibold">
                              This subject is not linked to any program yet. Create the program link when adding a new subject (Step 3).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </form>

              {/* Fixed Footer with Action Buttons */}
              <div className="flex-shrink-0 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseFormModal}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={isFormInvalid}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Plus size={18} />
                  {loading ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={error}
        onRetry={() => {
          setShowErrorModal(false);
          loadSubjects();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The subject list has been updated."
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Remove Subject</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Subject Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Subject Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{modalData.subject_name}</p>
                  <p className="text-xs text-slate-600">Code: <span className="font-semibold text-slate-700">{modalData.subject_code || '—'}</span></p>
                </div>
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
                <ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
                  <li>All subject information will be deleted</li>
                  <li>Associated course offerings will be removed</li>
                  <li>All related scheduling data will be deleted</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:shadow-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={16} />
                {loading ? 'Removing...' : 'Remove Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Subject Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setShowDuplicateModal(false)}></div>
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
            {/* Close Button */}
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
                  <BookOpen size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Subject Exists</h2>
                  <p className="text-amber-100 mt-1 text-sm font-medium">This subject name is already in the system</p>
                  <div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">A subject with the name <strong className="text-amber-700">"{modalData.subjectName}"</strong> already exists in our system. To maintain accurate records and avoid confusion, we cannot create duplicate subjects.</p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">💡 What you can do</p>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Use a different subject name with unique characteristics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Edit the existing subject if you need to make changes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-200 bg-slate-50/50 px-8 py-4">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setTimeout(() => {
                    const subjectInput = document.querySelector('input[placeholder*="Calculus"]');
                    if (subjectInput) subjectInput.focus();
                  }, 100);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold hover:shadow-lg hover:from-amber-700 hover:to-amber-800 transition-all"
              >
                <Edit2 size={18} />
                Try Different Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubjectList;
