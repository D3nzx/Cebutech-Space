import React, { useMemo, useState, useEffect } from "react";
import { getCourses, createCourse, updateCourse, deleteCourse, searchCourses, checkCourseExists, getColleges } from "../../../api/courses";
import Modal from "./Modal";
import ErrorModal from "./ErrorModal";
import SuccessModal from "./SuccessModal";
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";

function CourseList() {
  // State for courses data
  const [courses, setCourses] = useState([]); // full list
  const [searchedCourses, setSearchedCourses] = useState([]); // search results
  const [colleges, setColleges] = useState([]); // colleges list
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  
  // Handler to allow only letters and spaces in course name
  const handleCourseNameChange = (e) => {
    const value = e.target.value;
    // Only allow letters and spaces
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setCourseName(value);
      setFormErrors((prev) => ({ ...prev, courseName: "" }));
    }
  };

  // Handler for course code (alphanumeric and hyphens)
  const handleCourseCodeChange = (e) => {
    const value = e.target.value;
    // Allow letters, numbers, and hyphens
    if (/^[a-zA-Z0-9\-]*$/.test(value)) {
      setCourseCode(value);
      setFormErrors((prev) => ({ ...prev, courseCode: "" }));
    }
  };

  const [courseDescription, setCourseDescription] = useState("");
  const handleDescriptionChange = (e) => {
    setCourseDescription(e.target.value);
    setFormErrors((prev) => ({ ...prev, courseDescription: "" }));
  };
  const [collegeId, setCollegeId] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [editingId, setEditingId] = useState(null);
  
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

  // Load courses and colleges on component mount
  useEffect(() => {
    loadColleges();
    loadCourses();
  }, []);

  // Load colleges from Supabase
  const loadColleges = async () => {
    try {
      const { data, error } = await getColleges();
      if (error) {
        console.error("❌ Error loading colleges:", error);
        setError(`Failed to load colleges: ${error.message || error}`);
      } else {
        console.log("✅ Colleges loaded successfully:", data);
        setColleges(data || []);
        if (!data || data.length === 0) {
          console.warn("⚠️ No colleges found in database. Make sure colleges table is populated.");
        }
      }
    } catch (err) {
      console.error("❌ Exception loading colleges:", err);
      setError(`Exception loading colleges: ${err.message}`);
    }
  };

  // Load courses from Supabase
  const loadCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await getCourses();
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setCourses(data || []);
        setSearchedCourses(data || []);
      }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses by course_code only
  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((c) =>
      (c.course_code ?? '').toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const pagedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const isFormInvalid = !courseName.trim() || !courseDescription.trim() || !collegeId || loading;

  // Reset form
  const resetForm = () => {
    setCourseName("");
    setCourseCode("");
    setCourseDescription("");
    setCollegeId("");
    setCollegeName("");
    setEditingId(null);
    setFormErrors({});
  };

  // Handle save/create course
  const handleSave = async (e) => {
    e.preventDefault();
    const validationErrors = {};

    if (!courseName.trim()) {
      validationErrors.courseName = "Program name is required.";
    }

    if (!courseDescription.trim()) {
      validationErrors.courseDescription = "Program description is required.";
    }

    if (!collegeId) {
      validationErrors.college = "College is required.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});

    setLoading(true);
    try {
      // Check for duplicate course name
      const { exists, error: checkError } = await checkCourseExists(courseName.trim(), editingId);
      
      if (checkError) {
        setError(checkError);
        setShowErrorModal(true);
        return;
      }
      
      if (exists) {
        setModalData({ courseName: courseName.trim() });
        setShowDuplicateModal(true);
        return;
      }

      const courseData = {
        name: courseName.trim(),
        code: courseCode.trim(),
        description: courseDescription.trim(),
        collegeId: collegeId,
        collegeName: collegeName
      };

    if (editingId) {
        const { data, error } = await updateCourse(editingId, courseData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          // Reload all courses to ensure college relationships are properly mapped
          await loadCourses();
          setSuccessMessage("Course updated successfully!");
          setShowFormModal(false);
          resetForm();
          setShowSuccessModal(true);
        }
      } else {
        const { data, error } = await createCourse(courseData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
    } else {
          setCourses(prev => [...prev, data]);
          setSuccessMessage("Course created successfully!");
          setShowFormModal(false);
          resetForm();
          setShowSuccessModal(true);
        }
    }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
  }
  };

  // Handle edit course
  const handleEdit = (course) => {
    setCourseName(course.course_name ?? course.name);
    setCourseCode(course.course_code ?? course.code ?? "");
    setCourseDescription(course.description || "");
    setCollegeId(course.college_id || "");
    setCollegeName(course.college_name || "");
    setEditingId(course.id);
    setShowFormModal(true);
  };

  // Handle new course
  const handleNewCourse = () => {
    resetForm();
    setShowFormModal(true);
  };

  // Handle close form modal
  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  // Handle delete course
  const handleDelete = (course) => {
    setModalData(course);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const { error } = await deleteCourse(modalData.id);
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setCourses(prev => prev.filter(c => c.id !== modalData.id));
        setSuccessMessage("Course deleted successfully!");
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

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (next) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
  };

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleNewCourse}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
        >
          Add New Program
        </button>
      </div>

      {/* Course List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Program Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredCourses.length} program{filteredCourses.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Find by program code..."
                  maxLength={7}
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
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-12">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-32">Program Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">Program Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">College</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">Loading...</td>
                </tr>
              )}
              {!loading && pagedCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No programs found. {searchQuery && 'Try adjusting your search.'}</p>
                  </td>
                </tr>
              )}
              {!loading && pagedCourses.map((course, idx) => (
                <tr key={course.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{course.course_code}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{course.course_name ?? course.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{course.college_name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(course)} 
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Edit program"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(course)} 
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Remove program"
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
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, filteredCourses.length)}</span> of <span className="font-semibold">{filteredCourses.length}</span> entries
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

      {/* Course Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ contain: 'layout' }}>
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
                      {editingId ? 'Edit Program' : 'Add New Program'}
                    </h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">
                      {editingId ? 'Update program information and curriculum details' : 'Create a new program offering for your institution'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: 'layout' }}>
                <div className="space-y-8 pb-4">
                  
                  {/* STEP 1: Program Basics */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Program Name</span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the program name and identifier</p>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Program Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={courseName}
                          onChange={handleCourseNameChange}
                          placeholder="e.g., Bachelor of Science in Data Science, BS Computer Science"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.courseName
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                          autoFocus
                        />
                        {formErrors.courseName && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.courseName}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Official name of the program (letters and spaces only)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Program Code
                        </label>
                        <input
                          type="text"
                          value={courseCode}
                          onChange={handleCourseCodeChange}
                          placeholder="e.g., BS-CS, BS-DS, BA-PS"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.courseCode
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.courseCode && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.courseCode}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Short identifier for the program (letters, numbers, and hyphens)</p>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: College Assignment */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">College Assignment</span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Select the college this program belongs to</p>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          College <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={collegeId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedCollege = colleges.find(c => c.id === selectedId);
                            setCollegeId(selectedId);
                            setCollegeName(selectedCollege?.college_name || "");
                            setFormErrors((prev) => ({ ...prev, college: "" }));
                          }}
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.college
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white"
                          } text-slate-900 font-semibold`}
                          disabled={loading}
                        >
                          <option value="" disabled hidden>Select College</option>
                          {colleges.map((college) => (
                            <option key={college.id} value={college.id}>
                              {college.college_name}
                            </option>
                          ))}
                        </select>
                        {formErrors.college && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.college}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">The department to which this program belongs</p>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Program Description */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 3</span>
                      <span className="text-xs font-semibold">Curriculum Details</span>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Provide detailed information about the program</p>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          value={courseDescription}
                          onChange={handleDescriptionChange}
                          placeholder="Brief description of the program, focus areas, key subjects, career paths, and admission requirements..."
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all resize-none ${
                            formErrors.courseDescription
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.courseDescription && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.courseDescription}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">Include program objectives, specializations, and learning outcomes</p>
                      </div>
                    </div>
                  </div>
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
                  {loading ? 'Saving...' : editingId ? 'Update Program' : 'Create Program'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <h2 className="text-lg font-bold text-white">Remove Program</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Program Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Program Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{modalData.course_name || modalData.name}</p>
                  <p className="text-xs text-slate-600">Code: <span className="font-semibold text-slate-700">{modalData.course_code || '—'}</span></p>
                </div>
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
                <ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
                  <li>All program information will be deleted</li>
                  <li>Associated subject offerings will be removed</li>
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
                {loading ? 'Removing...' : 'Remove Program'}
              </button>
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
          loadCourses();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The program list has been updated."
      />

      {/* Duplicate Course Modal */}
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
                  <h2 className="text-2xl font-bold text-white">Program Exists</h2>
                  <p className="text-amber-100 mt-1 text-sm font-medium">This program name is already in the system</p>
                  <div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">A program with the name <strong className="text-amber-700">"{ modalData.courseName}"</strong> already exists in our system. To maintain accurate records and avoid confusion, we cannot create duplicate programs.</p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">💡 What you can do</p>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Use a different program name with unique characteristics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Edit the existing program if you need to make changes</span>
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
                    const courseInput = document.querySelector('input[placeholder*="Bachelor of Science"]');
                    if (courseInput) courseInput.focus();
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

export default CourseList;
