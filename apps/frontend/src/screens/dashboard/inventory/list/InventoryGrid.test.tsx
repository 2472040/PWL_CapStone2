import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryGrid } from './InventoryGrid';

// Mock components from app-shell if needed, or use them as is.
// Since QR requires canvas or just renders seed, let's mock it if it's complex,
// but let's see if we can just mock QR/Icon if they trigger issues.
vi.mock('../../../../components/app-shell', () => ({
  Icon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
  QR: ({ seed }: { seed: string }) => <span data-testid="qr-code">{seed}</span>,
}));

describe('InventoryGrid Component', () => {
  const mockFiltered = [
    {
      code: 'AST-001',
      name: 'Laptop ASUS ROG',
      cat: 'Elektronik',
      specs: 'Core i7, 16GB RAM',
      room: 'Lab Komputer 1',
      cond: 'Baik',
      last: '2026-06-01',
    },
    {
      code: 'AST-002',
      name: 'Kursi Ergonomis',
      cat: 'Mebel',
      specs: 'Warna Hitam',
      room: 'Lab Hardware',
      cond: 'Perlu cek',
      last: '2026-05-15',
    },
  ];

  it('renders skeleton cards when loading is true', () => {
    const { container } = render(<InventoryGrid loading={true} filtered={[]} dispatch={vi.fn()} />);
    const skeletons = container.querySelectorAll('.skeleton-card');
    expect(skeletons.length).toBe(6);
  });

  it('renders empty message when filtered is empty and loading is false', () => {
    render(<InventoryGrid loading={false} filtered={[]} dispatch={vi.fn()} />);
    expect(screen.getByText('Aset tidak ditemukan')).toBeInTheDocument();
    expect(screen.getByTestId('icon-search')).toBeInTheDocument();
  });

  it('renders list of assets correctly', () => {
    render(<InventoryGrid loading={false} filtered={mockFiltered} dispatch={vi.fn()} />);

    // Verify AST-001 details
    expect(screen.getAllByText('AST-001').length).toBeGreaterThan(0);
    expect(screen.getByText('Laptop ASUS ROG')).toBeInTheDocument();
    expect(screen.getByText('Elektronik · Core i7, 16GB RAM')).toBeInTheDocument();
    expect(screen.getByText('Lab Komputer 1')).toBeInTheDocument();
    expect(screen.getByText('Baik')).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();

    // Verify AST-002 details
    expect(screen.getAllByText('AST-002').length).toBeGreaterThan(0);
    expect(screen.getByText('Kursi Ergonomis')).toBeInTheDocument();
    expect(screen.getByText('Mebel · Warna Hitam')).toBeInTheDocument();
    expect(screen.getByText('Lab Hardware')).toBeInTheDocument();
    expect(screen.getByText('Perlu cek')).toBeInTheDocument();
    expect(screen.getByText('2026-05-15')).toBeInTheDocument();

    // Verify QR code renders
    const qrs = screen.getAllByTestId('qr-code');
    expect(qrs.length).toBe(2);
    expect(qrs[0].textContent).toBe('AST-001');
  });

  it('calls dispatch with OPEN_DRAWER when an asset card is clicked', () => {
    const dispatch = vi.fn();
    render(<InventoryGrid loading={false} filtered={mockFiltered} dispatch={dispatch} />);

    const card = screen.getByText('Laptop ASUS ROG').closest('.inv-card');
    expect(card).not.toBeNull();
    if (card) {
      fireEvent.click(card);
    }

    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_DRAWER',
      drawer: {
        kind: 'inventory',
        payload: mockFiltered[0],
      },
    });
  });
});
