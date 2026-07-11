import React, { useMemo, useState, useEffect } from "react";
import { getColleges, createCollege, updateCollege, deleteCollege, checkCollegeExists } from "../../../api/colleges";
import ErrorModal from "../../ProgramHead/ProgramHeadDashboard/ErrorModal";
import SuccessModal from "../../ProgramHead/ProgramHeadDashboard/SuccessModal";
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Building2 } from "lucide-react";

function CollegeManagement() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);

  const [collegeName, setCollegeName] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [collegeDescription, setCollegeDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadColleges();
  }, []);

  const loadColleges = async () => {
    setLoading(true);
    try {
      const { data, error } = await getColleges();
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setColleges(data || []);
      }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredColleges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return colleges;
    return colleges.filter((c) => (c.college_code ?? "").toLowerCase().includes(q));
  }, [colleges, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredColleges.length / pageSize));
  const pagedColleges = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredColleges.slice(start, start + pageSize);
  }, [filteredColleges, currentPage, pageSize]);

  const resetForm = () => {
    setCollegeName("");
    setCollegeCode("");
    setCollegeDescription("");
    setDisplayOrder("");
    setEditingId(null);
    setFormErrors({});
  };

  const handleCollegeNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setCollegeName(value);
      setFormErrors((prev) => ({ ...prev, collegeName: "" }));
    }
  };

  const handleCollegeCodeChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\-]*$/.test(value)) {
      setCollegeCode(value);
      setFormErrors((prev) => ({ ...prev, collegeCode: "" }));
    }
  };

  const handleDescriptionChange = (e) => {
    setCollegeDescription(e.target.value);
    setFormErrors((prev) => ({ ...prev, collegeDescription: "" }));
  };

  const handleDisplayOrderChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      setDisplayOrder(value);
      setFormErrors((prev) => ({ ...prev, displayOrder: "" }));
    }
  };

  const handleNewCollege = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleEdit = (college) => {
    setCollegeName(college.college_name ?? "");
    setCollegeCode(college.college_code ?? "");
    setCollegeDescription(college.description ?? "");
    setDisplayOrder(college.display_order?.toString?.() ?? "");
    setEditingId(college.id);
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleDelete = (college) => {
    setModalData(college);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const { error } = await deleteCollege(modalData.id);
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setColleges((prev) => prev.filter((c) => c.id !== modalData.id));
        setSuccessMessage("College deleted successfully!");
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

  const handleSave = async (e) => {
    e.preventDefault();

    const validationErrors = {};
    if (!collegeName.trim()) validationErrors.collegeName = "College name is required.";
    if (!collegeCode.trim()) validationErrors.collegeCode = "College code is required.";
    if (!collegeDescription.trim()) validationErrors.collegeDescription = "Description is required.";

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);

    try {
      const { exists, error: checkError } = await checkCollegeExists({
        name: collegeName.trim(),
        code: collegeCode.trim(),
        excludeId: editingId,
      });

      if (checkError) {
        setError(checkError);
        setShowErrorModal(true);
        return;
      }

      if (exists) {
        setModalData({ collegeName: collegeName.trim(), collegeCode: collegeCode.trim() });
        setShowDuplicateModal(true);
        return;
      }

      const payload = {
        name: collegeName.trim(),
        code: collegeCode.trim(),
        description: collegeDescription.trim(),
      };

      if (editingId) {
        const { error } = await updateCollege(editingId, payload);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          await loadColleges();
          setSuccessMessage("College updated successfully!");
          setShowFormModal(false);
          resetForm();
          setShowSuccessModal(true);
        }
      } else {
        const { data, error } = await createCollege(payload);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          setColleges((prev) => [...prev, data]);
          setSuccessMessage("College created successfully!");
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

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (next) => {
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
  };

  const isFormInvalid = !collegeName.trim() || !collegeCode.trim() || !collegeDescription.trim() || loading;

  return (
    <div className="space-y-3">
      <div className="flex justify-end pb-2">
        <button
          onClick={handleNewCollege}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
        >
          Add New College
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">College Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredColleges.length} college{filteredColleges.length !== 1 ? "s" : ""} found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Find by college code..."
                  maxLength={20}
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-12">#</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-40">College Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">College Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-56">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">Loading...</td>
                </tr>
              )}
              {!loading && pagedColleges.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No colleges found. {searchQuery && "Try adjusting your search."}</p>
                  </td>
                </tr>
              )}
              {!loading &&
                pagedColleges.map((college, idx) => (
                  <tr key={college.id} className="hover:bg-blue-50/30 transition-colors duration-150 border-b border-slate-100">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 text-center">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{college.college_code || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-semibold">{college.college_name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{college.description || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(college)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          disabled={loading}
                          title="Edit college"
                        >
                          <Edit2 size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(college)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                          disabled={loading}
                          title="Remove college"
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

        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold">{filteredColleges.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * pageSize, filteredColleges.length)}</span> of{" "}
            <span className="font-semibold">{filteredColleges.length}</span> entries
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

      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ contain: "layout" }}>
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
                    <Building2 size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">
                      {editingId ? "Edit College" : "Add New College"}
                    </h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">
                      {editingId ? "Update college information" : "Create a new college record"}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: "layout" }}>
                <div className="space-y-8 pb-4">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">College Details</span>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the college information</p>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          College Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={collegeName}
                          onChange={handleCollegeNameChange}
                          placeholder="e.g., College of Technology, Management, and Entrepreneurship"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.collegeName
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                          autoFocus
                        />
                        {formErrors.collegeName && <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.collegeName}</p>}
                        <p className="text-xs text-slate-600 mt-2">Letters and spaces only</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          College Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={collegeCode}
                          onChange={handleCollegeCodeChange}
                          placeholder="e.g., CTME, CEAS"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.collegeCode
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.collegeCode && <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.collegeCode}</p>}
                        <p className="text-xs text-slate-600 mt-2">Letters, numbers, and hyphens only</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          value={collegeDescription}
                          onChange={handleDescriptionChange}
                          placeholder="Brief description of the college..."
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 transition-all resize-none ${
                            formErrors.collegeDescription
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        {formErrors.collegeDescription && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.collegeDescription}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Display Order</label>
                        <input
                          type="text"
                          value={displayOrder}
                          onChange={handleDisplayOrderChange}
                          placeholder="(optional)"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.displayOrder
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                        />
                        <p className="text-xs text-slate-600 mt-2">Display order is managed automatically if left blank</p>
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
                  disabled={isFormInvalid}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Plus size={18} />
                  {loading ? "Saving..." : editingId ? "Update College" : "Create College"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Remove College</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">College Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{modalData.college_name || "—"}</p>
                  <p className="text-xs text-slate-600">
                    Code: <span className="font-semibold text-slate-700">{modalData.college_code || "—"}</span>
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
                {loading ? "Removing..." : "Remove College"}
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
          loadColleges();
        }}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The college list has been updated."
      />

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setShowDuplicateModal(false)}
          ></div>
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>

            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
                  <Building2 size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">College Exists</h2>
                  <p className="text-amber-100 mt-1 text-sm font-medium">This college name or code is already in the system</p>
                  <div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">
                A college with the name <strong className="text-amber-700">\"{modalData.collegeName}\"</strong> or code{" "}
                <strong className="text-amber-700">\"{modalData.collegeCode}\"</strong> already exists.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">💡 What you can do</p>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Use a different college name/code</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Edit the existing college if you need to make changes</span>
                  </li>
                </ul>
              </div>
            </div>

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
                    const nameInput = document.querySelector('input[placeholder^="e.g., College"]');
                    if (nameInput) nameInput.focus();
                  }, 100);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold hover:shadow-lg hover:from-amber-700 hover:to-amber-800 transition-all"
              >
                <Edit2 size={18} />
                Try Different
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollegeManagement;
