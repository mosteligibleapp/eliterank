import React from 'react';

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
};

export default function InterestTag({ children, selected = false, onClick, size = 'md' }) {
  const baseClasses = `
    rounded-full font-medium border-none transition-all duration-150 inline-block
    ${sizeClasses[size] || sizeClasses.md}
    ${selected 
      ? 'bg-gold text-bg-primary' 
      : 'bg-gold/10 text-gold'
    }
    ${onClick ? 'cursor-pointer hover:bg-gold/20' : 'cursor-default'}
  `;

  if (onClick) {
    return (
      <button className={baseClasses} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <span className={baseClasses}>{children}</span>;
}

// Hobby selector for forms
export function HobbySelector({ hobbies = [], selected = [], onChange, max = 8 }) {
  const toggleHobby = (hobby) => {
    if (selected.includes(hobby)) {
      onChange(selected.filter((h) => h !== hobby));
    } else if (selected.length < max) {
      onChange([...selected, hobby]);
    }
  };

  return (
    <div>
      <p className="text-base text-gray-400 mb-4">
        Select up to {max} hobbies ({selected.length}/{max})
      </p>
      <div className="flex flex-wrap gap-2">
        {hobbies.map((hobby) => (
          <InterestTag
            key={hobby}
            selected={selected.includes(hobby)}
            onClick={() => toggleHobby(hobby)}
            size="lg"
          >
            {hobby}
          </InterestTag>
        ))}
      </div>
    </div>
  );
}
