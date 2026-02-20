import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal Component
 * 
 * Variants:
 * - default: Clean, centered modal
 * - drawer: Bottom sheet (mobile-friendly)
 * - fullscreen: Full screen takeover
 * 
 * @example
 * <Modal open={open} onClose={handleClose} title="Confirm Vote">
 *   <ModalBody>Are you sure?</ModalBody>
 *   <ModalFooter>
 *     <Button onClick={handleClose}>Cancel</Button>
 *     <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
 *   </ModalFooter>
 * </Modal>
 */

const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'default',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  className = '',
  ...props
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  // Size configurations (for default variant)
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4',
  };
  
  // Handle escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose?.();
    }
  }, [closeOnEscape, onClose]);
  
  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose?.();
    }
  };
  
  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);
  
  if (!open) return null;
  
  // Variant styles
  const variantStyles = {
    default: {
      backdrop: 'items-center justify-center p-4',
      container: `
        ${sizes[size]}
        w-full
        bg-bg-elevated
        border border-border
        rounded-2xl
        shadow-xl
        animate-scale-in
      `,
    },
    drawer: {
      backdrop: 'items-end',
      container: `
        w-full
        bg-bg-elevated
        border-t border-border
        rounded-t-2xl
        shadow-xl
        animate-slide-up
        max-h-[90vh]
        safe-bottom
      `,
    },
    fullscreen: {
      backdrop: '',
      container: `
        w-full h-full
        bg-bg-primary
        animate-fade-in
      `,
    },
  };
  
  const currentVariant = variantStyles[variant];
  
  const modalContent = (
    <div 
      className={`
        fixed inset-0 z-modal
        flex ${currentVariant.backdrop}
        bg-overlay-heavy
        animate-fade-in
      `}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          ${currentVariant.container}
          ${className}
          focus:outline-none
          overflow-hidden
          flex flex-col
        `}
        {...props}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-5 pb-0">
            <div className="flex-1 pr-4">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            
            {showClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 -m-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
                aria-label="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Drawer handle (for drawer variant) */}
        {variant === 'drawer' && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-border-strong rounded-full" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
  
  // Render in portal
  return createPortal(modalContent, document.body);
};

/**
 * Modal Body - Content container
 */
export const ModalBody = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>
    {children}
  </div>
);

/**
 * Modal Footer - Action buttons
 */
export const ModalFooter = ({ 
  children, 
  className = '',
  divider = true,
}) => (
  <div 
    className={`
      p-5 pt-4
      flex items-center justify-end gap-3
      ${divider ? 'border-t border-border' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

/**
 * Confirmation Modal - Pre-built confirmation dialog
 */
export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
  >
    <ModalBody>
      <p className="text-text-secondary">{message}</p>
    </ModalBody>
    <ModalFooter>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        disabled={loading}
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`
          px-4 py-2 rounded-lg text-sm font-semibold
          transition-all duration-200
          disabled:opacity-50
          ${variant === 'danger' 
            ? 'bg-error text-white hover:bg-error-dark' 
            : 'bg-gradient-to-r from-gold-600 via-gold to-gold-400 text-bg-primary hover:shadow-glow-gold'
          }
        `}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="w-4 h-4" />
            Processing...
          </span>
        ) : confirmText}
      </button>
    </ModalFooter>
  </Modal>
);

/**
 * Alert Modal - Simple alert/info dialog
 */
export const AlertModal = ({
  open,
  onClose,
  title,
  message,
  type = 'info', // info, success, warning, error
  buttonText = 'OK',
}) => {
  const typeStyles = {
    info: { icon: InfoIcon, color: 'text-info' },
    success: { icon: CheckIcon, color: 'text-success' },
    warning: { icon: WarningIcon, color: 'text-warning' },
    error: { icon: ErrorIcon, color: 'text-error' },
  };
  
  const { icon: Icon, color } = typeStyles[type];
  
  return (
    <Modal open={open} onClose={onClose} size="sm" showClose={false}>
      <ModalBody>
        <div className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-4 ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          {title && (
            <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
          )}
          <p className="text-text-secondary">{message}</p>
        </div>
      </ModalBody>
      <ModalFooter divider={false} className="justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg text-sm font-semibold bg-bg-hover text-text-primary hover:bg-border transition-colors"
        >
          {buttonText}
        </button>
      </ModalFooter>
    </Modal>
  );
};

// Icon components
const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LoadingSpinner = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const InfoIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const WarningIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ErrorIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default Modal;
