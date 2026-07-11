import React, { useEffect, useMemo, useState } from "react";
import { getLocations, createLocation, updateLocation, deleteLocation, checkLocationExists } from "../../../api/location";
import Modal from "./Modal";
import ErrorModal from "./ErrorModal";
import SuccessModal from "./SuccessModal";
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, MapPin, ToggleLeft, ToggleRight } from "lucide-react";

function LocationManagement() {
  // State for locations data
  const [locations, setLocations] = useState([]); // full list
  const [loading, setLoading] = useState(false);
  
  // Form state - Extended with all attributes
  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationCapacity, setLocationCapacity] = useState("");
  const [locationType, setLocationType] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [building, setBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
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
  
  const isFormInvalid = !locationName.trim() || !locationCapacity || !locationType || loading;

  // Load locations on component mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Load locations from Supabase
  const loadLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await getLocations();
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        // If a location is missing a code, generate one for display only.
        // Do NOT auto-update the database here (prevents unintended writes on page load/navigation).
        const locationsWithDisplayCode = (data || []).map((location) => {
          if (location?.location_code) return location;

          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let rmid = 'RMID-';
          for (let i = 0; i < 4; i++) {
            rmid += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          return { ...location, location_code: rmid };
        });

        setLocations(locationsWithDisplayCode);
      }
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter locations locally for rendering
  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((l) => 
      `${l.location_code || ''}`.toLowerCase().includes(query) ||
      `${l.name}`.toLowerCase().includes(query) ||
      `${l.type}`.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize));
  const pagedLocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLocations.slice(start, start + pageSize);
  }, [filteredLocations, currentPage, pageSize]);

  // Generate random RMID in format RMID-XXXX (X = capital letters and numbers)
  const generateRMID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rmid = 'RMID-';
    for (let i = 0; i < 4; i++) {
      rmid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return rmid;
  };

  // Reset form
  const resetForm = () => {
    setLocationCode(generateRMID());
    setLocationName("");
    setLocationCapacity("");
    setLocationType("");
    setIsAvailable(true);
    setBuilding("");
    setRoomNumber("");
    setFloor("");
    setDescription("");
    setEditingId(null);
    setFormErrors({});
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  // Handle save/create location
  const handleSave = async (e) => {
    e.preventDefault();
    
    const validationErrors = {};
    if (!locationName.trim()) {
      validationErrors.locationName = "Location name is required.";
    }
    if (!locationCapacity) {
      validationErrors.locationCapacity = "Capacity is required.";
    }
    if (!locationType) {
      validationErrors.locationType = "Type is required.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);
    try {
      // Check for duplicate location name
      const { exists, error: checkError } = await checkLocationExists(locationName.trim(), editingId);
      
      if (checkError) {
        setError(checkError);
        setShowErrorModal(true);
        setLoading(false);
        return;
      }
      
      if (exists) {
        setModalData({ locationName: locationName.trim() });
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      const locationData = {
        location_code: locationCode.trim() || null,
        name: locationName.trim(),
        capacity: parseInt(locationCapacity),
        type: locationType,
        is_available: isAvailable,
        building: building.trim() || null,
        room_number: roomNumber.trim() || null,
        floor: floor ? parseInt(floor) : null,
        description: description.trim() || null
      };

      if (editingId) {
        const { data, error } = await updateLocation(editingId, locationData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          setLocations(prev => prev.map(l => l.id === editingId ? data : l));
          setSuccessMessage("Location updated successfully!");
          setShowSuccessModal(true);
        }
      } else {
        const { data, error } = await createLocation(locationData);
        if (error) {
          setError(error);
          setShowErrorModal(true);
        } else {
          setLocations(prev => [...prev, data]);
          setSuccessMessage("Location created successfully!");
          setShowSuccessModal(true);
        }
      }
      resetForm();
      setShowFormModal(false);
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit location
  const handleEdit = (location) => {
    setLocationCode(location.location_code || "");
    setLocationName(location.name);
    setLocationCapacity(location.capacity.toString());
    setLocationType(location.type);
    setIsAvailable(location.is_available !== false);
    setBuilding(location.building || "");
    setRoomNumber(location.room_number || "");
    setFloor(location.floor ? location.floor.toString() : "");
    setDescription(location.description || "");
    setEditingId(location.id);
    setShowFormModal(true);
  };

  // Handle delete location
  const handleDelete = (location) => {
    setModalData(location);
    setShowDeleteModal(true);
  };

  const handleToggleAvailability = async (location) => {
    setLoading(true);
    try {
      const updatedPayload = {
        location_code: location.location_code || null,
        name: location.name,
        building: location.building || null,
        room_number: location.room_number || null,
        capacity: location.capacity,
        type: location.type,
        floor: location.floor ?? null,
        description: location.description || null,
        is_available: !(location.is_available !== false)
      };

      const { data, error } = await updateLocation(location.id, updatedPayload);
      if (error) {
        setError(error);
        setShowErrorModal(true);
        return;
      }

      setLocations((prev) => prev.map((l) => (l.id === location.id ? data : l)));
      setSuccessMessage(`Location marked as ${data?.is_available ? 'Available' : 'Unavailable'}!`);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    setLoading(true);
    try {
      const { error } = await deleteLocation(modalData.id);
      if (error) {
        setError(error);
        setShowErrorModal(true);
      } else {
        setLocations(prev => prev.filter(l => l.id !== modalData.id));
        setSuccessMessage("Location deleted successfully!");
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
          onClick={() => {
            resetForm();
            setShowFormModal(true);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
        >
          Add New Location
        </button>
      </div>

      {/* Location List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header with Controls */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Room Utilization</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:flex-none">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search by room code..."
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
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Room ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-slate-600 text-sm">Loading locations...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pagedLocations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <p className="text-xs">No locations found. {searchQuery && 'Try adjusting your search.'}</p>
                  </td>
                </tr>
              )}
              {!loading && pagedLocations.map((location, idx) => (
                <tr key={location.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{location.location_code || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{location.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{location.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">{location.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      location.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {location.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleToggleAvailability(location)}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                          location.is_available ? 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                        }`}
                        disabled={loading}
                        title={location.is_available ? 'Mark unavailable' : 'Mark available'}
                      >
                        {location.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button 
                        onClick={() => handleEdit(location)} 
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Edit location"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(location)} 
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        disabled={loading}
                        title="Delete location"
                      >
                        <Trash2 size={16} />
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
            Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-semibold">{Math.min(currentPage * pageSize, filteredLocations.length)}</span> of <span className="font-semibold">{filteredLocations.length}</span> entries
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

      {/* Location Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"></div>
          <div className="flex min-h-full items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-3xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 max-h-[90vh] overflow-hidden flex flex-col" style={{ contain: 'layout' }}>
              {/* Header - matches Subject Management modal */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-16 pointer-events-none"></div>

                <button
                  onClick={handleCloseFormModal}
                  className="absolute right-4 top-4 z-10 p-2 bg-white hover:bg-slate-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <X size={20} className="text-slate-900" />
                </button>

                <div className="relative flex items-start gap-4">
                  <div className="p-3 bg-white/20 rounded-xl border border-white/20 flex-shrink-0">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h2 className="text-2xl font-bold text-white">
                      {editingId ? 'Edit Location' : 'Add New Location'}
                    </h2>
                    <p className="text-blue-100/90 mt-1 text-xs font-medium">
                      {editingId ? 'Update location details and configuration' : 'Create a new facility location'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-8 py-6 will-change-transform" style={{ contain: 'layout' }}>
                <div className="space-y-8 pb-4">

                  {/* STEP 1: Match Subject Modal styling */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      <span className="text-xs font-bold">STEP 1</span>
                      <span className="text-xs font-semibold">Essential Info</span>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Enter the basic details about the location</p>

                      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-2">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Auto-Generated Room ID</p>
                        <p className="text-sm font-bold text-blue-700">{locationCode}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">
                          Location Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={locationName}
                          onChange={(e) => {
                            setLocationName(e.target.value);
                            setFormErrors((prev) => ({ ...prev, locationName: "" }));
                          }}
                          placeholder="e.g., Room 201, Main Auditorium, CS Lab A"
                          className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                            formErrors.locationName
                              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                              : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                          } text-slate-900 placeholder-slate-400 font-semibold`}
                          disabled={loading}
                          autoFocus
                        />
                        {formErrors.locationName && (
                          <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.locationName}</p>
                        )}
                        <p className="text-xs text-slate-600 mt-2">This is how the location will appear in schedules</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Location Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={locationType}
                            onChange={(e) => {
                              setLocationType(e.target.value);
                              setFormErrors((prev) => ({ ...prev, locationType: "" }));
                            }}
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.locationType
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } font-semibold`}
                            disabled={loading}
                          >
                            <option value="" disabled hidden>Choose type...</option>
                            <option value="Classroom">🎓 Classroom</option>
                            <option value="Lecture Hall">📢 Lecture Hall</option>
                            <option value="Computer Lab">💻 Computer Lab</option>
                            <option value="Science Lab">🧪 Science Lab</option>
                            <option value="Conference Room">💼 Conference Room</option>
                            <option value="Auditorium">🎭 Auditorium</option>
                            <option value="Library">📚 Library</option>
                            <option value="Other">📍 Other</option>
                          </select>
                          {formErrors.locationType && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.locationType}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Seating Capacity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={locationCapacity}
                            onChange={(e) => {
                              setLocationCapacity(e.target.value);
                              setFormErrors((prev) => ({ ...prev, locationCapacity: "" }));
                            }}
                            placeholder="e.g., 45, 120"
                            min="1"
                            className={`w-full px-4 py-3 rounded-lg text-sm border-2 ${
                              formErrors.locationCapacity
                                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50"
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                            } text-slate-900 placeholder-slate-400 font-semibold`}
                            disabled={loading}
                          />
                          {formErrors.locationCapacity && (
                            <p className="text-xs text-red-600 mt-2 font-medium">❌ {formErrors.locationCapacity}</p>
                          )}
                          <p className="text-xs text-slate-600 mt-2">Number of seats available</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2 - use emerald palette like Subject modal */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <span className="text-xs font-bold">STEP 2</span>
                      <span className="text-xs font-semibold">Location Details</span>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 space-y-4">
                      <p className="text-xs text-slate-600 font-medium">Help users find the exact location</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Building
                          </label>
                          <input
                            type="text"
                            value={building}
                            onChange={(e) => setBuilding(e.target.value)}
                            placeholder="e.g., Engineering"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Room Number
                          </label>
                          <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            placeholder="e.g., 101, Lab-A"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Floor Level
                          </label>
                          <input
                            type="number"
                            value={floor}
                            onChange={(e) => setFloor(e.target.value)}
                            placeholder="e.g., 2, G, B1"
                            className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder-slate-400 font-semibold transition-all"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3 - amber styling from Subject modal */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                      <span className="text-xs font-bold">STEP 3</span>
                      <span className="text-xs font-semibold">Availability & Notes</span>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Is this location available for scheduling?</p>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: true, label: 'Available' },
                            { value: false, label: 'Unavailable' }
                          ].map(({ value, label }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setIsAvailable(value)}
                              className={`p-4 rounded-lg border-2 transition-all font-bold text-center ${
                                isAvailable === value
                                  ? value
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-lg shadow-emerald-200'
                                    : 'border-red-500 bg-red-100 text-red-900 shadow-lg shadow-red-200'
                                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${value ? 'bg-emerald-600' : 'bg-red-600'}`}></div>
                                <span className="text-sm">{label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 space-y-4">
                        <p className="text-sm font-bold text-slate-900">Additional Notes (Optional)</p>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Add any special instructions, restrictions, or details..."
                          rows="3"
                          className="w-full px-4 py-3 rounded-lg text-sm border-2 border-slate-300 focus:border-slate-600 focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 placeholder-slate-400 resize-none font-semibold transition-all"
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
                  onClick={handleCloseFormModal}
                  disabled={loading}
                  className="sm:flex-1 px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={!locationName.trim() || !locationCapacity || !locationType || loading}
                  className="sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Plus size={18} />
                  {loading ? 'Saving...' : editingId ? 'Update Location' : 'Add Location'}
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
                  <h2 className="text-lg font-bold text-white">Remove Location</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Location Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Location Details</p>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{modalData.name}</p>
                  <p className="text-xs text-slate-600">Type: <span className="font-semibold text-slate-700">{modalData.type || '—'}</span></p>
                  <p className="text-xs text-slate-600">Capacity: <span className="font-semibold text-slate-700">{modalData.capacity || '—'} seats</span></p>
                </div>
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
                <ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
                  <li>Location will be removed from the system</li>
                  <li>All schedules using this location will be affected</li>
                  <li>Scheduling availability will be updated</li>
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
                {loading ? 'Removing...' : 'Remove Location'}
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
          loadLocations();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success!"
        message={successMessage}
        action="The location list has been updated."
      />

      {/* Duplicate Location Modal */}
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
                  <MapPin size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Location Exists</h2>
                  <p className="text-amber-100 mt-1 text-sm font-medium">This location name is already used</p>
                  <div className="mt-2 h-1 w-8 rounded-full bg-white/40"></div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              <p className="text-slate-700 text-sm leading-relaxed">A location named <strong className="text-amber-700">"{modalData.locationName}"</strong> already exists. Duplicate rooms create confusion when assigning schedules.</p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">Recommended next steps</p>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Use a unique identifier (e.g., building + room number)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-lg">•</span>
                    <span>Edit the existing location if you intended to update it</span>
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
                    const locationInput = document.querySelector('input[placeholder*="Room 201"]');
                    if (locationInput) locationInput.focus();
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

export default LocationManagement;
