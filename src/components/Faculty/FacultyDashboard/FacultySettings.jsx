import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User, Mail, Phone, MapPin, Save, AlertCircle, CheckCircle, GraduationCap, Building2, Eye, EyeOff } from "lucide-react";

function FacultySettings({ user, facultyData, onDataSaved = () => {} }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [faculty, setFaculty] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    contact_number: '',
    address: '',
    college: '',
    program: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showFacultyId, setShowFacultyId] = useState(false);

  // Listen for real-time data updates
  useEffect(() => {
    const handleDataUpdate = (event) => {
      if (event.detail?.data) {
        const updatedData = event.detail.data;
        setFaculty(updatedData);
        const updatedFormData = {
          first_name: updatedData.first_name || '',
          middle_name: updatedData.middle_name || '',
          last_name: updatedData.last_name || '',
          gender: updatedData.gender || '',
          contact_number: updatedData.contact_number || '',
          address: updatedData.address || '',
          college: updatedData.college || '',
          program: updatedData.program || ''
        };
        setFormData(updatedFormData);
        setOriginalData(updatedFormData);
        setHasChanges(false);
        console.log('✅ Settings form updated from real-time data');
      }
    };

    window.addEventListener('facultyDataUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener('facultyDataUpdated', handleDataUpdate);
    };
  }, []);

  // Fetch faculty data
  useEffect(() => {
    const fetchFacultyData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        if (facultyData) {
          setFaculty(facultyData);
          const initialFormData = {
            first_name: facultyData.first_name || '',
            middle_name: facultyData.middle_name || '',
            last_name: facultyData.last_name || '',
            gender: facultyData.gender || '',
            contact_number: facultyData.contact_number || '',
            address: facultyData.address || '',
            college: facultyData.college || '',
            program: facultyData.program || ''
          };
          setFormData(initialFormData);
          setOriginalData(initialFormData);
          setIsLoading(false);
          return;
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const { data, error } = await supabase
          .from('faculty')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.warn('Faculty record not found, allowing form with empty data');
            setFaculty(null);
            const emptyFormData = {
              first_name: '',
              middle_name: '',
              last_name: '',
              gender: '',
              contact_number: '',
              address: '',
              college: '',
              program: ''
            };
            setFormData(emptyFormData);
            setOriginalData(emptyFormData);
          } else {
            console.error('Error fetching faculty data:', error);
          }
        } else if (data) {
          setFaculty(data);
          const initialFormData = {
            first_name: data.first_name || '',
            middle_name: data.middle_name || '',
            last_name: data.last_name || '',
            gender: data.gender || '',
            contact_number: data.contact_number || '',
            address: data.address || '',
            college: data.college || '',
            program: data.program || ''
          };
          setFormData(initialFormData);
          setOriginalData(initialFormData);
        }
      } catch (error) {
        console.error('Error fetching faculty data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacultyData();
  }, [user, facultyData]);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(hasChanged);
    }
  }, [formData, originalData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'first_name' || name === 'middle_name' || name === 'last_name') {
      const filtered = value.replace(/[^a-zA-Z ]/g, '');
      setFormData(prev => ({ ...prev, [name]: filtered }));
    } else if (name === 'contact_number') {
      const filtered = value.replace(/[^0-9\s\-()]/g, '');
      setFormData(prev => ({ ...prev, [name]: filtered }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const phonePattern = /^[\d\s\-()]+$/;

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required.';
    } else if (!/^[a-zA-Z ]+$/.test(formData.first_name.trim())) {
      errors.first_name = 'First name can only contain letters and spaces.';
    }

    if (formData.middle_name && !/^[a-zA-Z ]+$/.test(formData.middle_name.trim())) {
      errors.middle_name = 'Middle name can only contain letters and spaces.';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required.';
    } else if (!/^[a-zA-Z ]+$/.test(formData.last_name.trim())) {
      errors.last_name = 'Last name can only contain letters and spaces.';
    }

    if (formData.contact_number && !phonePattern.test(formData.contact_number.trim())) {
      errors.contact_number = 'Please enter a valid contact number.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setErrorMessage('Authentication error. Please sign in again.');
        setShowErrorModal(true);
        setIsSaving(false);
        return;
      }

      const genderValue = formData.gender && formData.gender.trim() && formData.gender !== 'Not Specified' 
        ? formData.gender.trim() 
        : null;

      const { error } = await supabase
        .from('faculty')
        .update({
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim() || null,
          last_name: formData.last_name.trim(),
          gender: genderValue,
          contact_number: formData.contact_number.trim() || null,
          address: formData.address.trim() || null
        })
        .eq('email', currentUser.email);

      if (error) {
        console.error('Error updating profile:', error);
        setErrorMessage(error.message || 'Failed to update profile. Please try again.');
        setShowErrorModal(true);
      } else {
        setOriginalData({ ...formData });
        setHasChanges(false);
        setShowSuccessModal(true);
        
        const { data: updatedData } = await supabase
          .from('faculty')
          .select('*')
          .eq('email', currentUser.email)
          .single();
        
        if (updatedData) {
          setFaculty(updatedData);
          onDataSaved(updatedData);
          window.dispatchEvent(new CustomEvent('facultyProfileUpdated', { 
            detail: { gender: updatedData.gender } 
          }));
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (originalData) {
      setFormData({ ...originalData });
      setFormErrors({});
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Account Settings</h1>
          <p className="text-slate-600 text-sm">
            Manage your personal information and account details.
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSave} className="p-8">
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Middle Name */}
                <div>
                  <label htmlFor="middle_name" className="block text-sm font-medium text-slate-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
                    placeholder="Enter middle name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
                    placeholder="Enter last name"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-2">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white [&>option[disabled]]:hidden"
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

            {/* Contact Information Section */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Number */}
                <div>
                  <label htmlFor="contact_number" className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
                    placeholder="Enter contact number"
                  />
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white"
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </div>

            {/* Account Information Section (Read-only) */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Account Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 pr-12">
                      {showEmail ? (faculty?.email || user?.email || 'Not available') : '••••••••••••••••'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEmail(!showEmail)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500 bg-transparent hover:text-slate-700 transition-colors p-0 border-none shadow-none focus:outline-none"
                      tabIndex={-1}
                      aria-label={showEmail ? 'Hide email' : 'Show email'}
                    >
                      {showEmail ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
                </div>

                {/* Faculty ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Faculty ID
                  </label>
                  <div className="relative">
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 pr-12">
                      {showFacultyId ? (faculty?.id_no || 'Not available') : '•••••••'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFacultyId(!showFacultyId)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500 bg-transparent hover:text-slate-700 transition-colors p-0 border-none shadow-none focus:outline-none"
                      tabIndex={-1}
                      aria-label={showFacultyId ? 'Hide ID' : 'Show ID'}
                    >
                      {showFacultyId ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">This is your personal ID in the system</p>
                </div>

                {/* College */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    College
                  </label>
                  <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600">
                    {faculty?.college || 'Not assigned'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Assigned college</p>
                </div>

                {/* Program */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Program
                  </label>
                  <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600">
                    {faculty?.program || 'Not assigned'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Assigned program</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
              {hasChanges && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Reset Changes
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving || !hasChanges}
                className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 ${
                  isSaving || !hasChanges
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full text-center transform transition-all">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">Please Review</h2>
              <p className="text-blue-100 text-sm mt-1">Some fields need your attention</p>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2 mb-4">
                {Object.entries(validationErrors).map(([field, message]) => (
                  <p key={field} className="text-blue-900 text-sm flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">✓</span>
                    <span>{message}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
              <p className="text-slate-600 text-sm">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Profile Updated</h2>
              <p className="text-slate-600 text-sm">
                Your account information has been successfully updated.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all mt-6"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default FacultySettings;
