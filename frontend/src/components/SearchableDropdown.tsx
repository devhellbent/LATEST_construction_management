import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableDropdownOption {
  value: string | number;
  label: string;
  searchText?: string; // Additional text to search in
  disabled?: boolean;
}

interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  showSearch?: boolean;
  maxHeight?: string;
  loading?: boolean;
  emptyMessage?: string;
  onSearch?: (query: string) => void;
  allowClear?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className = "",
  disabled = false,
  required = false,
  error,
  label,
  showSearch = true,
  maxHeight = "200px",
  loading = false,
  emptyMessage = "No options found",
  onSearch,
  allowClear = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<SearchableDropdownOption[]>(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => {
        const searchText = option.searchText || option.label;
        return searchText.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredOptions(filtered);
    }
  }, [searchQuery, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, showSearch]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option: SearchableDropdownOption) => {
    if (option.disabled) return;
    
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  // Get selected option label
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Dropdown Button */}
      <div
        className={`
          relative w-full px-3 py-2 border rounded-lg cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate ${!displayValue ? 'text-gray-500' : 'text-gray-900'}`}>
            {displayValue || placeholder}
          </span>
          <div className="flex items-center space-x-1">
            {allowClear && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-[99999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div 
            className="overflow-y-auto"
            style={{ maxHeight }}
            role="listbox"
          >
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`
                    px-3 py-2 text-sm cursor-pointer transition-colors duration-150
                    ${option.disabled 
                      ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                      : 'text-gray-900 hover:bg-blue-50'
                    }
                    ${option.value === value ? 'bg-blue-100 text-blue-900' : ''}
                  `}
                  onClick={() => handleOptionSelect(option)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default SearchableDropdown;
