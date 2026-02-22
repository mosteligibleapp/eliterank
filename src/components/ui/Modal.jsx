import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
  headerClassName = '',
  centered = false,
  hideCloseButton = false,
}) {
  if (!isOpen) return null;

  // If no title, show minimal header with just close button
  const showFullHeader = title && title.trim() !== '';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`relative bg-bg-card border border-border-primary rounded-3xl w-full overflow-hidden ${centered ? 'my-auto' : 'mt-2 mb-8'}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {showFullHeader ? (
          <div className={`p-6 border-b border-border-secondary flex justify-between items-center ${headerClassName}`}>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {!hideCloseButton && (
              <button 
                className="bg-transparent border-none text-gray-400 cursor-pointer p-2 flex items-center justify-center hover:text-white transition-colors"
                onClick={onClose}
              >
                <X size={24} />
              </button>
            )}
          </div>
        ) : !hideCloseButton ? (
          <button
            className="absolute top-4 right-4 z-10 bg-transparent border-none text-gray-400 cursor-pointer p-2 flex items-center justify-center hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        ) : null}
        <div className={showFullHeader ? 'p-8' : hideCloseButton ? '' : 'p-8 pt-10'}>
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-border-secondary flex justify-end gap-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
