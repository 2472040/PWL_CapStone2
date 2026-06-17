import { Icon } from './app-shell';

interface ConfirmModalPayload {
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmModalProps {
  payload?: ConfirmModalPayload | null;
  close: () => void;
}

export function ConfirmModal({ payload, close }: ConfirmModalProps) {
  if (!payload) return null;

  const {
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin?',
    onConfirm,
    onCancel,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    isDanger = false,
  } = payload;

  const handleConfirm = () => {
    close();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    close();
    if (onCancel) onCancel();
  };

  return (
    <div className="flex flex-col animate-fade-in" style={{ cursor: 'default' }}>
      <div className="text-center" style={{ padding: '24px 24px 18px' }}>
        <div
          className={`h-14 w-14 animate-pulse-slow ${isDanger ? 'text-rose' : 'text-cyan'}`}
          style={{
            borderRadius: '50%',
            background: isDanger ? 'rgba(255,107,131,0.15)' : 'rgba(6,182,212,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          <Icon name={isDanger ? 'trash' : 'info'} size={24} />
        </div>
        <div
          className="mb-1.5 text-lg tracking-tight font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          {title}
        </div>
        <div className="text-sm text-ink-3 leading-[1.5] max-w-[360px] mx-auto">{message}</div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '14px 18px',
          borderTop: '1px solid var(--color-line)',
          background: 'rgba(0,0,0,0.2)',
          margin: '0 -28px -24px -28px', // offset the padding of .modal-center
        }}
      >
        <button className="btn flex-1 justify-center" onClick={handleCancel}>
          {cancelText}
        </button>
        <button
          className={`btn flex-1 justify-center ${isDanger ? 'danger' : 'primary'}`}
          onClick={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}
