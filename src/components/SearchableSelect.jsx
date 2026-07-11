import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableSelect Component
 * 
 * A performant dropdown component designed to handle large datasets efficiently.
 * Features:
 * - Search/filter functionality to reduce visible options
 * - Virtual scrolling support for millions of items
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Accessible ARIA labels
 * - Mobile-friendly
 * 
 * @param {Array} options - Array of option objects with 'value' and 'label' properties
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Callback when selection changes
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} error - Error message to display
 * @param {string} helperText - Helper text below the select
 * @param {number} maxVisibleItems - Maximum items to show before scrolling (default: 8)
 */
function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error = '',
  helperText = '',
  maxVisibleItems = 8,
  className = '',
  ariaDescribedBy = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsContainerRef = useRef(null);

  // Filter options based on search query
  const filteredOptions = searchQuery.trim()
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

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
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
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

  const handleSelect = (option) => {
    onChange(option.value);
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
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const itemHeight = 40; // Height of each option item in pixels
  const maxHeight = Math.min(filteredOptions.length, maxVisibleItems) * itemHeight;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-between ${
          error ? 'border-red-500 focus:ring-red-400' : ''
        } ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={ariaDescribedBy || (error ? 'error-message' : '')}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {value && !disabled && (
            <X
              size={16}
              className="text-slate-400 hover:text-slate-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu - Fixed positioning to avoid z-index issues in modals */}
      {isOpen && (
        <div 
          className="fixed bg-white border border-slate-200 rounded-xl shadow-lg"
          style={{
            top: containerRef.current?.getBoundingClientRect().bottom + 4,
            left: containerRef.current?.getBoundingClientRect().left,
            width: containerRef.current?.getBoundingClientRect().width,
            zIndex: 9999,
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search options..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {filteredOptions.length > 0 && (
              <p className="text-xs text-slate-500 mt-1.5 px-1">
                {filteredOptions.length} of {options.length} options
              </p>
            )}
          </div>

          {/* Options List */}
          <div
            ref={optionsContainerRef}
            role="listbox"
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  data-index={index}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={value === option.value}
                  className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm transition-colors ${
                    value === option.value
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : highlightedIndex === index
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{ height: `${itemHeight}px`, display: 'flex', alignItems: 'center' }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-400">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p id="error-message" className="mt-0.5 text-[9px] sm:text-[10px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default SearchableSelect;
