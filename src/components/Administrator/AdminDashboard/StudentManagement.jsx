import React, { useEffect, useMemo, useState, useCallback } from "react";
import { getStudents, updateStudent, deleteStudent, checkStudentExists, disableStudentAccount, enableStudentAccount } from "../../../api/students";
import SimpleSelector from "../../SimpleSelector";
import ErrorModal from "../../ProgramHead/ProgramHeadDashboard/ErrorModal";
import SuccessModal from "../../ProgramHead/ProgramHeadDashboard/SuccessModal";
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

// Helper function to validate and normalize college/program values
const validateCollegeValue = (value) => {
  if (!value) return '';
  const match = COLLEGE_OPTIONS.find(c => c === value);
  if (match) {
    console.log("✅ College value matches:", value);
    return match;
  }
  console.warn("⚠️ College value does NOT match any option:", value, "Available:", COLLEGE_OPTIONS);
  return '';
};

const validateProgramValue = (college, program) => {
  if (!college || !program) return '';
  const availablePrograms = PROGRAM_OPTIONS_BY_COLLEGE[college];
  if (!availablePrograms) {
    console.warn("⚠️ No programs found for college:", college);
    return '';
  }
  const match = availablePrograms.find(p => p === program);
  if (match) {
    console.log("✅ Program value matches:", program);
    return match;
  }
  console.warn("⚠️ Program value does NOT match any option:", program, "Available:", availablePrograms);
  return '';
};

