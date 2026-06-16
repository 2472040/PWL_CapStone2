import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './app-icons';

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  style?: React.CSSProperties;
  placeholder?: string;
}

export function CustomSelect({ value, onChange, options, style, placeholder }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || {
    label: placeholder || value,
    value,
  };

  return (
    <div
      ref={containerRef}
      className="custom-select-container"
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption.label}</span>
        <Icon name="chevD" size={10} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <ul className="custom-select-options" role="listbox" data-lenis-prevent>
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
