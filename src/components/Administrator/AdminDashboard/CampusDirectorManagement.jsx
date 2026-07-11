import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  checkCampusDirectorExists,
  deleteCampusDirector,
  disableCampusDirectorAccount,
  enableCampusDirectorAccount,
  getCampusDirectors,
  updateCampusDirector,
} from "../../../api/campusDirectors";
import ErrorModal from "../../ProgramHead/ProgramHeadDashboard/ErrorModal";
import SuccessModal from "../../ProgramHead/ProgramHeadDashboard/SuccessModal";
import { Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Users, Lock, Unlock } from "lucide-react";

function CampusDirectorManagement() {
  const [campusDirectors, setCampusDirectors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    campusDirectorCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    gender: "",
    contactNumber: "",
    address: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [modalData, setModalData] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);

  const loadCampusDirectors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: loadError } = await getCampusDirectors();
      if (loadError) {
        setError(loadError);
        setShowErrorModal(true);
      } else {
        setCampusDirectors(data || []);
      }
    } catch (err) {
      setError(err?.message || "An error occurred while loading campus directors");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampusDirectors();
  }, [loadCampusDirectors]);

  const filteredCampusDirectors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return campusDirectors;

    return campusDirectors.filter((d) => {
      const code = (d.campus_director_code ?? "").toLowerCase();
      const email = (d.email ?? "").toLowerCase();
      const fullName = `${d.first_name || ""} ${d.middle_name || ""} ${d.last_name || ""}`
        .trim()
        .toLowerCase();

      return code.includes(q) || fullName.includes(q) || email.includes(q);
    });
  }, [campusDirectors, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCampusDirectors.length / pageSize));

  const pagedCampusDirectors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampusDirectors.slice(start, start + pageSize);
  }, [filteredCampusDirectors, currentPage, pageSize]);

  const handlePageChange = useCallback(
    (next) => {
      if (next < 1 || next > totalPages) return;
      setCurrentPage(next);
    },
    [totalPages]
  );

  const resetForm = () => {
    setFormData({
      campusDirectorCode: "",
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      gender: "",
      contactNumber: "",
      address: "",
    });
    setEditingId(null);
    setFormErrors({});
  };

  const handleEdit = (row) => {
    setFormData({
      campusDirectorCode: row.campus_director_code || "",
      firstName: row.first_name || "",
      middleName: row.middle_name || "",
      lastName: row.last_name || "",
      email: row.email || "",
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
      const apiCall = newStatus ? enableCampusDirectorAccount : disableCampusDirectorAccount;
      const { error: toggleError } = await apiCall(row.id);

      if (toggleError) {
        setError(toggleError);
        setShowErrorModal(true);
      } else {
        setCampusDirectors((prev) => prev.map((d) => (d.id === row.id ? { ...d, is_active: newStatus } : d)));
        const statusText = newStatus ? "enabled" : "disabled";
        const actionText = newStatus ? "can now log in" : "can no longer log in";
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
      const { error: deleteError } = await deleteCampusDirector(modalData.id);

      if (deleteError) {
        setError(deleteError);
        setShowErrorModal(true);
      } else {
        setCampusDirectors((prev) => prev.filter((d) => d.id !== modalData.id));
        setSuccessMessage("Campus Director deleted successfully!");
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(err?.message || "An error occurred while deleting the campus director");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!formData.lastName.trim()) validationErrors.lastName = "Last name is required.";
    if (!formData.firstName.trim()) validationErrors.firstName = "First name is required.";
    const email = formData.email?.trim();
    if (!email) validationErrors.email = "Email is required.";

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);

    try {
      if (!editingId) return;

      const { exists, error: existsError } = await checkCampusDirectorExists(formData.email.trim(), editingId);
      if (existsError) {
        setError(existsError);
        setShowErrorModal(true);
        return;
      }
      if (exists) {
        setError("A campus director with this email already exists.");
        setShowErrorModal(true);
        return;
      }

      const genderValue = formData.gender && formData.gender.trim() ? formData.gender.trim() : null;

      const payload = {
        first_name: formData.firstName.trim(),
        middle_name: formData.middleName.trim() || null,
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        gender: genderValue,
        contact_number: formData.contactNumber.trim() || null,
        address: formData.address.trim() || null,
      };

      const { data, error: saveError } = await updateCampusDirector(editingId, payload);

      if (saveError) {
        setError(saveError);
        setShowErrorModal(true);
      } else {
        if (data) {
          setCampusDirectors((prev) => prev.map((d) => (d.id === editingId ? data : d)));
        } else {
          await loadCampusDirectors();
        }
        setSuccessMessage("Campus Director updated successfully!");
        setShowSuccessModal(true);
        setShowFormModal(false);
        resetForm();
      }
    } catch (err) {
      setError(err?.message || "An error occurred while saving");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Campus Director Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredCampusDirectors.length} campus director{filteredCampusDirectors.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Find by name, email, or Campus Director ID..."
                  className="w-full md:w-72 pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <option key={n} value={n}>
                    Show {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-12">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-48">Campus Director ID</th>
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
                      <span className="text-slate-600 text-sm">Loading campus directors...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pagedCampusDirectors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No campus directors found. {searchQuery && "Try adjusting your search."}</p>
                  </td>
                </tr>
              )}
              {!loading &&
                pagedCampusDirectors.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{row.campus_director_code || "—"}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 text-sm leading-tight">{`${row.last_name}, ${row.first_name}`.trim()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.email || "—"}</td>
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
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            Edit campus director
                          </div>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={() => handleToggleStatus(row)}
                            disabled={loading}
                            className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                              row.is_active
                                ? "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                                : "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
                            }`}
                          >
                            {row.is_active ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            {row.is_active ? "Disable account" : "Enable account"}
                          </div>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                            Remove campus director
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold">{Math.min((currentPage - 1) * pageSize + 1, filteredCampusDirectors.length)}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * pageSize, filteredCampusDirectors.length)}</span> of{" "}
            <span className="font-semibold">{filteredCampusDirectors.length}</span> entries
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
            <span className="px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
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

      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ WebkitOverflowScrolling: "touch", contain: "layout" }}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-16 pointer-events-none"></div>

                <button onClick={handleCloseFormModal} className="absolute right-4 top-4 z-10 p-2 bg-white hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
                  <X size={20} className="text-slate-900" />
                </button>

                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl border border-white/20 flex-shrink-0">
                    <Users size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">Edit Campus Director</h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">Update campus director information</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: "layout" }}>
                <div className="space-y-8 pb-4">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Personal Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">Last Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleFormChange("lastName", e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.lastName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                            autoFocus
                          />
                          {formErrors.lastName && <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.lastName}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">First Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleFormChange("firstName", e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.firstName
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.firstName && <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.firstName}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Middle Name (Optional)</label>
                        <input
                          type="text"
                          value={formData.middleName}
                          onChange={(e) => handleFormChange("middleName", e.target.value)}
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">Contact Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">Email <span className="text-red-500">*</span></label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormChange("email", e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.email
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.email && <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.email}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">Contact Number</label>
                          <input
                            type="text"
                            value={formData.contactNumber}
                            onChange={(e) => handleFormChange("contactNumber", e.target.value)}
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                      <span className="text-xs font-bold">STEP 3</span>
                      <span className="text-xs font-semibold">Additional Details</span>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">Campus Director ID</label>
                            <input
                              type="text"
                              value={formData.campusDirectorCode}
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 font-semibold"
                              disabled
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">Gender</label>
                            <select
                              value={formData.gender || ""}
                              onChange={(e) => handleFormChange("gender", e.target.value)}
                              className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white text-slate-900 font-semibold [&>option[disabled]]:hidden"
                              disabled={loading}
                            >
                              <option value="" disabled hidden>
                                Not Specified
                              </option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Another gender identity">Another gender identity</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-300 space-y-4">
                        <label className="block text-sm font-bold text-slate-900">Address</label>
                        <textarea
                          rows={3}
                          value={formData.address}
                          onChange={(e) => handleFormChange("address", e.target.value)}
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none font-semibold"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>

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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Edit2 size={18} />
                  {loading ? "Saving..." : "Update Campus Director"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Remove Campus Director</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Campus Director Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{`${modalData?.last_name || ""}, ${modalData?.first_name || ""}`.trim()}</p>
                  <p className="text-xs text-slate-600">
                    Email: <span className="font-semibold text-slate-700">{modalData?.email || "—"}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Campus Director ID: <span className="font-semibold text-slate-700">{modalData?.campus_director_code || "—"}</span>
                  </p>
                </div>
              </div>
            </div>

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
                {loading ? "Removing..." : "Remove Campus Director"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={error}
        onRetry={() => {
          setShowErrorModal(false);
          loadCampusDirectors();
        }}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The campus director list has been updated."
      />
    </div>
  );
}

export default CampusDirectorManagement;
