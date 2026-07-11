import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, GraduationCap } from 'lucide-react';

/**
 * ProgramSelector Component
 * 
 * An enhanced dropdown for selecting programs with:
 * - Grouped by college for better organization
 * - Search functionality for quick filtering
 * - Keyboard navigation support
 * - Mobile-friendly design
 */
function ProgramSelector({
  programs = [],
  colleges = [],
  value,
  onChange,
  placeholder = 'Select Program',
  disabled = false,
  maxVisibleItems = 10,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const instanceId = useRef(`programsel-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsContainerRef = useRef(null);

  // Ensure only one selector is open at a time across the page
  useEffect(() => {
    const handleSelectorOpen = (e) => {
      if (e.detail?.id !== instanceId.current) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('selector-open', handleSelectorOpen);
    return () => window.removeEventListener('selector-open', handleSelectorOpen);
  }, []);

  const openDropdown = () => {
    setIsOpen(true);
    window.dispatchEvent(new CustomEvent('selector-open', { detail: { id: instanceId.current } }));
  };

  // Group programs by college
  const groupedPrograms = programs.reduce((acc, program) => {
    const college = colleges?.find(c => c.id === program.college_id);
    const collegeName = college?.college_name || 'Other';
    
    if (!acc[collegeName]) {
      acc[collegeName] = [];
    }
    acc[collegeName].push(program);
    return acc;
  }, {});

  // Sort colleges and their programs
  const sortedGroupedPrograms = Object.entries(groupedPrograms).sort(([a], [b]) => a.localeCompare(b));

  // Filter programs based on search query
  const filteredGroupedPrograms = searchQuery.trim()
    ? Object.entries(groupedPrograms).reduce((acc, [collegeName, progs]) => {
        const filtered = progs.filter(prog =>
          prog.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          collegeName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[collegeName] = filtered;
        }
        return acc;
      }, {})
    : Object.fromEntries(sortedGroupedPrograms);

  // Flatten for indexed access
  const flattenedPrograms = Object.values(filteredGroupedPrograms).flat();
  const selectedProgram = programs.find(prog => prog.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < flattenedPrograms.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flattenedPrograms[highlightedIndex]) {
          handleSelect(flattenedPrograms[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  const handleSelect = (program) => {
    onChange(program.id);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (optionsContainerRef.current && isOpen) {
      const highlightedElement = optionsContainerRef.current.querySelector(
        '[data-highlighted="true"]'
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Calculate max height
  const itemHeight = 44;
  const maxHeight = Math.min(flattenedPrograms.length + Object.keys(filteredGroupedPrograms).length, maxVisibleItems) * itemHeight;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            setIsOpen(false);
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4285F4] text-sm transition-colors appearance-none bg-white cursor-pointer flex items-center justify-between disabled:bg-slate-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate text-left">
          {selectedProgram ? selectedProgram.course_name : placeholder}
        </span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0 bg-transparent border-none hover:bg-transparent rounded transition-colors flex-shrink-0"
              style={{ backgroundColor: 'transparent' }}
              title="Clear selection"
            >
              <X size={16} className="opacity-50 hover:opacity-100" />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu - Centered Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/25 z-[9998]"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          
          {/* Centered Dropdown */}
          <div 
            className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(95vw, 600px)',
              maxHeight: '75vh',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by college name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#4285F4]"
              />
            </div>
            {Object.keys(filteredGroupedPrograms).length > 0 && (
              <p className="text-xs text-gray-500 mt-2 px-1">
                {flattenedPrograms.length} program{flattenedPrograms.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

            {/* Options List */}
            <div
              ref={optionsContainerRef}
              role="listbox"
              className="overflow-y-auto flex-1"
            >
            {Object.keys(filteredGroupedPrograms).length > 0 ? (
              Object.entries(filteredGroupedPrograms).map(([collegeName, progs], groupIndex) => (
                <div key={collegeName}>
                  {/* College Group Header */}
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-purple-600 flex-shrink-0" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        {collegeName}
                      </h3>
                      <span className="ml-auto text-xs font-medium text-gray-500">
                        {progs.length}
                      </span>
                    </div>
                  </div>

                  {/* Program Items */}
                  {progs.map((program, itemIndex) => {
                    const globalIndex = flattenedPrograms.indexOf(program);
                    const isHighlighted = globalIndex === highlightedIndex;
                    const isSelected = value === program.id;

                    return (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() => handleSelect(program)}
                        onMouseEnter={() => setHighlightedIndex(globalIndex)}
                        role="option"
                        aria-selected={isSelected}
                        data-highlighted={isHighlighted}
                        className={`w-full px-4 py-3.5 text-left text-sm transition-colors border-b border-gray-50 last:border-b-0 flex items-center ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : isHighlighted
                            ? 'bg-blue-100 text-gray-900'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex-1 truncate">{program.course_name}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No programs found matching "{searchQuery}"
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProgramSelector;
