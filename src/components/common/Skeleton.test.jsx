import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonPulse, SkeletonText, SkeletonCircle, SkeletonCard } from './Skeleton';

describe('Skeleton Primitives', () => {
  describe('SkeletonPulse', () => {
    it('renders with default dimensions', () => {
      const { container } = render(<SkeletonPulse />);
      const el = container.firstChild;
      expect(el).toBeInTheDocument();
      expect(el.style.width).toBe('100%');
      expect(el.style.height).toBe('16px');
    });

    it('renders with custom dimensions', () => {
      const { container } = render(<SkeletonPulse width="200px" height="40px" />);
      const el = container.firstChild;
      expect(el.style.width).toBe('200px');
      expect(el.style.height).toBe('40px');
    });

    it('applies shimmer animation', () => {
      const { container } = render(<SkeletonPulse />);
      const el = container.firstChild;
      expect(el.style.animation).toContain('shimmer');
    });

    it('applies custom style overrides', () => {
      const { container } = render(<SkeletonPulse style={{ opacity: 0.5 }} />);
      const el = container.firstChild;
      expect(el.style.opacity).toBe('0.5');
    });
  });

  describe('SkeletonText', () => {
    it('renders default 3 lines', () => {
      const { container } = render(<SkeletonText />);
      const lines = container.firstChild.children;
      expect(lines.length).toBe(3);
    });

    it('renders custom line count', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const lines = container.firstChild.children;
      expect(lines.length).toBe(5);
    });

    it('has varying widths', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = Array.from(container.firstChild.children);
      const widths = lines.map((l) => l.style.width);
      // Should not all be the same width
      expect(new Set(widths).size).toBeGreaterThan(1);
    });
  });

  describe('SkeletonCircle', () => {
    it('renders with default size', () => {
      const { container } = render(<SkeletonCircle />);
      const el = container.firstChild;
      expect(el.style.width).toBe('48px');
      expect(el.style.height).toBe('48px');
      expect(el.style.borderRadius).toBe('50%');
    });

    it('renders with custom size', () => {
      const { container } = render(<SkeletonCircle size="80px" />);
      const el = container.firstChild;
      expect(el.style.width).toBe('80px');
      expect(el.style.height).toBe('80px');
    });
  });

  describe('SkeletonCard', () => {
    it('renders with default dimensions', () => {
      const { container } = render(<SkeletonCard />);
      const el = container.firstChild;
      expect(el.style.width).toBe('100%');
      expect(el.style.height).toBe('160px');
    });

    it('renders with custom height', () => {
      const { container } = render(<SkeletonCard height="320px" />);
      const el = container.firstChild;
      expect(el.style.height).toBe('320px');
    });
  });
});
