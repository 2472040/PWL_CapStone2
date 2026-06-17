import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryFilters } from './InventoryFilters';

describe('InventoryFilters Component', () => {
  const mockYears = ['2023', '2024'];
  const mockCats = ['all', 'elektronik', 'mebel'];

  it('renders all filter controls correctly', () => {
    render(
      <InventoryFilters
        localQuery="laptop"
        setLocalQuery={vi.fn()}
        globalQuery=""
        monthFilter="02"
        setMonthFilter={vi.fn()}
        yearFilter="2024"
        setYearFilter={vi.fn()}
        years={mockYears}
        cats={mockCats}
        filter="elektronik"
        setFilter={vi.fn()}
      />
    );

    // Verify search input value
    const searchInput = screen.getByPlaceholderText('Cari aset…') as HTMLInputElement;
    expect(searchInput.value).toBe('laptop');

    // Verify select triggers
    expect(screen.getByText('Februari')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();

    // Verify category pills
    expect(screen.getByText('Semua')).toBeInTheDocument();
    expect(screen.getByText('elektronik')).toBeInTheDocument();
    expect(screen.getByText('mebel')).toBeInTheDocument();
  });

  it('calls setLocalQuery when typing in the search box', () => {
    const setLocalQuery = vi.fn();
    render(
      <InventoryFilters
        localQuery=""
        setLocalQuery={setLocalQuery}
        globalQuery=""
        monthFilter="all"
        setMonthFilter={vi.fn()}
        yearFilter="all"
        setYearFilter={vi.fn()}
        years={mockYears}
        cats={mockCats}
        filter="all"
        setFilter={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Cari aset…');
    fireEvent.change(searchInput, { target: { value: 'komputer' } });

    expect(setLocalQuery).toHaveBeenCalledWith('komputer');
  });

  it('calls setFilter when clicking category button', () => {
    const setFilter = vi.fn();
    render(
      <InventoryFilters
        localQuery=""
        setLocalQuery={vi.fn()}
        globalQuery=""
        monthFilter="all"
        setMonthFilter={vi.fn()}
        yearFilter="all"
        setYearFilter={vi.fn()}
        years={mockYears}
        cats={mockCats}
        filter="all"
        setFilter={setFilter}
      />
    );

    const mebelBtn = screen.getByText('mebel');
    fireEvent.click(mebelBtn);

    expect(setFilter).toHaveBeenCalledWith('mebel');
  });
});
