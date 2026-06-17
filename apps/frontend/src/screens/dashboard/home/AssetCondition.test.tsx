import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetCondition } from './AssetCondition';

describe('AssetCondition Component', () => {
  const mockInventory = [
    {
      id: 1,
      code: 'AST-001',
      name: 'Laptop',
      cat: 'Elektronik',
      specs: 'Specs',
      room: 'Lab 1',
      roomId: 1,
      cond: 'Baik' as const,
      last: '2026-06-01',
      acquired: '2026-06-01',
      value: 1000,
      serial: 'SN-001',
    },
    {
      id: 2,
      code: 'AST-002',
      name: 'PC',
      cat: 'Elektronik',
      specs: 'Specs',
      room: 'Lab 1',
      roomId: 1,
      cond: 'Baik' as const,
      last: '2026-06-01',
      acquired: '2026-06-01',
      value: 2000,
      serial: 'SN-002',
    },
    {
      id: 3,
      code: 'AST-003',
      name: 'Printer',
      cat: 'Elektronik',
      specs: 'Specs',
      room: 'Lab 1',
      roomId: 1,
      cond: 'Perlu cek' as const,
      last: '2026-06-01',
      acquired: '2026-06-01',
      value: 3000,
      serial: 'SN-003',
    },
    {
      id: 4,
      code: 'AST-004',
      name: 'Scanner',
      cat: 'Elektronik',
      specs: 'Specs',
      room: 'Lab 1',
      roomId: 1,
      cond: 'Maintenance' as const,
      last: '2026-06-01',
      acquired: '2026-06-01',
      value: 4000,
      serial: 'SN-004',
    },
  ];

  it('renders correctly with count, percentages, and legend details', () => {
    const { container } = render(<AssetCondition inventory={mockInventory} />);

    // Total count in the center of the donut
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();

    // Verify Legend entries
    // Baik: 2 of 4 (50%)
    expect(screen.getByText('Baik')).toBeInTheDocument();
    expect(screen.getByText('2 (50%)')).toBeInTheDocument();

    // Perlu cek: 1 of 4 (25%)
    expect(screen.getByText('Perlu cek')).toBeInTheDocument();

    // Maintenance: 1 of 4 (25%)
    expect(screen.getByText('Maintenance')).toBeInTheDocument();

    expect(screen.getAllByText('1 (25%)').length).toBe(2);

    // Verify SVG segments strokeDasharray
    const segments = container.querySelectorAll('svg circle');
    // Note: The first circle is the background, followed by 3 segment circles.
    expect(segments.length).toBe(4);

    const segmentBaik = segments[1];
    const segmentCek = segments[2];
    const segmentMaint = segments[3];

    expect(segmentBaik.getAttribute('stroke-dasharray')).toBe('50 50');
    expect(segmentCek.getAttribute('stroke-dasharray')).toBe('25 75');
    expect(segmentMaint.getAttribute('stroke-dasharray')).toBe('25 75');
  });

  it('handles empty inventory list safely', () => {
    render(<AssetCondition inventory={[]} />);
    // Total count should be 0
    expect(screen.getByText('0')).toBeInTheDocument();
    // Percentages should show 0%
    expect(screen.getAllByText('0 (0%)').length).toBeGreaterThan(0);
  });
});
