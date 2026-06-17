import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomsSummary } from './RoomsSummary';

describe('RoomsSummary Component', () => {
  const mockRooms = [
    {
      id: 1,
      code: 'LAB-01',
      name: 'Lab Komputer 1',
      assets: 14,
    },
    {
      id: 2,
      code: 'LAB-02',
      name: 'Lab Hardware',
      assets: 35, // 100% capacity
    },
  ];

  it('renders correctly with correct room count and details', () => {
    const { container } = render(<RoomsSummary rooms={mockRooms} />);

    // Verify header title
    expect(screen.getByText('2 laboratorium')).toBeInTheDocument();

    // Verify room 1 details
    expect(screen.getByText('Lab Komputer 1')).toBeInTheDocument();
    expect(screen.getByText('· LAB-01')).toBeInTheDocument();
    expect(screen.getByText('14 aset')).toBeInTheDocument();

    // Verify room 2 details
    expect(screen.getByText('Lab Hardware')).toBeInTheDocument();
    expect(screen.getByText('· LAB-02')).toBeInTheDocument();
    expect(screen.getByText('35 aset')).toBeInTheDocument();

    // Verify percentage bars width
    // LAB-01 capacity percent = (14/35)*100 = 40%
    // LAB-02 capacity percent = (35/35)*100 = 100%
    const progressBars = container.querySelectorAll('.rounded-sm');
    expect(progressBars.length).toBe(2);

    expect((progressBars[0] as HTMLElement).style.width).toBe('40%');
    expect((progressBars[1] as HTMLElement).style.width).toBe('100%');
  });

  it('limits percentage width to 100% if assets count exceeds 35', () => {
    const excessiveRooms = [
      {
        id: 3,
        code: 'LAB-03',
        name: 'Lab Jaringan',
        assets: 50, // exceeds 35 limit
      },
    ];

    const { container } = render(<RoomsSummary rooms={excessiveRooms} />);
    const progressBar = container.querySelector('.rounded-sm') as HTMLElement;
    expect(progressBar.style.width).toBe('100%');
  });
});
