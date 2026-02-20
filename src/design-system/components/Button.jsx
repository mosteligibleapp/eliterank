import React, { forwardRef } from 'react';
import { tokens } from '../tokens';

/**
 * Button Component
 * 
 * Variants:
 * - primary: Gold gradient, bold (main CTAs like "Vote Now")
 * - secondary: Outlined, subtle
 * - ghost: Text only, hover state
 * - danger: Red for destructive actions
 * 
 * @example
 * <Button variant="primary" size="lg">Vote Now</Button>
 * <Button variant="secondary" icon={<HeartIcon />}>Like</Button>
 * <Button loading>Processing...</Button>
 */

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  
  // Base styles
  const baseStyles = `
    inline-flex items-center justify-center
    font-semibold
    transition-all duration-200
    focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    select-none
  `;
  
  // Size variants
  const sizeStyles = {
    sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-12 px-6 text-base gap-2 rounded-lg',
    xl: 'h-14 px-8 text-lg gap-3 rounded-xl',
  };
  
  // Variant styles
  const variantStyles = {
    primary: `
      bg-gradient-to-r from-gold-600 via-gold to-gold-400
      text-bg-primary
      shadow-md
      hover:shadow-glow-gold hover:brightness-110
      active:brightness-95
    `,
    secondary: `
      bg-transparent
      border border-border-strong
      text-text-primary
      hover:bg-bg-hover hover:border-gold/50
      active:bg-bg-elevated
    `,
    ghost: `
      bg-transparent
      text-text-secondary
      hover:text-text-primary hover:bg-bg-hover
      active:bg-bg-elevated
    `,
    danger: `
      bg-error
      text-white
      hover:bg-error-dark hover:shadow-glow-error
      active:brightness-95
    `,
  };
  
  // Icon-only styles (when no children)
  const iconOnlyStyles = {
    sm: 'h-8 w-8 p-0',
    md: 'h-10 w-10 p-0',
    lg: 'h-12 w-12 p-0',
    xl: 'h-14 w-14 p-0',
  };
  
  const isIconOnly = icon && !children;
  
  const combinedStyles = [
    baseStyles,
    isIconOnly ? iconOnlyStyles[size] : sizeStyles[size],
    variantStyles[variant],
    fullWidth && 'w-full',
    className,
  ].filter(Boolean).join(' ');
  
  // Loading spinner
  const Spinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={combinedStyles}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {children && <span className="ml-2">{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

/**
 * Button Group - For related actions
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`inline-flex rounded-lg overflow-hidden ${className}`}>
    {React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        className: `
          ${child.props.className || ''}
          rounded-none
          ${index === 0 ? 'rounded-l-lg' : ''}
          ${index === React.Children.count(children) - 1 ? 'rounded-r-lg' : ''}
          ${index !== 0 ? 'border-l-0' : ''}
        `,
      });
    })}
  </div>
);

/**
 * Icon Button - Square button for icons only
 */
export const IconButton = forwardRef(({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}, ref) => (
  <Button
    ref={ref}
    variant={variant}
    size={size}
    icon={icon}
    aria-label={label}
    className={className}
    {...props}
  />
));

IconButton.displayName = 'IconButton';

export default Button;

// Pre-configured button variants for common use cases
export const PrimaryButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="primary" {...props} />
));
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
));
SecondaryButton.displayName = 'SecondaryButton';

export const GhostButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="ghost" {...props} />
));
GhostButton.displayName = 'GhostButton';

export const DangerButton = forwardRef((props, ref) => (
  <Button ref={ref} variant="danger" {...props} />
));
DangerButton.displayName = 'DangerButton';
