import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BhpTable } from './BhpTable';

describe('BhpTable Component', () => {
  const mockBhp = [
    {
      id: 'BHP-001',
      dbId: 101,
      name: 'Masker Medis',
      unit: 'box',
      stock: 5,
      min: 10,
      lastIn: '2024-05-10',
      cat: 'Medis',
      roomName: 'Lab Biologi',
    },
  ];

  it('renders loading skeleton when loadingList is true', () => {
    const { container } = render(
      <BhpTable
        loadingList={true}
        filteredBhp={[]}
        role="staflab"
        dispatch={vi.fn()}
        onReduceClick={vi.fn()}
      />
    );
    expect(container.getElementsByClassName('skeleton-row').length).toBe(5);
  });

  it('renders empty message when filteredBhp is empty and not loading', () => {
    render(
      <BhpTable
        loadingList={false}
        filteredBhp={[]}
        role="staflab"
        dispatch={vi.fn()}
        onReduceClick={vi.fn()}
      />
    );
    expect(screen.getByText('Tidak ada BHP cocok')).toBeInTheDocument();
  });

  it('renders BHP list items correctly', () => {
    render(
      <BhpTable
        loadingList={false}
        filteredBhp={mockBhp}
        role="staflab"
        dispatch={vi.fn()}
        onReduceClick={vi.fn()}
      />
    );
    expect(screen.getByText('Masker Medis')).toBeInTheDocument();
    expect(screen.getByText('BHP-001')).toBeInTheDocument();
  });

  it('handles AI prediction button click', () => {
    const dispatch = vi.fn();
    render(
      <BhpTable
        loadingList={false}
        filteredBhp={mockBhp}
        role="staflab"
        dispatch={dispatch}
        onReduceClick={vi.fn()}
      />
    );

    // AI Prediction button is the first button in row
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // AI Predictive button

    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPEN_MODAL',
      modal: {
        kind: 'aiPredictive',
        payload: { bhpId: 101, bhpName: 'Masker Medis' },
      },
    });
  });

  it('displays decrease stock button for staflab and handles click', () => {
    const onReduceClick = vi.fn();
    render(
      <BhpTable
        loadingList={false}
        filteredBhp={mockBhp}
        role="staflab"
        dispatch={vi.fn()}
        onReduceClick={onReduceClick}
      />
    );

    const reduceButton = screen.getByLabelText('Kurangi stok Masker Medis');
    fireEvent.click(reduceButton);

    expect(onReduceClick).toHaveBeenCalledWith(mockBhp[0]);
  });
});
