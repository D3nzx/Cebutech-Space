import React, { useState } from 'react';
import { Filter, X, Calendar, GraduationCap, MapPin, User, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';
import LocationSelector from '../../../LocationSelector';
import ProgramSelector from '../../../ProgramSelector';
import SimpleSelector from '../../../SimpleSelector';

function ScheduleFilters({ filters, onFilterChange, onClearFilters, courses, colleges, faculty, locations }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const semesters = ['1st Semester', '2nd Semester'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Whitelisted programs per college for filtering
  const allowedProgramsByCollege = {
    'College of Education, Arts, and Sciences': [
      'Bachelor of Elementary Education',
      'Bachelor of Secondary Education major in English',
      'Bachelor of Secondary Education major in Filipino',
      'Bachelor of Secondary Education major in Mathematics',
      'Bachelor of Arts in Political Science',
    ],
    'College of Technology, Management, and Entrepreneurship': [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Business Administration - Financial Management',
      'Bachelor of Science in Hospitality Management',
    ],
  };

  const filteredCourses = React.useMemo(() => {
    if (!filters.college_id) return [];
    const selectedCollege = colleges?.find(c => String(c.id) === String(filters.college_id));
    if (!selectedCollege) return [];
    
    // Filter by college_id first
    let list = (courses || []).filter(c => String(c.college_id) === String(selectedCollege.id));
    
    // Then filter by whitelist if it exists for this college
    const allowedList = allowedProgramsByCollege[selectedCollege.college_name];
    if (allowedList && allowedList.length > 0) {
      // Normalize for comparison (trim and case-insensitive)
      const normalize = (str) => (str || '').trim().toLowerCase();
      const normalizedAllowedList = allowedList.map(normalize);
      
      list = list.filter(c => {
        const normalizedCourseName = normalize(c.course_name);
        return normalizedAllowedList.includes(normalizedCourseName);
      });
    }
    
    return list;
  }, [filters.college_id, colleges, courses]);

  // Clear program filter if it's no longer allowed under the selected college
  React.useEffect(() => {
    if (!filters.course_id) return;
    const stillValid = filteredCourses.some(c => String(c.id) === String(filters.course_id));
    if (!stillValid) {
      onFilterChange('course_id', '');
    }
  }, [filteredCourses, filters.course_id, onFilterChange]);

  const filterLabelMap = {
    school_year: 'School Year',
    semester: 'Semester',
    college_id: 'College',
    course_id: 'Program',
    year_level: 'Year Level',
    faculty_id: 'Faculty',
    location_id: 'Location',
    section: 'Section',
    day_of_week: 'Day of Week'
  };

  const handleRemoveFilter = (key) => {
    onFilterChange(key, '');
  };

  // Handle school year input with auto-formatting
  const handleSchoolYearChange = (e) => {
    const input = e.target.value;
    
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    // Limit to 4 digits for the start year
    const startYear = digitsOnly.slice(0, 4);
    
    // Auto-format: if we have 4 digits, add "-" and calculate end year (+1)
    let formatted = '';
    if (startYear.length === 4) {
      const start = parseInt(startYear);
      if (start >= 2000 && start <= 2100) {
        const endYear = start + 1;
        formatted = `${startYear}-${endYear}`;
      } else {
        // Invalid year, just show what they typed
        formatted = startYear;
      }
    } else if (startYear.length > 0) {
      formatted = startYear;
    }
    
    onFilterChange('school_year', formatted);
  };

  // Handle school year input keydown for better UX (allow backspace, delete, arrow keys)
  const handleSchoolYearKeyDown = (e) => {
    // Allow: backspace, delete, tab, escape, enter, arrow keys
    if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Filter size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Filter Schedules</h3>
              <p className="text-blue-100 text-xs mt-0.5">
                {hasActiveFilters ? `${Object.values(filters).filter(v => v).length} filter${Object.values(filters).filter(v => v).length !== 1 ? 's' : ''} active` : 'No active filters'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium text-sm focus:outline-none"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors bg-transparent focus:outline-none"
            >
              <ChevronDown size={20} className={`transform transition-transform ${!isExpanded ? '-rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="bg-white rounded-b-xl shadow-lg border border-blue-100 p-6 space-y-6">
          {/* Primary Filters Section */}
          <div>
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
              Schedule Period
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* School Year */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  School Year
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="school_year"
                    value={filters.school_year || ''}
                    onChange={handleSchoolYearChange}
                    onKeyDown={handleSchoolYearKeyDown}
                    placeholder="Type year"
                    maxLength={9}
                    className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Semester */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  Semester
                </label>
                <SimpleSelector
                  options={semesters.map(sem => ({ value: sem, label: sem }))}
                  value={filters.semester || ''}
                  onChange={(semester) => onFilterChange('semester', semester)}
                  placeholder="Select Semester"
                  searchable={false}
                />
              </div>

              {/* College */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blue-600" />
                  College
                </label>
                <SimpleSelector
                  options={colleges?.map(college => ({ value: college.id, label: college.college_name })) || []}
                  value={filters.college_id || ''}
                  onChange={(collegeId) => onFilterChange('college_id', collegeId)}
                  placeholder="Select College"
                  searchable={true}
                />
              </div>

              {/* Program */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-purple-600" />
                  Program
                </label>
                <ProgramSelector
                  programs={filteredCourses || []}
                  colleges={colleges || []}
                  value={filters.course_id || ''}
                  onChange={(courseId) => onFilterChange('course_id', courseId)}
                  placeholder={filters.college_id ? 'Select Program' : 'Select College first'}
                  disabled={!filters.college_id}
                />
              </div>
            </div>
          </div>

          {/* Secondary Filters Section */}
          <div className="border-t pt-6">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
              Program Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Year Level */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-600" />
                  Year Level
                </label>
                <SimpleSelector
                  options={yearLevels.map(year => ({ value: year, label: year }))}
                  value={filters.year_level || ''}
                  onChange={(yearLevel) => onFilterChange('year_level', yearLevel)}
                  placeholder="Select Year Level"
                  searchable={false}
                />
              </div>

              {/* Section */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-600" />
                  Section
                </label>
                <SimpleSelector
                  options={[
                    { value: 'A', label: 'A' },
                    { value: 'B', label: 'B' },
                    { value: 'C', label: 'C' },
                    { value: 'D', label: 'D' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' }
                  ]}
                  value={filters.section || ''}
                  onChange={(section) => onFilterChange('section', section)}
                  placeholder="Select Section"
                  searchable={false}
                />
              </div>

              {/* Day of Week */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  Day of Week
                </label>
                <SimpleSelector
                  options={days.map(day => ({ value: day, label: day }))}
                  value={filters.day_of_week || ''}
                  onChange={(day) => onFilterChange('day_of_week', day)}
                  placeholder="Select Day"
                  searchable={false}
                />
              </div>

              {/* Faculty */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <User size={16} className="text-emerald-600" />
                  Faculty
                </label>
                <SimpleSelector
                  options={faculty?.map(fac => ({ value: fac.id, label: `${fac.first_name} ${fac.last_name}` })) || []}
                  value={filters.faculty_id || ''}
                  onChange={(facultyId) => onFilterChange('faculty_id', facultyId)}
                  placeholder={!faculty?.length ? 'No Faculty Available' : 'Select Faculty'}
                  disabled={!faculty?.length}
                  searchable={true}
                />
                {!faculty?.length && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1 font-medium">
                    <AlertCircle size={13} />
                    No faculty members registered
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tertiary Filters Section */}
          <div className="border-t pt-6">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <div className="w-1 h-4 bg-orange-600 rounded-full"></div>
              Resources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location */}
              <div className="group lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-orange-600" />
                  Location
                </label>
                <LocationSelector
                  locations={locations || []}
                  value={filters.location_id || ''}
                  onChange={(locationId) => onFilterChange('location_id', locationId)}
                  placeholder="Select Location"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Active Filters</p>
                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-bold">
                  {Object.values(filters).filter(v => v).length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  
                  let displayValue = value;
                  
                  // Get display names for IDs
                  if (key === 'college_id') {
                    const college = colleges?.find(c => String(c.id) === String(value));
                    displayValue = college?.college_name || value;
                  } else if (key === 'course_id') {
                    const course = courses?.find(c => String(c.id) === String(value));
                    displayValue = course?.course_name || value;
                  } else if (key === 'faculty_id') {
                    const fac = faculty?.find(f => String(f.id) === String(value));
                    displayValue = fac ? `${fac.first_name} ${fac.last_name}` : value;
                  } else if (key === 'location_id') {
                    const loc = locations?.find(l => String(l.id) === String(value));
                    displayValue = loc?.name || value;
                  }

                  const label = filterLabelMap[key];

                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-300 text-xs rounded-full font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      <span className="font-semibold">{label}:</span>
                      <span className="truncate max-w-[120px]">{displayValue}</span>
                      <button
                        onClick={() => handleRemoveFilter(key)}
                        className="ml-0.5 p-0.5 hover:bg-blue-200 rounded-full transition-colors flex-shrink-0 bg-transparent"
                        title={`Remove ${label} filter`}
                      >
                        <X size={14} className="text-blue-600" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScheduleFilters;