function StudentManagement() {
	// Data state
	const [students, setStudents] = useState([]);
	const [loading, setLoading] = useState(false);

	// Form state
	const [formData, setFormData] = useState({
		firstName: "",
		middleName: "",
		lastName: "",
		email: "",
		contactNumber: "",
		gender: "Male",
		address: "",
		college: "",
		program: "",
		yearLevel: "",
		section: "",
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
		loadStudents();
	}, []);

	const loadStudents = async () => {
		setLoading(true);
		try {
			const { data, error } = await getStudents();
			if (error) {
				console.error("❌ Error loading students:", error);
				setError(error);
				setShowErrorModal(true);
			} else {
				console.log("✅ Students loaded in component:", {
					count: data?.length || 0,
					sample: data?.[0] || null
				});
				setStudents(data || []);
			}
		} catch (err) {
			console.error("❌ Exception loading students:", err);
			setError(err?.message || "An error occurred while loading students");
			setShowErrorModal(true);
		} finally {
			setLoading(false);
		}
	};

	const filteredStudents = useMemo(() => {
		return students.filter((student) => {
			const searchLower = searchQuery.toLowerCase();
			return (
				student.student_id?.toLowerCase().includes(searchLower) ||
				student.first_name?.toLowerCase().includes(searchLower) ||
				student.last_name?.toLowerCase().includes(searchLower) ||
				student.email?.toLowerCase().includes(searchLower)
			);
		});
	}, [students, searchQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

	const pagedStudents = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredStudents.slice(start, start + pageSize);
	}, [filteredStudents, currentPage, pageSize]);

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
	}, []);

	const handleDelete = (row) => {
		setModalData(row);
		setShowDeleteModal(true);
	};

	const handleToggleStatus = async (row) => {
		setLoading(true);
		try {
			const newStatus = !row.is_active;
			const apiCall = newStatus ? enableStudentAccount : disableStudentAccount;
			const { data, error } = await apiCall(row.id);
			
			if (error) {
				setError(error);
				setShowErrorModal(true);
			} else {
				setStudents((prev) => prev.map((s) => (s.id === row.id ? { ...s, is_active: newStatus } : s)));
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

	const resetForm = () => {
		setFormData({
			firstName: "",
			middleName: "",
			lastName: "",
			email: "",
			contactNumber: "",
			gender: "Male",
			address: "",
			college: "",
			program: "",
			yearLevel: "",
			section: "",
		});
		setEditingId(null);
		setFormErrors({});
	};

	const handleEdit = (row) => {
		console.log("📝 Editing student:", {
			id: row.id,
			firstName: row.first_name,
			lastName: row.last_name,
			email: row.email,
			college: row.college,
			program: row.program,
			yearLevel: row.year_level,
			section: row.section,
			allFields: Object.keys(row)
		});

		// Validate and normalize college/program values
		const validatedCollege = validateCollegeValue(row.college);
		const validatedProgram = validateProgramValue(validatedCollege, row.program);

		console.log("🔄 Data validation results:", {
			originalCollege: row.college,
			validatedCollege: validatedCollege,
			originalProgram: row.program,
			validatedProgram: validatedProgram
		});

		const newFormData = {
			firstName: row.first_name || "",
			middleName: row.middle_name || "",
			lastName: row.last_name || "",
			email: row.email || "",
			contactNumber: row.contact_number || "",
			gender: row.gender || "Male",
			address: row.address || "",
			college: validatedCollege,
			program: validatedProgram,
			yearLevel: row.year_level || "",
			section: row.section || "",
		};

		console.log("📋 Form data populated:", newFormData);
		setFormData(newFormData);
		setEditingId(row.id);
		setShowFormModal(true);
	};

	const handleCloseFormModal = () => {
		setShowFormModal(false);
		resetForm();
	};

	const confirmDelete = async () => {
		setLoading(true);
		setShowDeleteModal(false);
		try {
			const { error } = await deleteStudent(modalData.id);

			if (error) {
				setError(error);
				setShowErrorModal(true);
			} else {
				setStudents((prev) => prev.filter((s) => s.id !== modalData.id));
				setSuccessMessage("Student deleted successfully!");
				setShowSuccessModal(true);
			}
		} catch (err) {
			setError(err?.message || "An error occurred while deleting the student");
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
			const { exists, error: checkErr } = await checkStudentExists(email, null, editingId);
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

			const payload = {
				first_name: formData.firstName,
				middle_name: formData.middleName,
				last_name: formData.lastName,
				email: formData.email,
				contact_number: formData.contactNumber,
				gender: formData.gender,
				address: formData.address,
				college: formData.college,
				program: formData.program,
				year_level: formData.yearLevel,
				section: formData.section,
			};

			console.log("💾 Saving student data:", {
				editingId,
				payload
			});

			if (editingId) {
				const { data, error } = await updateStudent(editingId, payload);
				if (error) {
					console.error("❌ Error updating student:", error);
					setError(error);
					setShowErrorModal(true);
				} else {
					console.log("✅ Student updated successfully:", data);
					if (data) {
						setStudents((prev) => prev.map((s) => (s.id === editingId ? data : s)));
					} else {
						await loadStudents();
					}
					setSuccessMessage("Student updated successfully!");
					setShowSuccessModal(true);
					resetForm();
					setShowFormModal(false);
				}
			}
		} catch (err) {
			console.error("❌ Exception saving student:", err);
			setError(err);
			setShowErrorModal(true);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-3">
			{/* Student List Table */}
			<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
				{/* Table Header with Controls */}
				<div className="p-4 border-b border-slate-200">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
						<div>
							<h2 className="text-lg font-bold text-slate-900">Student Management</h2>
							<p className="text-xs text-slate-500 mt-0.5">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found</p>
						</div>
						<div className="flex items-center gap-3">
							<div className="relative flex-1 md:flex-none">
								<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={handleSearch}
									placeholder="Find by student ID, name, or email..."
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
								<option value={5}>Show 5</option>
								<option value={10}>Show 10</option>
								<option value={25}>Show 25</option>
							</select>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">#</th>
								<th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Student ID</th>
								<th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
								<th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
								<th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-200">
							{pagedStudents.length > 0 ? (
								pagedStudents.map((student, index) => (
									<tr key={student.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-4 text-sm font-semibold text-slate-900">
											{(currentPage - 1) * pageSize + index + 1}
										</td>
										<td className="px-6 py-4 text-sm font-semibold text-slate-900">{student.student_id}</td>
										<td className="px-6 py-4 text-sm font-semibold text-slate-900">
											{student.last_name}, {student.first_name}
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
										<td className="px-6 py-4">
											<div className="flex items-center justify-center gap-2 flex-wrap">
												<div className="relative group">
													<button
														onClick={() => handleEdit(student)}
														disabled={loading}
														className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
													>
														<Edit2 size={16} />
													</button>
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Edit student</div>
												</div>
												<div className="relative group">
													<button
														onClick={() => handleToggleStatus(student)}
														disabled={loading}
														className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
															student.is_active
																? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
																: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
														}`}
													>
														{student.is_active ? (
															<Unlock size={16} />
														) : (
															<Lock size={16} />
														)}
													</button>
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">{student.is_active ? 'Disable account' : 'Enable account'}</div>
												</div>
												<div className="relative group">
													<button
														onClick={() => handleDelete(student)}
														disabled={loading}
														className="inline-flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
													>
														<Trash2 size={16} />
													</button>
													<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">Remove student</div>
												</div>
											</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan="5" className="px-6 py-8 text-center text-slate-500">
										No students found
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
						<p className="text-xs text-slate-600">
							Showing {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)} to{" "}
							{Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length}
						</p>
						<div className="flex gap-2">
							<button
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1 || loading}
								className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								<ChevronLeft size={18} className="text-slate-600" />
							</button>
							<span className="px-4 py-2 text-sm font-semibold text-slate-900">
								{currentPage} / {totalPages}
							</span>
							<button
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages || loading}
								className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								<ChevronRight size={18} className="text-slate-600" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Student Form Modal */}
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
										<Users size={24} className="text-white" />
									</div>
									<div className="flex-1 min-w-0 pr-8">
										<h2 className="text-2xl font-bold text-white">
											{editingId ? 'Edit Student' : 'Add New Student'}
										</h2>
										<p className="text-blue-100/90 mt-1 text-xs font-medium">
											{editingId ? 'Update student information and enrollment details' : 'Create a new student account'}
										</p>
									</div>
								</div>
							</div>

							{/* Scrollable Form Content */}
							<form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: 'layout' }}>
								<div className="space-y-8 pb-4">
									
									{/* STEP 1: Personal Information */}
									<div className="space-y-4">
										<div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
											<span className="text-xs font-bold">STEP 1</span>
											<span className="text-xs font-semibold">Personal Info</span>
										</div>
										
										<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
											<p className="text-xs text-slate-600 font-medium">Enter the student's basic information</p>
											
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
													className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
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
											<p className="text-xs text-slate-600 font-medium">Provide contact details for the student</p>

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
														className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
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
														value={formData.contactNumber}
														onChange={(e) => handleFormChange("contactNumber", e.target.value)}
														placeholder="e.g., 09XX-XXX-XXXX"
														className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
														disabled={loading}
													/>
												</div>
											</div>
										</div>
									</div>

									{/* STEP 3: Academic Information */}
									<div className="space-y-4">
										<div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
											<span className="text-xs font-bold">STEP 3</span>
											<span className="text-xs font-semibold">Academic Info</span>
										</div>

										<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 space-y-4">
											<p className="text-xs text-slate-600 font-medium">Enter academic details</p>

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

												{/* Year Level */}
												<div>
													<label className="block text-sm font-bold text-slate-900 mb-2">
														Year Level
													</label>
													<select
														value={formData.yearLevel}
														onChange={(e) => handleFormChange("yearLevel", e.target.value)}
														className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-slate-900 font-semibold"
														disabled={loading}
													>
														<option value="">Select Year Level</option>
														<option value="1st Year">1st Year</option>
														<option value="2nd Year">2nd Year</option>
														<option value="3rd Year">3rd Year</option>
														<option value="4th Year">4th Year</option>
													</select>
												</div>

												{/* Section */}
												<div>
													<label className="block text-sm font-bold text-slate-900 mb-2">
														Section
													</label>
													<input
														type="text"
														value={formData.section}
														onChange={(e) => handleFormChange("section", e.target.value)}
														placeholder="e.g., A"
														className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white text-slate-900 placeholder-slate-400 font-semibold"
														disabled={loading}
													/>
												</div>
											</div>
										</div>

										{/* STEP 4: Additional Details */}
										<div className="space-y-4">
											<div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
												<span className="text-xs font-bold">STEP 4</span>
												<span className="text-xs font-semibold">Additional Details</span>
											</div>

											<div className="space-y-5">
												{/* Gender */}
												<div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 space-y-4">
													<p className="text-sm font-bold text-slate-900">Personal Details</p>
												
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
														<div>
															<label className="block text-sm font-bold text-slate-900 mb-2">
																Gender
															</label>
															<select
																value={formData.gender}
																onChange={(e) => handleFormChange("gender", e.target.value)}
																className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-white text-slate-900 font-semibold"
																disabled={loading}
															>
																<option>Male</option>
																<option>Female</option>
															</select>
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
														className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none font-semibold"
														disabled={loading}
													/>
												</div>
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
									className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
								>
									<Edit2 size={18} />
									{loading ? 'Saving...' : editingId ? 'Update Student' : 'Add Student'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
					<div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300">
						{/* Header */}
						<div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
							<div className="flex items-center gap-3">
								<div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
									<Trash2 size={20} className="text-white" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-white">Remove Student</h2>
									<p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
								</div>
							</div>
						</div>

						{/* Content */}
						<div className="px-6 py-6 space-y-4">
							{/* Student Details */}
							<div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
								<p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Student Details</p>
								<div className="space-y-1.5">
									<p className="text-sm font-semibold text-slate-900">{`${modalData?.last_name || ''}, ${modalData?.first_name || ''}`.trim()}</p>
									<p className="text-xs text-slate-600">Email: <span className="font-semibold text-slate-700">{modalData?.email || '—'}</span></p>
									<p className="text-xs text-slate-600">Student ID: <span className="font-semibold text-slate-700">{modalData?.student_id || '—'}</span></p>
								</div>
							</div>

							{/* Impact Warning */}
							<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
								<p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
								<ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
									<li>Student will be removed from the system</li>
									<li>All enrollment records will be deleted</li>
									<li>All schedule data will be removed</li>
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
								{loading ? 'Removing...' : 'Remove Student'}
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
					loadStudents();
				}}
			/>

			{/* Success Modal */}
			<SuccessModal
				isOpen={showSuccessModal}
				onClose={() => setShowSuccessModal(false)}
				title="Success!"
				message={successMessage}
				action="The student list has been updated."
			/>

			{/* Duplicate Student Modal */}
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
									<h2 className="text-2xl font-bold text-white">Duplicate Student</h2>
									<p className="text-amber-100 mt-1 text-sm font-medium">This email already exists</p>
									<div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
								</div>
							</div>
						</div>

						{/* Content */}
						<div className="px-8 py-6 space-y-4">
							<p className="text-slate-700 text-sm leading-relaxed">A student with the email <strong className="text-amber-700">{formData.email}</strong> already exists. Duplicate entries are not allowed.</p>
							
							<div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
								<p className="text-xs font-bold text-amber-900 uppercase tracking-widest">How to proceed</p>
								<ul className="space-y-2.5 text-sm text-slate-700">
									<li className="flex items-start gap-3">
										<span className="text-amber-600 font-bold text-lg">•</span>
										<span>Review existing student records and update them instead</span>
									</li>
									<li className="flex items-start gap-3">
										<span className="text-amber-600 font-bold text-lg">•</span>
										<span>Use a different institutional email</span>
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

export default StudentManagement;
