import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatsHeader } from './StatsHeader';

vi.mock('../../../components/app-shell', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe('StatsHeader Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set system time to Wednesday, June 17, 2026
    const date = new Date(2026, 5, 17); // Month is 0-indexed: 5 = June
    vi.setSystemTime(date);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly with user details, formatted date, and triggers export', () => {
    const onExportCSV = vi.fn();
    const onNewDraft = vi.fn();

    render(
      <StatsHeader
        firstName="Budi"
        roleTitle="Kepala Laboratorium"
        stateRole="kalab"
        onExportCSV={onExportCSV}
        onNewDraft={onNewDraft}
      />
    );

    // Verify greeting and role
    expect(screen.getByText('Halo,')).toBeInTheDocument();
    expect(screen.getByText('Budi.')).toBeInTheDocument();
    expect(screen.getByText(/Kepala Laboratorium/)).toBeInTheDocument();

    // Verify date (Wednesday, June 17, 2026 in Indonesian locale)
    // "Rabu, 17 Juni 2026"
    expect(screen.getByText(/Rabu, 17 Juni 2026/)).toBeInTheDocument();

    // Verify export button and click
    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);
    expect(onExportCSV).toHaveBeenCalled();

    // Verify "Pengajuan Baru" is visible for kalab and triggers click
    const newDraftBtn = screen.getByText('Pengajuan Baru');
    fireEvent.click(newDraftBtn);
    expect(onNewDraft).toHaveBeenCalled();
  });

  it('does not render Pengajuan Baru button if stateRole is not kalab', () => {
    render(
      <StatsHeader
        firstName="Budi"
        roleTitle="Staf Lab"
        stateRole="staflab"
        onExportCSV={vi.fn()}
        onNewDraft={vi.fn()}
      />
    );

    expect(screen.queryByText('Pengajuan Baru')).not.toBeInTheDocument();
  });
});
