import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentActivity } from './RecentActivity';

vi.mock('../../../components/app-shell', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('RecentActivity Component', () => {
  const mockActivities = [
    {
      who: 'Andi',
      role: 'Staff Lab',
      act: 'menambahkan aset',
      target: 'Laptop Dell XPS',
      when: '10 menit yang lalu',
    },
    {
      who: 'Budi',
      role: 'Kepala Lab',
      act: 'menyetujui pengadaan',
      target: 'Kursi Lab',
      when: '1 jam yang lalu',
    },
  ];

  it('renders empty state message when there are no activities', () => {
    render(<RecentActivity activities={[]} roleAccent="var(--color-violet)" />);
    expect(screen.getByText('Belum ada aktivitas terbaru')).toBeInTheDocument();
    expect(screen.getByTestId('icon-log')).toBeInTheDocument();
  });

  it('renders a list of activities correctly', () => {
    render(<RecentActivity activities={mockActivities} roleAccent="var(--color-violet)" />);

    // Verify "Andi" activity row
    expect(screen.getByText('Andi')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // Initial avatar letter
    expect(screen.getByText('Staff Lab')).toBeInTheDocument();
    expect(screen.getByText('menambahkan aset')).toBeInTheDocument();
    expect(screen.getByText('Laptop Dell XPS')).toBeInTheDocument();
    expect(screen.getByText('10 menit yang lalu')).toBeInTheDocument();

    // Verify "Budi" activity row
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument(); // Initial avatar letter
    expect(screen.getByText('Kepala Lab')).toBeInTheDocument();
    expect(screen.getByText('menyetujui pengadaan')).toBeInTheDocument();
    expect(screen.getByText('Kursi Lab')).toBeInTheDocument();
    expect(screen.getByText('1 jam yang lalu')).toBeInTheDocument();
  });

  it('renders a maximum of 6 activities', () => {
    const manyActivities = Array.from({ length: 10 }, (_, i) => ({
      who: `User ${i}`,
      role: 'Staff',
      act: 'melakukan sesuatu',
      target: `Target ${i}`,
      when: 'sekarang',
    }));

    const { container } = render(
      <RecentActivity activities={manyActivities} roleAccent="var(--color-violet)" />
    );

    const rows = container.querySelectorAll('.act-row');
    expect(rows.length).toBe(6);
  });
});
