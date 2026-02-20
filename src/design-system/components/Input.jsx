import React, { forwardRef, useState } from 'react';

/**
 * Input Component
 * 
 * Types:
 * - text: Standard text input
 * - search: Search input with icon
 * - number: Number input with optional stepper
 * - password: Password with show/hide toggle
 * - textarea: Multi-line text
 * 
 * @example
 * <Input placeholder="Search..." />
 * <Input type="search" icon={<SearchIcon />} />
 * <Input type="number" min={1} max={100} />
 * <Select options={[...]} />
 */

const Input = forwardRef(({
  type = 'text',
  size = 'md',
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  className = '',
  inputClassName = '',
  fullWidth = true,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  
  // Size configurations
  const sizes = {
    sm: {
      input: 'h-8 px-3 text-sm',
      icon: 'w-4 h-4',
      iconPadding: 'pl-8',
      label: 'text-xs mb-1',
    },
    md: {
      input: 'h-10 px-4 text-sm',
      icon: 'w-4 h-4',
      iconPadding: 'pl-10',
      label: 'text-sm mb-1.5',
    },
    lg: {
      input: 'h-12 px-4 text-base',
      icon: 'w-5 h-5',
      iconPadding: 'pl-11',
      label: 'text-sm mb-2',
    },
  };
  
  const sizeConfig = sizes[size];
  
  // Base input styles
  const baseInputStyles = `
    ${sizeConfig.input}
    ${fullWidth ? 'w-full' : ''}
    bg-bg-elevated
    border border-border
    rounded-lg
    text-text-primary
    placeholder:text-text-muted
    transition-all duration-200
    focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-error focus:border-error focus:ring-error/50' : ''}
    ${icon && iconPosition === 'left' ? sizeConfig.iconPadding : ''}
    ${icon && iconPosition === 'right' ? 'pr-10' : ''}
  `;
  
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className={`block ${sizeConfig.label} font-medium text-text-secondary`}>
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Left icon */}
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {React.cloneElement(icon, { className: sizeConfig.icon })}
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          className={`${baseInputStyles} ${inputClassName}`}
          {...props}
        />
        
        {/* Right icon or password toggle */}
        {type === 'password' ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPassword ? (
              <EyeOffIcon className={sizeConfig.icon} />
            ) : (
              <EyeIcon className={sizeConfig.icon} />
            )}
          </button>
        ) : icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {React.cloneElement(icon, { className: sizeConfig.icon })}
          </div>
        )}
      </div>
      
      {/* Error or hint text */}
      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-error' : 'text-text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Search Input - Pre-configured search input
 */
export const SearchInput = forwardRef(({
  placeholder = 'Search...',
  onClear,
  value,
  ...props
}, ref) => (
  <div className="relative">
    <Input
      ref={ref}
      type="search"
      placeholder={placeholder}
      value={value}
      icon={<SearchIcon />}
      {...props}
    />
    {value && onClear && (
      <button
        type="button"
        onClick={onClear}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
      >
        <XIcon className="w-4 h-4" />
      </button>
    )}
  </div>
));

SearchInput.displayName = 'SearchInput';

/**
 * Number Input - With increment/decrement buttons
 */
export const NumberInput = forwardRef(({
  min,
  max,
  step = 1,
  value,
  onChange,
  size = 'md',
  ...props
}, ref) => {
  const handleIncrement = () => {
    const newValue = (Number(value) || 0) + step;
    if (max === undefined || newValue <= max) {
      onChange?.({ target: { value: newValue } });
    }
  };
  
  const handleDecrement = () => {
    const newValue = (Number(value) || 0) - step;
    if (min === undefined || newValue >= min) {
      onChange?.({ target: { value: newValue } });
    }
  };
  
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={min !== undefined && Number(value) <= min}
        className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <MinusIcon className="w-4 h-4" />
      </button>
      
      <Input
        ref={ref}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        size={size}
        inputClassName="text-center px-10"
        fullWidth={false}
        {...props}
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && Number(value) >= max}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

NumberInput.displayName = 'NumberInput';

/**
 * Textarea - Multi-line text input
 */
export const Textarea = forwardRef(({
  label,
  error,
  hint,
  rows = 4,
  className = '',
  ...props
}, ref) => (
  <div className={`w-full ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}
      </label>
    )}
    
    <textarea
      ref={ref}
      rows={rows}
      className={`
        w-full px-4 py-3
        bg-bg-elevated
        border border-border
        rounded-lg
        text-text-primary text-sm
        placeholder:text-text-muted
        transition-all duration-200
        focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50
        disabled:opacity-50 disabled:cursor-not-allowed
        resize-y min-h-[100px]
        ${error ? 'border-error focus:border-error focus:ring-error/50' : ''}
      `}
      {...props}
    />
    
    {(error || hint) && (
      <p className={`mt-1.5 text-xs ${error ? 'text-error' : 'text-text-muted'}`}>
        {error || hint}
      </p>
    )}
  </div>
));

Textarea.displayName = 'Textarea';

/**
 * Select - Dropdown select input
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  options = [],
  placeholder = 'Select...',
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-4 text-base',
  };
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full ${sizes[size]}
            bg-bg-elevated
            border border-border
            rounded-lg
            text-text-primary
            appearance-none
            cursor-pointer
            transition-all duration-200
            focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-error focus:border-error focus:ring-error/50' : ''}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>
      
      {(error || hint) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-error' : 'text-text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Icon components
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MinusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default Input;
