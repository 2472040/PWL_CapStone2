import React from 'react';
import { Icon } from '../../../components/app-shell.jsx';

export function AuditDetailModal({ payload: selectedLog, close }) {
  if (!selectedLog) return null;

  return (
    <div
      className="card max-w-lg w-full overflow-hidden flex flex-col animate-fade-in"
      style={{
        background: 'var(--color-bg-2)',
        border: '1px solid var(--color-line)',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        width: '100%',
        maxWidth: '480px',
        padding: '0',
        cursor: 'default',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Head */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
        <div>
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2 m-0" style={{ color: 'var(--color-ink)' }}>
            <Icon name="log" size={18} className="text-cyan" />
            Detail Log Aktivitas #{selectedLog.id}
          </h3>
        </div>
        <button
          className="btn sm border-0 bg-transparent text-ink hover:text-white cursor-pointer"
          style={{ padding: '4px', minWidth: 'auto' }}
          onClick={close}
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 space-y-4 text-sm overflow-y-auto" style={{ maxHeight: '70vh' }} data-lenis-prevent>
        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-white/5">
          <span className="text-ink-3">Waktu</span>
          <span className="col-span-2 mono text-xs font-medium text-ink-2">{selectedLog.ts}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-white/5">
          <span className="text-ink-3">Pengguna</span>
          <span className="col-span-2 text-ink-2">
            <b>{selectedLog.user}</b>
            {selectedLog.role && (
              <span className="chip ml-2" style={{ verticalAlign: 'middle' }}>
                {selectedLog.role}
              </span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-white/5">
          <span className="text-ink-3">Aksi</span>
          <span className="col-span-2 mono text-xs text-cyan font-semibold">{selectedLog.action}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-white/5">
          <span className="text-ink-3">Target</span>
          <span className="col-span-2 font-medium text-ink-2">{selectedLog.target || '—'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-white/5">
          <span className="text-ink-3">IP Address</span>
          <span className="col-span-2 mono text-xs text-ink-2">{selectedLog.ip}</span>
        </div>

        <div className="py-3 border-b border-white/5">
          <span className="text-ink-3 block mb-2">Rincian / Detail</span>
          <div
            className="p-3.5 rounded-lg border border-line text-xs whitespace-pre-wrap leading-relaxed"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--color-ink-2)',
            }}
          >
            {selectedLog.details || 'Tidak ada detail tambahan.'}
          </div>
        </div>

        {/* Cryptographic Integrity Section */}
        {selectedLog.hash && (
          <div
            className="p-3.5 rounded-xl border border-cyan/20"
            style={{
              background: 'rgba(6, 182, 212, 0.03)',
            }}
          >
            <div className="flex items-center gap-1.5 text-xs text-cyan font-semibold mb-2">
              <Icon name="check" size={12} strokeWidth={2.4} /> Integritas Rantai Blok Kriptografi Terverifikasi
            </div>
            <div className="space-y-1.5 text-[10px] mono">
              <div className="truncate">
                <span className="text-ink-3">Current Hash:</span>{' '}
                <span className="text-ink-2" title={selectedLog.hash}>
                  {selectedLog.hash}
                </span>
              </div>
              {selectedLog.previousHash && (
                <div className="truncate">
                  <span className="text-ink-3">Prev Hash:</span>{' '}
                  <span className="text-ink-2" title={selectedLog.previousHash}>
                    {selectedLog.previousHash}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
