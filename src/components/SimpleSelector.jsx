import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SimpleSelector Component
 * 
 * A reusable enhanced dropdown for simple list selections with:
 * - Search functionality for quick filtering
 * - Keyboard navigation support
 * - Modal-style centered dropdown
 * - Mobile-friendly design
 */
function SimpleSelector({
  options = [],
  value,
  onChange,
  placeholder = 'Select Option',
  disabled = false,
  maxVisibleItems = 10,
  searchable = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMouseInteraction, setIsMouseInteraction] = useState(false);
  const instanceId = useRef(`simplesel-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  const containerRef = useRef(null);
  const portalRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsContainerRef = useRef(null);
  const buttonRef = useRef(null);

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

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    window.dispatchEvent(new CustomEvent('selector-open', { detail: { id: instanceId.current } }));
  }, []);

  // Memoize filtered options to prevent unnecessary recalculations
  const filteredOptions = useMemo(() => {
    return searchQuery.trim()
      ? options.filter(opt =>
          String(opt.label || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;
  }, [options, searchQuery]);

  // Normalize to string to avoid type mismatch (e.g., "1" vs 1) when checking selected
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Close dropdown when clicking outside - memoized callback
  const handleClickOutside = useCallback((e) => {
    const clickedInsideTrigger = containerRef.current?.contains(e.target);
    const clickedInsidePortal = portalRef.current?.contains(e.target);
    if (!clickedInsideTrigger && !clickedInsidePortal) {
      setIsOpen(false);
      setSearchQuery('');
      // Blur any focused element when closing
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName !== 'BODY') {
          activeElement.blur();
        }
      }, 0);
    }
  }, []);

  // Add/remove event listener for outside clicks
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure this runs after the current event loop
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      // Prevent focus from moving to other elements when dropdown is open
      const preventFocusShift = (e) => {
        // If clicking on another SimpleSelector button while this dropdown is open
        const target = e.target;
        const isOtherSelector = target.closest('[aria-haspopup="listbox"]') && 
                                target.closest('[aria-haspopup="listbox"]') !== containerRef.current?.querySelector('button');
        if (isOtherSelector) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      document.addEventListener('mousedown', preventFocusShift, true);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('mousedown', preventFocusShift, true);
      };
    }
  }, [isOpen, handleClickOutside]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    } else if (isOpen && !searchable) {
      // If not searchable, blur any active element to prevent cursor from appearing
      // in adjacent fields
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName !== 'BODY') {
          activeElement.blur();
        }
        // Also ensure button is blurred
        if (buttonRef.current) {
          buttonRef.current.blur();
        }
      }, 0);
    }
  }, [isOpen, searchable]);

  // Aggressively prevent focus on button when mouse is used
  useEffect(() => {
    if (isMouseInteraction && buttonRef.current) {
      buttonRef.current.setAttribute('tabindex', '-1');
      buttonRef.current.blur();
    } else if (!isMouseInteraction && buttonRef.current && !disabled) {
      buttonRef.current.setAttribute('tabindex', '0');
    }
  }, [isMouseInteraction, disabled]);

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

  const handleSelect = useCallback((option) => {
    // Only update if the value has changed
    if (option.value !== value) {
      onChange(option.value);
    }
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
    // Blur any focused element when selecting
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== 'BODY') {
        activeElement.blur();
      }
    }, 0);
  }, [onChange, value]);

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(0);
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== 'BODY') {
        activeElement.blur();
      }
    }, 0);
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} transition-opacity duration-200`}
      style={{ willChange: 'opacity' }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openDropdown();
            }
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-[#4285F4] text-sm transition-colors appearance-none bg-white cursor-pointer flex items-center justify-between disabled:bg-slate-50 disabled:cursor-not-allowed"
        style={{ 
          caretColor: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onMouseDown={(e) => {
          // Prevent default to stop the button from receiving focus
          e.preventDefault();
          e.stopPropagation();
          setIsMouseInteraction(true);
          
          // Make button non-focusable immediately
          if (buttonRef.current) {
            buttonRef.current.setAttribute('tabindex', '-1');
            buttonRef.current.blur();
          }
          
          if (!disabled) {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openDropdown();
            }
          }
          
          // Immediately blur any focused element
          const activeElement = document.activeElement;
          if (activeElement && activeElement.tagName !== 'BODY') {
            activeElement.blur();
          }
          
          // Reset after a short delay to allow keyboard navigation
          setTimeout(() => {
            setIsMouseInteraction(false);
            if (buttonRef.current && !disabled) {
              buttonRef.current.setAttribute('tabindex', '0');
            }
          }, 200);
        }}
        onFocus={(e) => {
          // If focus came from mouse, blur immediately
          if (isMouseInteraction) {
            setTimeout(() => {
              e.target.blur();
            }, 0);
            return;
          }
          // Prevent text cursor from appearing
          e.target.style.caretColor = 'transparent';
        }}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onMouseDown={(e) => {
                // keep parent button from toggling / stealing focus
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-slate-600 bg-transparent"
              aria-label="Clear selection"
            >
              <X size={16} />
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

      {/* Dropdown Menu - Centered Modal (rendered in portal to avoid parent stacking contexts) */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
                setSearchQuery('');
                // Blur any focused element
                const activeElement = document.activeElement;
                if (activeElement && activeElement.tagName !== 'BODY') {
                  activeElement.blur();
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ zIndex: 50000 }}
            />
            
            {/* Centered Dropdown */}
            <div 
              className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              ref={portalRef}
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(95vw, 500px)',
                maxHeight: '75vh',
                zIndex: 50001,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Search Input */}
              {searchable && (
                <div className="p-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setHighlightedIndex(0);
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#4285F4]"
                    />
                  </div>
                  {filteredOptions.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2 px-1">
                      {filteredOptions.length} option{filteredOptions.length !== 1 ? 's' : ''} found
                    </p>
                  )}
                </div>
              )}

              {/* Options List */}
              <div
                ref={optionsContainerRef}
                role="listbox"
                className="overflow-y-auto flex-1"
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                    const isHighlighted = index === highlightedIndex;
                    const isSelected = String(value) === String(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
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
                        <span className="flex-1 truncate">{option.label}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No options found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export default SimpleSelector;
