import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraftActionsPanel } from './DraftActionsPanel';

vi.mock('../../../../components/app-shell', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('DraftActionsPanel Component', () => {
  const mockTotals = {
    ok: 2,
    no: 1,
    pending: 0,
    rec: 1,
  };

  it('renders BAST PDF link when status is completed', () => {
    const draft = { id: 12, status: 'completed', items: [] };
    render(
      <DraftActionsPanel
        d={draft}
        mode="kalab"
        locked={true}
        totals={mockTotals}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    const pdfLink = screen.getByText('Cetak BAST (PDF)') as HTMLAnchorElement;
    expect(pdfLink).toBeInTheDocument();
    expect(pdfLink.getAttribute('href')).toBe('/api/procurement/drafts/12/pdf');
  });

  it('renders submit button for kalab in draft status and handles click', () => {
    const draft = { id: 12, status: 'draft', items: [] };
    const submitDraft = vi.fn();
    render(
      <DraftActionsPanel
        d={draft}
        mode="kalab"
        locked={false}
        totals={mockTotals}
        submitDraft={submitDraft}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
    const btn = screen.getByText('Ajukan ke Kaprodi');
    fireEvent.click(btn);
    expect(submitDraft).toHaveBeenCalled();
  });

  it('renders resubmit button for kalab in revision status', () => {
    const draft = { id: 12, status: 'revision', items: [] };
    render(
      <DraftActionsPanel
        d={draft}
        mode="kalab"
        locked={false}
        totals={mockTotals}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    expect(screen.getByText('Butuh Revisi')).toBeInTheDocument();
    expect(screen.getByText('Ajukan Ulang ke Kaprodi')).toBeInTheDocument();
  });

  it('renders waiting state for kalab in submitted status', () => {
    const draft = { id: 12, status: 'submitted', items: [] };
    render(
      <DraftActionsPanel
        d={draft}
        mode="kalab"
        locked={true}
        totals={mockTotals}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    expect(screen.getByText('Menunggu review Kaprodi')).toBeInTheDocument();
    expect(screen.getByText('Locked · tidak bisa diubah')).toBeInTheDocument();
  });

  it('renders revision button for kaprodi in submitted status', () => {
    const draft = { id: 12, status: 'submitted', items: [] };
    const requestRevision = vi.fn();
    render(
      <DraftActionsPanel
        d={draft}
        mode="kaprodi"
        locked={false}
        totals={mockTotals}
        submitDraft={vi.fn()}
        requestRevision={requestRevision}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    const btn = screen.getByText('Minta Revisi');
    fireEvent.click(btn);
    expect(requestRevision).toHaveBeenCalled();
  });

  it('renders finalize button for kaprodi if no pending items left', () => {
    const draft = { id: 12, status: 'submitted', items: [] };
    const finalize = vi.fn();
    render(
      <DraftActionsPanel
        d={draft}
        mode="kaprodi"
        locked={false}
        totals={{ ...mockTotals, pending: 0 }}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={finalize}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    const btn = screen.getByText('Finalisasi & kunci');
    fireEvent.click(btn);
    expect(finalize).toHaveBeenCalled();
  });

  it('renders approve all button for kaprodi if pending items > 0', () => {
    const draft = { id: 12, status: 'submitted', items: [] };
    const approveAll = vi.fn();
    render(
      <DraftActionsPanel
        d={draft}
        mode="kaprodi"
        locked={false}
        totals={{ ...mockTotals, pending: 3 }}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={approveAll}
        finalize={vi.fn()}
        completeReceiving={vi.fn()}
        navigate={vi.fn()}
        eligibleCount={vi.fn()}
      />
    );

    const btn = screen.getByText('Approve semua');
    fireEvent.click(btn);
    expect(approveAll).toHaveBeenCalled();
  });

  it('renders controls for admin in finalized status', () => {
    const draft = { id: 12, status: 'finalized', items: [] };
    const completeReceiving = vi.fn();
    const navigate = vi.fn();
    const eligibleCount = vi.fn(() => 4);

    render(
      <DraftActionsPanel
        d={draft}
        mode="admin"
        locked={true}
        totals={mockTotals}
        submitDraft={vi.fn()}
        requestRevision={vi.fn()}
        approveAll={vi.fn()}
        finalize={vi.fn()}
        completeReceiving={completeReceiving}
        navigate={navigate}
        eligibleCount={eligibleCount}
      />
    );

    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('1/4 dilabeli')).toBeInTheDocument();

    const labelBtn = screen.getByText('Cetak label');
    fireEvent.click(labelBtn);
    expect(navigate).toHaveBeenCalledWith('/dashboard/labels');

    const doneBtn = screen.getByText('Selesaikan');
    fireEvent.click(doneBtn);
    expect(completeReceiving).toHaveBeenCalled();
  });
});
