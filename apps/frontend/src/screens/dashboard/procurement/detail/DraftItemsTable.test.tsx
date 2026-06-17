import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftItemsTable } from './DraftItemsTable';

// Mock app-shell components
vi.mock('../../../../components/app-shell', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('DraftItemsTable Component', () => {
  const mockDraft = {
    id: 1,
    status: 'draft',
    items: [
      {
        id: 101,
        kind: 'Inventaris',
        name: 'PC All-in-One',
        qty: 2,
        price: 15000000,
        unit: 'unit',
        link: 'tokopedia.com',
        replaces: 'AST-010',
        approval: 'pending',
      },
      {
        id: 102,
        kind: 'BHP',
        name: 'Kabel LAN Cat6',
        qty: 5,
        price: 50000,
        unit: 'pcs',
        link: '',
        replaces: '',
        approval: 'ok',
      },
    ],
  };

  const mockTotals = {
    inv: 30000000,
    bhp: 250000,
    all: 30250000,
    approved: 250000,
  };

  it('renders table rows and summary correctly in read-only mode', () => {
    const { container } = render(
      <DraftItemsTable
        draft={mockDraft}
        mode="kalab"
        locked={true}
        setApproval={vi.fn()}
        totals={mockTotals}
        onRemoveItem={vi.fn()}
        editingItemId={null}
        editFields={{}}
        setEditFields={vi.fn()}
        startEdit={vi.fn()}
        onSaveItem={vi.fn()}
        onCancelEdit={vi.fn()}
      />
    );

    // Verify item name rendering
    expect(screen.getByText('PC All-in-One')).toBeInTheDocument();
    expect(screen.getByText('Kabel LAN Cat6')).toBeInTheDocument();

    // Verify quantity rendering
    const qtyElements = container.querySelectorAll('.item-qty');
    expect(qtyElements[0].textContent).toContain('2');
    expect(qtyElements[0].textContent).toContain('unit');
    expect(qtyElements[1].textContent).toContain('5');
    expect(qtyElements[1].textContent).toContain('pcs');

    // Verify pricing (subtotal and unit price)
    expect(screen.getAllByText('Rp 30.000.000').length).toBe(2);
    expect(screen.getByText('@ Rp 15.000.000')).toBeInTheDocument();

    // Verify link and replacement rendering
    expect(screen.getByText('Link Pembelian')).toBeInTheDocument();
    expect(screen.getByText('↺ Ganti: AST-010')).toBeInTheDocument();

    // Verify summary totals
    expect(screen.getByText('Total Inventaris')).toBeInTheDocument();
    expect(screen.getByText('Total BHP')).toBeInTheDocument();
    expect(screen.getAllByText('Rp 250.000').length).toBe(2);
  });

  it('renders decision actions for kaprodi and handles click', async () => {
    const setApproval = vi.fn();
    render(
      <DraftItemsTable
        draft={mockDraft}
        mode="kaprodi"
        locked={false}
        setApproval={setApproval}
        totals={mockTotals}
        onRemoveItem={vi.fn()}
        editingItemId={null}
        editFields={{}}
        setEditFields={vi.fn()}
        startEdit={vi.fn()}
        onSaveItem={vi.fn()}
        onCancelEdit={vi.fn()}
      />
    );

    // Kaprodi should see approve/reject buttons instead of edit/delete.
    // Let's click approved button on PC All-in-One (id: 101)
    const approveBtns = screen.getAllByTitle('Setujui');
    expect(approveBtns.length).toBe(2);
    fireEvent.click(approveBtns[0]);

    expect(setApproval).toHaveBeenCalledWith(101, 'ok');

    // Click reject button
    const rejectBtns = screen.getAllByTitle('Tolak');
    fireEvent.click(rejectBtns[1]);
    expect(setApproval).toHaveBeenCalledWith(102, 'no');
  });

  it('renders edit/remove actions for kalab/staflab in draft status and handles click', () => {
    const startEdit = vi.fn();
    const onRemoveItem = vi.fn();

    render(
      <DraftItemsTable
        draft={mockDraft}
        mode="kalab"
        locked={false}
        setApproval={vi.fn()}
        totals={mockTotals}
        onRemoveItem={onRemoveItem}
        editingItemId={null}
        editFields={{}}
        setEditFields={vi.fn()}
        startEdit={startEdit}
        onSaveItem={vi.fn()}
        onCancelEdit={vi.fn()}
      />
    );

    // Edit button click
    const editBtns = screen.getAllByTitle('Ubah Item');
    fireEvent.click(editBtns[0]);
    expect(startEdit).toHaveBeenCalledWith(mockDraft.items[0]);

    // Remove button click
    const removeBtns = screen.getAllByTitle('Hapus Item');
    fireEvent.click(removeBtns[0]);
    expect(onRemoveItem).toHaveBeenCalledWith(101);
  });

  it('renders edit inline fields when editingItemId matches item id', () => {
    const setEditFields = vi.fn();
    const onSaveItem = vi.fn();
    const onCancelEdit = vi.fn();
    const mockEditFields = {
      kind: 'Inventaris',
      name: 'PC All-in-One Updated',
      qty: 3,
      unit: 'unit',
      price: 16000000,
      link: 'tokopedia.com',
      replaces: 'AST-010',
    };

    render(
      <DraftItemsTable
        draft={mockDraft}
        mode="kalab"
        locked={false}
        setApproval={vi.fn()}
        totals={mockTotals}
        onRemoveItem={vi.fn()}
        editingItemId={101}
        editFields={mockEditFields}
        setEditFields={setEditFields}
        startEdit={vi.fn()}
        onSaveItem={onSaveItem}
        onCancelEdit={onCancelEdit}
      />
    );

    // The name input should show the current editFields value
    const nameInput = screen.getByPlaceholderText('Nama barang...') as HTMLInputElement;
    expect(nameInput.value).toBe('PC All-in-One Updated');

    // Change input name
    fireEvent.change(nameInput, { target: { value: 'PC New' } });
    expect(setEditFields).toHaveBeenCalled();

    // Check save and cancel buttons are rendered
    const saveBtn = screen.getByTitle('Simpan');
    const cancelBtn = screen.getByTitle('Batal');

    fireEvent.click(saveBtn);
    expect(onSaveItem).toHaveBeenCalledWith(101);

    fireEvent.click(cancelBtn);
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
