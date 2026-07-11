import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, MapPin } from 'lucide-react';

/**
 * LocationSelector Component
 * 
 * An enhanced dropdown for selecting locations with:
 * - Grouped by building for better organization
 * - Search functionality for quick filtering
 * - Capacity information displayed visually
 * - Keyboard navigation support
 * - Mobile-friendly design
 */
function LocationSelector({
  locations = [],
  value,
  onChange,
  placeholder = 'Select Location',
  disabled = false,
  maxVisibleItems = 10,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const instanceId = useRef(`locationsel-${Math.random().toString(36).slice(2)}-${Date.now()}`);
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

  // Group locations by building
  const groupedLocations = locations.reduce((acc, location) => {
    // Prefer explicit building column, fallback to parsing name, then 'Other'
    const explicitBuilding = `${location.building || ''}`.trim();
    const name = `${location.name || ''}`;
    const buildingMatch = name.match(/^([^-]+)/);
    const parsedBuilding = buildingMatch ? buildingMatch[1].trim() : '';
    const building = explicitBuilding || parsedBuilding || 'Other';
    
    if (!acc[building]) {
      acc[building] = [];
    }
    acc[building].push(location);
    return acc;
  }, {});

  // Sort buildings and their locations
  const sortedGroupedLocations = Object.entries(groupedLocations).sort(([a], [b]) => a.localeCompare(b));

  // Filter locations based on search query
  const filteredGroupedLocations = searchQuery.trim()
    ? Object.entries(groupedLocations).reduce((acc, [building, locs]) => {
        const filtered = locs.filter(loc =>
          `${loc.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${loc.location_code || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${loc.type || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          building.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[building] = filtered;
        }
        return acc;
      }, {})
    : Object.fromEntries(sortedGroupedLocations);

  // Flatten for indexed access
  const flattenedLocations = Object.values(filteredGroupedLocations).flat();
  const selectedLocation = locations.find(loc => loc.id === value);

  const shouldShowGroupHeaders = Object.keys(filteredGroupedLocations).length > 1;

  const isLocationSelectable = (location) => location?.is_available !== false;

  const findNextSelectableIndex = (startIndex, direction) => {
    if (!flattenedLocations.length) return 0;
    const step = direction === 'up' ? -1 : 1;
    let idx = startIndex;
    while (idx >= 0 && idx < flattenedLocations.length) {
      if (isLocationSelectable(flattenedLocations[idx])) return idx;
      idx += step;
    }
    return startIndex;
  };

  const getPrimaryLabel = (location) => {
    const code = location.location_code || '';
    const title = location.name || '';
    if (code && title && code.toLowerCase() !== title.toLowerCase()) {
      return `${code} · ${title}`;
    }
    return code || title || 'Unnamed Location';
  };

  const getSecondaryLabel = (location) => {
    const meta = [];
    if (location.building) meta.push(location.building);
    if (location.type) meta.push(location.type);
    return meta.join(' • ');
  };

  const getAvailabilityBadge = (isAvailable) => {
    if (isAvailable === undefined) return null;
    return isAvailable
      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : 'bg-red-100 text-red-700 border border-red-200';
  };

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

  // Ensure highlighted item is selectable when list changes / opens
  useEffect(() => {
    if (!isOpen) return;
    if (!flattenedLocations.length) return;
    if (isLocationSelectable(flattenedLocations[highlightedIndex])) return;
    const nextIdx = findNextSelectableIndex(0, 'down');
    if (nextIdx !== highlightedIndex) setHighlightedIndex(nextIdx);
  }, [isOpen, flattenedLocations.length, searchQuery]);

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
        setHighlightedIndex(prev => {
          const nextBase = prev < flattenedLocations.length - 1 ? prev + 1 : prev;
          return findNextSelectableIndex(nextBase, 'down');
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const nextBase = prev > 0 ? prev - 1 : 0;
          return findNextSelectableIndex(nextBase, 'up');
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (flattenedLocations[highlightedIndex] && isLocationSelectable(flattenedLocations[highlightedIndex])) {
          handleSelect(flattenedLocations[highlightedIndex]);
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

  const handleSelect = (location) => {
    if (!isLocationSelectable(location)) return;
    onChange(location.id);
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
  const maxHeight = Math.min(flattenedLocations.length + Object.keys(filteredGroupedLocations).length, maxVisibleItems) * itemHeight;

  // Get capacity color based on capacity value
  const getCapacityColor = (capacity) => {
    if (!capacity) return 'bg-gray-100 text-gray-600';
    if (capacity >= 100) return 'bg-green-100 text-green-700';
    if (capacity >= 50) return 'bg-blue-100 text-blue-700';
    if (capacity >= 30) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  };

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
        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm transition-colors appearance-none bg-white cursor-pointer flex items-center justify-between disabled:bg-gray-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex flex-col items-start w-full">
          {selectedLocation ? (
            <>
              <span className="text-sm font-semibold text-gray-900 truncate w-full">
                {getPrimaryLabel(selectedLocation)}
              </span>
              {(selectedLocation.building || selectedLocation.type) && (
                <span className="text-xs text-gray-500 truncate w-full">
                  {getSecondaryLabel(selectedLocation)}
                </span>
              )}
            </>
          ) : (
            <span className="truncate text-left">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {value && !disabled && (
            <X
              size={16}
              className="text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${
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
            className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
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
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by room or building..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            {Object.keys(filteredGroupedLocations).length > 0 && (
              <p className="text-xs text-gray-500 mt-2 px-1">
                {flattenedLocations.length} location{flattenedLocations.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

            {/* Options List */}
            <div
              ref={optionsContainerRef}
              role="listbox"
              className="overflow-y-auto flex-1"
            >
            {Object.keys(filteredGroupedLocations).length > 0 ? (
              Object.entries(filteredGroupedLocations).map(([building, locs], groupIndex) => (
                <div key={building}>
                  {/* Building Group Header */}
                  {shouldShowGroupHeaders && (
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-orange-600 flex-shrink-0" />
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                          {building}
                        </h3>
                        <span className="ml-auto text-xs font-medium text-gray-500">
                          {locs.length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Location Items */}
                  {locs.map((location, itemIndex) => {
                    const globalIndex = flattenedLocations.indexOf(location);
                    const isHighlighted = globalIndex === highlightedIndex;
                    const isSelected = value === location.id;
                    const isSelectable = isLocationSelectable(location);

                    return (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => handleSelect(location)}
                        onMouseEnter={() => {
                          if (!isSelectable) return;
                          setHighlightedIndex(globalIndex);
                        }}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={!isSelectable}
                        disabled={!isSelectable}
                        data-highlighted={isHighlighted}
                        className={`w-full px-4 py-3.5 text-left text-sm transition-colors border-b border-gray-50 last:border-b-0 flex items-center gap-3 ${
                          !isSelectable
                            ? 'bg-white text-gray-400 cursor-not-allowed opacity-70'
                            : isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : isHighlighted
                            ? 'bg-blue-100 text-gray-900'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {location.location_code || location.name}
                            </span>
                            {location.type && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {location.type}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {location.name}
                            {location.building ? ` • ${location.building}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {location.capacity && (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getCapacityColor(location.capacity)}`}>
                              {location.capacity} seats
                            </span>
                          )}
                          {location.is_available !== undefined && (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap ${getAvailabilityBadge(location.is_available)}`}>
                              {location.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No locations found matching "{searchQuery}"
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LocationSelector;
