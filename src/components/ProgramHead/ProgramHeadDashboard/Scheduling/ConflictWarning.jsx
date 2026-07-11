import React, { useEffect } from 'react';
import { AlertTriangle, X, MapPin, User, Clock, Building2, AlertCircle } from 'lucide-react';
import { useModalPersistence } from '../../../../hooks/useModalPersistence';

function ConflictWarning({ conflicts, onClose, onProceed }) {
  const hasRoomConflicts = conflicts?.room && conflicts.room.length > 0;
  const hasFacultyConflicts = conflicts?.faculty && conflicts.faculty.length > 0;
  const isOpen = hasRoomConflicts || hasFacultyConflicts;

  // Use modal persistence hook to save/restore conflict warning state
  const { clearModalState } = useModalPersistence(
    'conflictWarningModal',
    conflicts,
    null,
    isOpen,
    () => {}, // setFormData not needed
    () => {}, // setCurrentStep not needed
    () => {}  // setIsOpen not needed
  );

  // Clear persisted state when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearModalState();
    }
  }, [isOpen, clearModalState]);

  if (!hasRoomConflicts && !hasFacultyConflicts) return null;

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const totalConflicts = (conflicts.room?.length || 0) + (conflicts.faculty?.length || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        aria-hidden="true"
        style={{ 
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)'
        }}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
        {/* Header - Enhanced */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 flex-shrink-0">
              <AlertTriangle className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">Schedule Conflicts Detected</h2>
              <p className="text-red-100 text-sm leading-relaxed">
                We found {totalConflicts} scheduling conflict{totalConflicts !== 1 ? 's' : ''}. Please adjust your schedule to resolve these issues.
              </p>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-8 space-y-6">
            {/* Room Conflicts Section */}
            {hasRoomConflicts && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <div className="p-2.5 bg-red-100 rounded-lg">
                    <Building2 className="text-red-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Room Conflicts</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{conflicts.room.length} room{conflicts.room.length !== 1 ? 's' : ''} unavailable at this time</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {conflicts.room.map((conflict, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-red-50 to-red-50/50 border border-red-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-base mb-3">
                            {conflict.subject?.subject_name || 'Unknown Subject'}
                          </p>
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0">
                                <User size={16} className="text-red-600" />
                              </div>
                              <span className="text-gray-700">
                                {conflict.faculty?.first_name && conflict.faculty?.last_name
                                  ? `${conflict.faculty.first_name} ${conflict.faculty.last_name}`
                                  : conflict.faculty?.first_name || conflict.faculty?.last_name || 'Unknown Faculty'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0">
                                <Clock size={16} className="text-red-600" />
                              </div>
                              <span className="text-gray-700 font-medium">
                                {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                            Room Unavailable
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faculty Conflicts Section */}
            {hasFacultyConflicts && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                  <div className="p-2.5 bg-orange-100 rounded-lg">
                    <User className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Faculty Conflicts</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{conflicts.faculty.length} faculty member{conflicts.faculty.length !== 1 ? 's' : ''} unavailable at this time</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {conflicts.faculty.map((conflict, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-orange-50 to-orange-50/50 border border-orange-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-base mb-3">
                            {conflict.subject?.subject_name || 'Unknown Subject'}
                          </p>
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                                <MapPin size={16} className="text-orange-600" />
                              </div>
                              <span className="text-gray-700 font-medium">{conflict.location?.name || 'Unknown Location'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <div className="p-1.5 bg-orange-100 rounded-lg flex-shrink-0">
                                <Clock size={16} className="text-orange-600" />
                              </div>
                              <span className="text-gray-700 font-medium">
                                {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                            Faculty Unavailable
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer - Enhanced */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConflictWarning;
