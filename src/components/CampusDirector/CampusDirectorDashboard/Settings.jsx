import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { User, Mail, Hash, Phone, MapPin, Save, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

function Settings({ user, campusDirectorData: initialCampusDirectorData, onDataSaved = () => {} }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [campusDirectorData, setCampusDirectorData] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    contact_number: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  const [showEmail, setShowEmail] = useState(false);
  const [showCampusDirectorId, setShowCampusDirectorId] = useState(false);

  const maskedEmail = useMemo(() => {
    const email = campusDirectorData?.email || user?.email || "";
    if (!email.includes("@")) return email;
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `**@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }, [campusDirectorData, user]);

  useEffect(() => {
    const handleDataUpdate = (event) => {
      if (event.detail?.data) {
        const updated = event.detail.data;
        setCampusDirectorData(updated);
        const nextForm = {
          first_name: updated?.first_name || "",
          middle_name: updated?.middle_name || "",
          last_name: updated?.last_name || "",
          gender: updated?.gender || "",
          contact_number: updated?.contact_number || "",
          address: updated?.address || "",
        };
        setFormData(nextForm);
        setOriginalData(nextForm);
        setHasChanges(false);
      }
    };

    window.addEventListener("campusDirectorDataUpdated", handleDataUpdate);
    return () => {
      window.removeEventListener("campusDirectorDataUpdated", handleDataUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchCampusDirectorData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        if (initialCampusDirectorData) {
          setCampusDirectorData(initialCampusDirectorData);
          const nextForm = {
            first_name: initialCampusDirectorData.first_name || "",
            middle_name: initialCampusDirectorData.middle_name || "",
            last_name: initialCampusDirectorData.last_name || "",
            gender: initialCampusDirectorData.gender || "",
            contact_number: initialCampusDirectorData.contact_number || "",
            address: initialCampusDirectorData.address || "",
          };
          setFormData(nextForm);
          setOriginalData(nextForm);
          setIsLoading(false);
          return;
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const { data, error } = await supabase
          .from("campus_directors")
          .select("*")
          .eq("auth_user_id", currentUser.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setCampusDirectorData(null);
            const empty = {
              first_name: "",
              middle_name: "",
              last_name: "",
              gender: "",
              contact_number: "",
              address: "",
            };
            setFormData(empty);
            setOriginalData(empty);
          } else {
            console.error("❌ Error fetching campus director data:", error);
          }
        } else if (data) {
          setCampusDirectorData(data);
          const nextForm = {
            first_name: data.first_name || "",
            middle_name: data.middle_name || "",
            last_name: data.last_name || "",
            gender: data.gender || "",
            contact_number: data.contact_number || "",
            address: data.address || "",
          };
          setFormData(nextForm);
          setOriginalData(nextForm);
        }
      } catch (err) {
        console.error("❌ Error fetching campus director data:", err);
        setErrorMessage("Failed to load your profile information.");
        setShowErrorModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampusDirectorData();
  }, [user, initialCampusDirectorData]);

  useEffect(() => {
    if (!originalData) return;
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "first_name" || name === "middle_name" || name === "last_name") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^a-zA-Z ]/g, "") }));
      return;
    }

    if (name === "contact_number") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^0-9\s\-()]/g, "") }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required.";
    } else if (!/^[a-zA-Z ]+$/.test(formData.first_name.trim())) {
      errors.first_name = "First name can only contain letters and spaces.";
    }

    if (formData.middle_name && !/^[a-zA-Z ]+$/.test(formData.middle_name.trim())) {
      errors.middle_name = "Middle name can only contain letters and spaces.";
    }

    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required.";
    } else if (!/^[a-zA-Z ]+$/.test(formData.last_name.trim())) {
      errors.last_name = "Last name can only contain letters and spaces.";
    }

    if (formData.contact_number && !/^[\d\s\-()]+$/.test(formData.contact_number.trim())) {
      errors.contact_number = "Contact number contains invalid characters.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return false;
    }
    return true;
  };

  const handleReset = () => {
    if (originalData) {
      setFormData({ ...originalData });
      setFormErrors({});
      setHasChanges(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setErrorMessage("Session expired. Please log in again.");
        setShowErrorModal(true);
        return;
      }

      const genderValue = formData.gender && formData.gender.trim() ? formData.gender.trim() : null;

      const payload = {
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim() || null,
        last_name: formData.last_name.trim(),
        gender: genderValue,
        contact_number: formData.contact_number.trim() || null,
        address: formData.address.trim() || null,
      };

      const { data, error } = await supabase
        .from("campus_directors")
        .update(payload)
        .eq("auth_user_id", currentUser.id)
        .select("*")
        .single();

      if (error) {
        console.error("❌ Error updating campus director profile:", error);
        setErrorMessage(error.message || "Failed to update profile.");
        setShowErrorModal(true);
        return;
      }

      setOriginalData({ ...formData });
      setHasChanges(false);
      setShowSuccessModal(true);

      const { data: refreshed } = await supabase
        .from("campus_directors")
        .select("*")
        .eq("auth_user_id", currentUser.id)
        .single();

      if (refreshed) {
        setCampusDirectorData(refreshed);
        sessionStorage.setItem("campusDirectorData", JSON.stringify(refreshed));

        onDataSaved(refreshed);

        window.dispatchEvent(
          new CustomEvent("campusDirectorDataUpdated", {
            detail: { data: refreshed, eventType: "UPDATE", gender: refreshed.gender },
          })
        );
        window.dispatchEvent(new CustomEvent("campusDirectorProfileUpdated", { detail: { gender: refreshed.gender } }));
      }
    } catch (err) {
      console.error("❌ Error saving campus director profile:", err);
      setErrorMessage(err.message || "Failed to update profile.");
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500/30 border-t-red-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Account Settings</h1>
          <p className="text-slate-600 text-sm">Manage your personal information and account details.</p>
        </div>

        <form onSubmit={handleSave} className="p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-2">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white [&>option[disabled]]:hidden"
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

            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="pt-6 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 transition"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={!hasChanges || isSaving}
                className="ml-auto px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Changes Saved</h2>
            </div>
            <p className="text-sm text-slate-600">Your profile has been updated successfully.</p>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Validation Error</h2>
            </div>
            <ul className="text-sm text-slate-600 space-y-2 mb-6">
              {Object.values(validationErrors).map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowValidationModal(false)}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Error</h2>
            </div>
            <p className="text-sm text-slate-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Settings;
