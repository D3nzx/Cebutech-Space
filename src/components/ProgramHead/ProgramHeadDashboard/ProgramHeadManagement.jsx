import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Search, ChevronLeft, ChevronRight, Users, Edit2, Trash2, X, Plus, UserCheck, Mail, Hash, Lock, Unlock } from "lucide-react";
import { disableProgramHeadAccount, enableProgramHeadAccount } from "../../../api/programHeads";
import SimpleSelector from "../../SimpleSelector";
import SuccessModal from "./SuccessModal";
import ErrorModal from "./ErrorModal";

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

function ProgramHeadManagement() {
  const [programHeads, setProgramHeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    programHeadCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    college: "",
    program: "",
    gender: "",
    contactNumber: "",
    address: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const loadProgramHeads = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("program_heads")
          .select("id, program_head_code, first_name, middle_name, last_name, email, college, program, gender, contact_number, address, is_active, created_at")
          .order("created_at", { ascending: false });

        console.log("Supabase Response:", { data, fetchError });

        if (fetchError) {
          setError(fetchError.message || "Failed to load program heads.");
        } else {
          setProgramHeads(data || []);
        }
      } catch (err) {
        console.error("Error loading program heads:", err);
        setError(err.message || "Unexpected error loading program heads.");
      } finally {
        setLoading(false);
      }
    };

    loadProgramHeads();
  }, []);

  const filteredProgramHeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return programHeads;
    return programHeads.filter((ph) => {
      const fullName = `${ph.first_name || ""} ${ph.middle_name || ""} ${ph.last_name || ""}`.toLowerCase();
      const code = (ph.program_head_code ?? "").toLowerCase();
      const email = (ph.email ?? "").toLowerCase();
      return code.includes(q) || fullName.includes(q) || email.includes(q);
    });
  }, [programHeads, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProgramHeads.length / pageSize));

  const pagedProgramHeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProgramHeads.slice(start, start + pageSize);
  }, [filteredProgramHeads, currentPage, pageSize]);

  const handlePageChange = useCallback((next) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
  }, [totalPages]);

  const resetForm = () => {
    setFormData({ programHeadCode: "", firstName: "", middleName: "", lastName: "", email: "", college: "", program: "", gender: "", contactNumber: "", address: "" });
    setEditingId(null);
    setFormErrors({});
  };

  const handleEdit = (row) => {
    setFormData({
      programHeadCode: row.program_head_code || "",
      firstName: row.first_name || "",
      middleName: row.middle_name || "",
      lastName: row.last_name || "",
      email: row.email || "",
      college: row.college || "",
      program: row.program || "",
      gender: row.gender || "",
      contactNumber: row.contact_number || "",
      address: row.address || "",
    });
    setEditingId(row.id);
    setShowFormModal(true);
  };

  const handleDelete = (row) => {
    setModalData(row);
    setShowDeleteModal(true);
  };

  const handleToggleStatus = async (row) => {
    setLoading(true);
    try {
      const newStatus = !row.is_active;
      const apiCall = newStatus ? enableProgramHeadAccount : disableProgramHeadAccount;
      const { data, error } = await apiCall(row.id);
      
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setProgramHeads((prev) => prev.map((ph) => (ph.id === row.id ? { ...ph, is_active: newStatus } : ph)));
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

  const confirmDelete = async () => {
    setLoading(true);
    setShowDeleteModal(false);
    try {
      const { error } = await supabase
        .from("program_heads")
        .delete()
        .eq("id", modalData.id);

      if (error) {
        setError(error.message || "Failed to delete program head.");
      } else {
        setProgramHeads((prev) => prev.filter((ph) => ph.id !== modalData.id));
        setSuccessMessage("Program head deleted successfully!");
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(err.message || "An error occurred while deleting the program head.");
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
      if (editingId) {
        // Normalize gender: empty string or "Not Specified" becomes null in database
        const genderValue = formData.gender && formData.gender.trim() && formData.gender !== 'Not Specified' 
          ? formData.gender.trim() 
          : null;

        const updateData = {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          email: formData.email,
          college: formData.college,
          program: formData.program,
          gender: genderValue,
          contact_number: formData.contactNumber,
          address: formData.address,
        };

        console.log('🔄 Updating program head with ID:', editingId);
        console.log('📝 Update data:', updateData);

        const { error, data } = await supabase
          .from("program_heads")
          .update(updateData)
          .eq("id", editingId);

        console.log('✅ Supabase response:', { error, data });

        if (error) {
          console.error('❌ Update error:', error);
          setError(error.message || "Failed to update program head.");
        } else {
          const updatedPH = {
            ...programHeads.find((ph) => ph.id === editingId),
            first_name: formData.firstName,
            middle_name: formData.middleName,
            last_name: formData.lastName,
            email: formData.email,
            college: formData.college,
            program: formData.program,
            gender: genderValue,
            contact_number: formData.contactNumber,
            address: formData.address,
          };
          console.log('🎉 Updated program head object:', updatedPH);
          setProgramHeads((prev) => prev.map((ph) => (ph.id === editingId ? updatedPH : ph)));
          setSuccessMessage("Program head updated successfully!");
          setShowSuccessModal(true);
          // Close modal and reset form immediately
          setShowFormModal(false);
          setTimeout(() => {
            resetForm();
          }, 100);
        }
      }
    } catch (err) {
      setError(err.message || "An error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewProgramHead = () => {
    resetForm();
    setEditingId(null);
    setShowFormModal(true);
  };

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-3">
      {/* Program Head List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Program Chair Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredProgramHeads.length} program chair{filteredProgramHeads.length !== 1 ? 's' : ''} found</p>
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
                  placeholder="Find by name, email, or PH ID..."
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
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-32">PH ID</th>
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
                      <span className="text-slate-600 text-sm">Loading program heads...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredProgramHeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No program heads found. {searchQuery && 'Try adjusting your search.'}</p>
                  </td>
                </tr>
              )}

              {!loading && pagedProgramHeads.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.program_head_code || '—'}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900 text-sm leading-tight">{`${row.last_name}, ${row.first_name}`.trim()}</p>
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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Edit program head</div>
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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Remove program head</div>
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
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, filteredProgramHeads.length)}</span> of <span className="font-semibold">{filteredProgramHeads.length}</span> entries
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

        {error && (
          <div className="px-4 pb-4">
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Edit Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ WebkitOverflowScrolling: 'touch', contain: 'layout' }}>
              {/* Header - matches Subject modal styling */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-16 pointer-events-none"></div>

                <button
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  className="absolute right-4 top-4 z-10 p-2 bg-white hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <X size={20} className="text-slate-900" />
                </button>

                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl border border-white/20 flex-shrink-0">
                    <Users size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">
                      {editingId ? 'Edit Program Chair' : 'Add New Program Chair'}
                    </h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">
                      {editingId ? 'Update program chair information and assignment details' : 'Create a new program chair account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form id="program-head-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: 'layout' }}>
                <div className="space-y-8 pb-4">

                  {/* STEP 1: Essential Information */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Essential Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the program chair's basic information</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleFormChange("lastName", e.target.value)}
                            placeholder="e.g., Santos"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.lastName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                            autoFocus
                          />
                          {formErrors.lastName && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.lastName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleFormChange("firstName", e.target.value)}
                            placeholder="e.g., Jose"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.firstName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.firstName && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.firstName}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Middle Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.middleName}
                          onChange={(e) => handleFormChange("middleName", e.target.value)}
                          placeholder="Optional"
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Contact Information */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">Contact Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Provide contact details for the program chair</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange("email", e.target.value)}
                            placeholder="e.g., jose@university.edu"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.email
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.email && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.email}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            value={formData.contactNumber}
                            onChange={(e) => handleFormChange("contactNumber", e.target.value)}
                            placeholder="e.g., 09XX-XXX-XXXX"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Additional Details */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 3</span>
                      <span className="text-xs font-semibold">Assignment & Details</span>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Program Chair Identification</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              Program Chair Code
                            </label>
                            <input
                              type="text"
                              value={formData.programHeadCode}
                              placeholder="Auto-generated"
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                              disabled={loading || Boolean(editingId)}
                            />
                            <p className="text-xs text-slate-600 mt-2">Auto-generated identifier</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              Gender
                            </label>
                            <select
                              value={formData.gender || ''}
                              onChange={(e) => handleFormChange("gender", e.target.value)}
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-900 font-semibold [&>option[disabled]]:hidden"
                              disabled={loading}
                            >
                              <option value="" disabled hidden>Not Specified</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Another gender identity">Another gender identity</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200 space-y-4">
                        <p className="text-sm font-bold text-slate-900">College & Program Assignment</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              College <span className="text-red-500">*</span>
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
                              Choose the college you belong to.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">
                              Program <span className="text-red-500">*</span>
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

                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-300 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Address Information</p>
                        <textarea
                          rows={3}
                          value={formData.address}
                          onChange={(e) => handleFormChange("address", e.target.value)}
                          placeholder="Street address, city, province..."
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none font-semibold"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>

              <div className="flex-shrink-0 border-t border-slate-200 bg-slate-50 px-8 py-4 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                  className="sm:flex-1 px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="program-head-form"
                  disabled={!editingId || !formData.lastName.trim() || !formData.firstName.trim() || !formData.email.trim() || loading}
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Edit2 size={18} />
                  {loading ? 'Saving...' : editingId ? 'Update Program Head' : 'Add Program Head'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-center text-slate-900">Delete Program Head</h3>
                <p className="mt-2 text-sm text-center text-slate-600">
                  Are you sure you want to delete <strong>{modalData.first_name} {modalData.last_name}</strong>? This action cannot be undone.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
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
          setError(null);
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage("");
        }}
        title="Success!"
        message={successMessage}
        action="The program head list has been updated."
      />
    </div>
  );
}

export default ProgramHeadManagement;


