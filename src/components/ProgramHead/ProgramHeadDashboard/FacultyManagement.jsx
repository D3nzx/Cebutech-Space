import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getFaculty, updateFaculty, deleteFaculty, checkFacultyExists, disableFacultyAccount, enableFacultyAccount } from "../../../api/faculty";
import { getColleges, getCourses } from "../../../api/courses";
import SimpleSelector from "../../SimpleSelector";
import ErrorModal from "./ErrorModal";
import SuccessModal from "./SuccessModal";
import { Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Users, Lock, Unlock } from "lucide-react";

// College and Program options
const COLLEGE_OPTIONS = [
  'College of Education, Arts, and Sciences',
  'College of Technology, Management, and Entrepreneurship',
];

const PROGRAM_OPTIONS_BY_COLLEGE = {
  'College of Technology, Management, and Entrepreneurship': [
    'Bachelor of Science in Business Administration - Financial Management',
    'Bachelor of Science in Hospitality Management',
    'Bachelor of Science in Information Technology',
  ],
  'College of Education, Arts, and Sciences': [
    'Bachelor of Arts in Political Science',
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education - English',
    'Bachelor of Secondary Education - Filipino',
    'Bachelor of Secondary Education - Mathematics',
  ],
};

function FacultyManagement() {
	// Data state
	const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    idNo: "",
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
    contact: "",
		gender: "Male",
		address: "",
		college: "",
		program: "",
	});
	const [editingId, setEditingId] = useState(null);
	const [formErrors, setFormErrors] = useState({});

	// UI state
	const [searchQuery, setSearchQuery] = useState("");
	const [pageSize, setPageSize] = useState(5);
	const [currentPage, setCurrentPage] = useState(1);

	// Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [modalData, setModalData] = useState({});
	const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const { data, error } = await getFaculty();
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
				setFaculty(data || []);
      }
    } catch (err) {
			setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

	const resetForm = () => {
		setFormData({ idNo: "", lastName: "", firstName: "", middleName: "", email: "", contact: "", gender: "Male", address: "", college: "", program: "" });
		setEditingId(null);
		setFormErrors({});
	};

  const filteredFaculty = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return faculty;
		return faculty.filter((f) => (f.id_no ?? "").toLowerCase().includes(q));
	}, [faculty, searchQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredFaculty.length / pageSize));
  const pagedFaculty = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredFaculty.slice(start, start + pageSize);
  }, [filteredFaculty, currentPage, pageSize]);

	const handleCloseFormModal = () => {
		setShowFormModal(false);
		resetForm();
	};

	const handleEdit = (row) => {
    setFormData({
			idNo: row.id_no || "",
			lastName: row.last_name || "",
			firstName: row.first_name || "",
			middleName: row.middle_name || "",
			email: row.email || "",
			contact: row.contact_number || "",
			gender: row.gender || "Male",
			address: row.address || "",
			college: row.college || "",
			program: row.program || "",
		});
		setEditingId(row.id);
		setShowFormModal(true);
	};

  const handleDelete = (row) => {
		setModalData(row);
		setShowDeleteModal(true);
		// Note: Hard delete will cascade to delete all associated schedules
	};

	const handleToggleStatus = async (row) => {
		setLoading(true);
		try {
			const newStatus = !row.is_active;
			const apiCall = newStatus ? enableFacultyAccount : disableFacultyAccount;
			const { data, error } = await apiCall(row.id);
			
			if (error) {
				setError(error);
				setShowErrorModal(true);
			} else {
				// Update local state immediately - real-time subscription will sync any changes
				setFaculty((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_active: newStatus } : f)));
				const statusText = newStatus ? 'enabled' : 'disabled';
				const actionText = newStatus ? 'can now log in' : 'can no longer log in';
				setSuccessMessage(`${row.first_name} ${row.last_name}'s account has been ${statusText}. They ${actionText}.`);
				setShowSuccessModal(true);
			}
		} catch (err) {
			setError(err?.message || "An error occurred while updating the account status");
			setShowErrorModal(true);
		} finally {
			setLoading(false);
		}
	};

	const handlePageChange = useCallback((next) => {
		if (next < 1 || next > totalPages) return;
		setCurrentPage(next);
	}, [totalPages]);

	const handleFormChange = useCallback((field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setFormErrors((prev) => ({ ...prev, [field]: "" }));
	}, []);

	const handleSearch = useCallback((e) => {
		setSearchQuery(e.target.value);
		setCurrentPage(1);
	}, []);	const confirmDelete = async () => {
		setLoading(true);
		setShowDeleteModal(false);
		try {
			console.log('Starting delete for faculty:', modalData);
			const { error } = await deleteFaculty(modalData.id);
			
			if (error) {
				console.error('Delete operation returned error:', error);
				setError(error);
				setShowErrorModal(true);
				setLoading(false);
				return;
			}
			
			console.log('Delete successful, reloading faculty list');
			// Refresh the faculty list from the database to ensure the deletion persisted
			const { data, error: loadError } = await getFaculty();
			if (loadError) {
				console.error('Error loading faculty after delete:', loadError);
				setError(loadError);
				setShowErrorModal(true);
				setLoading(false);
				return;
			}
			
			console.log('Faculty list after delete:', data);
			setFaculty(data || []);
			setSuccessMessage("Faculty deleted successfully!");
			setShowSuccessModal(true);
		} catch (err) {
			console.error('Delete exception:', err);
			setError(err?.message || "An error occurred while deleting the faculty member");
			setShowErrorModal(true);
		} finally {
			setLoading(false);
		}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    if (!formData.lastName.trim()) {
      validationErrors.lastName = "Last name is required.";
    }
    if (!formData.firstName.trim()) {
      validationErrors.firstName = "First name is required.";
    }
    const email = formData.email?.trim();
    if (!email) {
      validationErrors.email = "Email is required.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);
    try {
			const idNo = formData.idNo?.trim();
			const { exists, error: checkErr } = await checkFacultyExists(email, idNo, editingId);
			if (checkErr) {
				setError(checkErr);
				setShowErrorModal(true);
				setLoading(false);
				return;
			}
      if (exists) {
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }
			const payload = { ...formData };
			if (editingId) {
				const { data, error } = await updateFaculty(editingId, payload);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
					if (data) {
						setFaculty((prev) => prev.map((f) => (f.id === editingId ? data : f)));
					} else {
						// If data is null, reload the faculty list to ensure we have the latest data
						await loadFaculty();
					}
          setSuccessMessage("Faculty updated successfully!");
          setShowSuccessModal(true);
          resetForm();
          setShowFormModal(false);
        }
      } else {
        setShowFormModal(false);
      }
    } catch (err) {
			setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="pb-2" />

      {/* Faculty List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Faculty Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredFaculty.length} faculty member{filteredFaculty.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Find by ID no..."
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
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-12">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-32">ID No</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider flex-1">Email</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-slate-600 text-sm">Loading faculty...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pagedFaculty.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No faculty found. {searchQuery && 'Try adjusting your search.'}</p>
                  </td>
                </tr>
              )}
              {!loading && pagedFaculty.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.id_no}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{`${row.last_name}, ${row.first_name} ${row.middle_name || ""}`.trim()}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.email || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <div className="relative group">
                        <button 
                          onClick={() => handleEdit(row)} 
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Edit faculty</div>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleToggleStatus(row)}
                          disabled={loading}
                          className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                            row.is_active
                              ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                              : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                          }`}
                        >
                          {row.is_active ? (
                            <Unlock size={16} />
                          ) : (
                            <Lock size={16} />
                          )}
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">{row.is_active ? 'Disable account' : 'Enable account'}</div>
                      </div>
                      <div className="relative group">
                        <button 
                          onClick={() => handleDelete(row)} 
                          className="inline-flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Remove faculty</div>
                      </div>
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
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, filteredFaculty.length)}</span> of <span className="font-semibold">{filteredFaculty.length}</span> entries
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

      {/* Faculty Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ WebkitOverflowScrolling: 'touch', contain: 'layout' }}>
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6 relative">
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
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/20 flex-shrink-0">
                    <Users size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">
                      {editingId ? 'Edit Faculty' : 'Add New Faculty'}
                    </h2>
                    <p className="text-green-100/90 mt-1 text-xs font-medium">
                      {editingId ? 'Update faculty information and assignment details' : 'Create a new faculty member account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-auto" style={{ scrollBehavior: 'smooth' }}>
                <div className="space-y-8 pb-4">
                  
                  {/* STEP 1: Essential Information */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Essential Info</span>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the faculty member's basic information</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Last Name */}
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleFormChange("lastName", e.target.value)}
                            placeholder="e.g., Santos"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                              formErrors.lastName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                            autoFocus
                          />
                          {formErrors.lastName && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.lastName}</p>
                          )}
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleFormChange("firstName", e.target.value)}
                            placeholder="e.g., Jose"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                              formErrors.firstName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.firstName && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.firstName}</p>
                          )}
                        </div>
                      </div>

                      {/* Middle Name */}
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Middle Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.middleName}
                          onChange={(e) => handleFormChange("middleName", e.target.value)}
                          placeholder="Optional"
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Contact Information */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">Contact Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Provide contact details for the faculty member</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Email */}
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange("email", e.target.value)}
                            placeholder="e.g., jose@university.edu"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                              formErrors.email
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.email && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.email}</p>
                          )}
                        </div>

                        {/* Contact Number */}
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => handleFormChange("contact", e.target.value)}
                            placeholder="e.g., 09XX-XXX-XXXX"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Additional Details */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 3</span>
                      <span className="text-xs font-semibold">Additional Details</span>
                    </div>

                    <div className="space-y-5">
                      {/* ID and Gender in one row */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Faculty Identification</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* ID No */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              ID Number
                            </label>
                            <input
                              type="text"
                              value={formData.idNo}
                              onChange={(e) => handleFormChange("idNo", e.target.value)}
                              placeholder="Auto-generated"
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                              disabled={loading}
                            />
                            <p className="text-xs text-slate-600 mt-2">Leave blank for auto-generation</p>
                          </div>

                          {/* Gender */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              Gender
                            </label>
                            <select
                              value={formData.gender}
                              onChange={(e) => handleFormChange("gender", e.target.value)}
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 font-semibold transition-all"
                              disabled={loading}
                            >
                              <option>Male</option>
                              <option>Female</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* College and Program */}
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200 space-y-4">
                        <p className="text-sm font-bold text-slate-900">College & Program Assignment</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* College */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              College
                            </label>
                            <SimpleSelector
                              options={COLLEGE_OPTIONS.map((college) => ({
                                value: college,
                                label: college,
                              }))}
                              value={formData.college}
                              onChange={(value) => {
                                setFormData((prev) => ({ ...prev, college: value, program: '' }));
                              }}
                              placeholder="Search college..."
                              disabled={loading}
                              searchable={true}
                            />
                            <p className="mt-1 text-xs text-slate-600">
                              Choose the college.
                            </p>
                          </div>

                          {/* Program */}
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              Program
                            </label>
                            <SimpleSelector
                              options={
                                formData.college && PROGRAM_OPTIONS_BY_COLLEGE[formData.college]
                                  ? PROGRAM_OPTIONS_BY_COLLEGE[formData.college].map((program) => ({
                                      value: program,
                                      label: program,
                                    }))
                                  : []
                              }
                              value={formData.program}
                              onChange={(value) => handleFormChange("program", value)}
                              placeholder={formData.college ? "Search program..." : "Select College first"}
                              disabled={loading || !formData.college}
                              searchable={true}
                            />
                            <p className="mt-1 text-xs text-slate-600">
                              Available programs are filtered based on your college.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-300 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Address Information</p>
                        <textarea
                          rows={3}
                          value={formData.address}
                          onChange={(e) => handleFormChange("address", e.target.value)}
                          placeholder="Street address, city, province..."
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none font-semibold transition-all"
                          disabled={loading}
                        />
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
                  disabled={!editingId || !formData.lastName.trim() || !formData.firstName.trim() || !formData.email.trim() || loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:shadow-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Edit2 size={18} />
                  {loading ? 'Saving...' : editingId ? 'Update Faculty' : 'Add Faculty'}
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
                  <h2 className="text-lg font-bold text-white">Remove Faculty</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Faculty Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Faculty Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{`${modalData?.last_name || ''}, ${modalData?.first_name || ''}`.trim()}</p>
                  <p className="text-xs text-slate-600">Email: <span className="font-semibold text-slate-700">{modalData?.email || '—'}</span></p>
                </div>
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
                <ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
                  <li>Faculty member will be removed from the system</li>
                  <li>All teaching assignments will be deleted</li>
                  <li>All related scheduling data will be removed</li>
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
                {loading ? 'Removing...' : 'Remove Faculty'}
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
          loadFaculty();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The faculty list has been updated."
      />

      {/* Duplicate Faculty Modal */}
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
                  <Users size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Duplicate Faculty</h2>
                  <p className="text-amber-100 mt-1 text-sm font-medium">This email or ID already exists</p>
                  <div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">A faculty member with the email <strong className="text-amber-700">{formData.email}</strong> or ID number <strong className="text-amber-700">{formData.idNo || 'Auto-generated'}</strong> already exists. Duplicate entries are not allowed.</p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">How to proceed</p>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Review existing faculty records and update them instead</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Use a different institutional email or ID number</span>
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
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold hover:shadow-lg hover:from-amber-700 hover:to-amber-800 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyManagement;
