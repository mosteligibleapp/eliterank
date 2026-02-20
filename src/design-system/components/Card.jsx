import React, { forwardRef } from 'react';

/**
 * Card Component
 * 
 * Variants:
 * - default: Standard content card
 * - elevated: Raised with shadow (like Posh event cards)
 * - interactive: Hover states, clickable
 * - featured: Gold border glow (for winners, top contestants)
 * - glass: Glassmorphism effect
 * 
 * @example
 * <Card variant="featured">
 *   <CardHeader>Winner</CardHeader>
 *   <CardBody>Content here</CardBody>
 * </Card>
 */

const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'default',
  className = '',
  onClick,
  href,
  as,
  ...props
}, ref) => {
  
  // Base styles
  const baseStyles = `
    rounded-xl
    overflow-hidden
  `;
  
  // Padding variants
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    default: 'p-5',
    lg: 'p-6',
  };
  
  // Variant styles
  const variantStyles = {
    default: `
      bg-bg-card
      border border-border
    `,
    elevated: `
      bg-bg-elevated
      border border-border
      shadow-md
    `,
    interactive: `
      bg-bg-card
      border border-border
      cursor-pointer
      transition-all duration-200
      hover:bg-bg-elevated hover:border-border-strong hover:-translate-y-0.5 hover:shadow-md
      active:translate-y-0
    `,
    featured: `
      bg-bg-card
      border border-border-gold
      shadow-glow-gold
      relative
      before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-gold/5 before:to-transparent before:pointer-events-none
    `,
    glass: `
      glass
      backdrop-blur-xl
    `,
  };
  
  const combinedStyles = [
    baseStyles,
    paddingStyles[padding],
    variantStyles[variant],
    className,
  ].filter(Boolean).join(' ');
  
  // Determine the component to render
  const Component = as || (href ? 'a' : onClick ? 'button' : 'div');
  
  const componentProps = {
    ref,
    className: combinedStyles,
    onClick,
    ...(href && { href }),
    ...(Component === 'button' && { type: 'button' }),
    ...props,
  };
  
  return <Component {...componentProps}>{children}</Component>;
});

Card.displayName = 'Card';

/**
 * Card Header
 */
export const CardHeader = ({ 
  children, 
  className = '',
  actions,
  ...props 
}) => (
  <div 
    className={`flex items-center justify-between mb-4 ${className}`}
    {...props}
  >
    <div className="flex-1">{children}</div>
    {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
  </div>
);

/**
 * Card Title
 */
export const CardTitle = ({ 
  children, 
  className = '',
  as: Component = 'h3',
  ...props 
}) => (
  <Component 
    className={`text-lg font-semibold text-text-primary ${className}`}
    {...props}
  >
    {children}
  </Component>
);

/**
 * Card Description
 */
export const CardDescription = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <p 
    className={`text-sm text-text-secondary mt-1 ${className}`}
    {...props}
  >
    {children}
  </p>
);

/**
 * Card Body
 */
export const CardBody = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

/**
 * Card Footer
 */
export const CardFooter = ({ 
  children, 
  className = '',
  divider = false,
  ...props 
}) => (
  <div 
    className={`
      mt-4 pt-4
      ${divider ? 'border-t border-border' : ''}
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

/**
 * Card Image - Full width image at top
 */
export const CardImage = ({
  src,
  alt = '',
  aspectRatio = '16/9',
  className = '',
  overlay,
  ...props
}) => (
  <div 
    className={`relative overflow-hidden -mx-5 -mt-5 mb-4 first:mb-0 ${className}`}
    style={{ aspectRatio }}
    {...props}
  >
    <img 
      src={src} 
      alt={alt}
      className="w-full h-full object-cover"
    />
    {overlay && (
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 to-transparent">
        {overlay}
      </div>
    )}
  </div>
);

/**
 * Card Stack - Stacked cards effect
 */
export const CardStack = ({ 
  children, 
  className = '' 
}) => (
  <div className={`relative ${className}`}>
    {/* Background cards for stack effect */}
    <div className="absolute inset-0 bg-bg-card rounded-xl border border-border transform rotate-2 -z-10" />
    <div className="absolute inset-0 bg-bg-card rounded-xl border border-border transform -rotate-1 -z-20" />
    {children}
  </div>
);

export default Card;
