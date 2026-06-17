import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BhpFilters } from './BhpFilters';

describe('BhpFilters Component', () => {
  const mockRooms = [
    { id: 1, code: 'LAB-01', name: 'Lab Komputer 1' },
    { id: 2, code: 'LAB-02', name: 'Lab Hardware' },
  ];
  const mockYears = ['2024', '2025', '2026'];

  it('renders all select dropdowns with correct initial values', () => {
    render(
      <BhpFilters
        monthFilter="01"
        setMonthFilter={vi.fn()}
        yearFilter="2025"
        setYearFilter={vi.fn()}
        roomFilter="1"
        setRoomFilter={vi.fn()}
        years={mockYears}
        rooms={mockRooms}
      />
    );

    // Verify initial values are displayed in triggers
    expect(screen.getByText('Januari')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('LAB-01 - Lab Komputer 1')).toBeInTheDocument();
  });

  it('calls handler when changing filters', () => {
    const setMonthFilter = vi.fn();
    render(
      <BhpFilters
        monthFilter="all"
        setMonthFilter={setMonthFilter}
        yearFilter="all"
        setYearFilter={vi.fn()}
        roomFilter="all"
        setRoomFilter={vi.fn()}
        years={mockYears}
        rooms={mockRooms}
      />
    );

    // Open month dropdown
    const monthTrigger = screen.getByText('Semua Bulan');
    fireEvent.click(monthTrigger);

    // Click on "Januari" option
    const option = screen.getByText('Januari');
    fireEvent.click(option);

    expect(setMonthFilter).toHaveBeenCalledWith('01');
  });
});
