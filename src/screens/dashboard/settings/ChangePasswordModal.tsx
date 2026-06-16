import { useState, FormEvent } from 'react';
import { useToast } from '../../../components/app-shell';
import { apiFetch } from '../../../services/api';

export function ChangePasswordModal({ close }: { close: () => void }) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      toast('Password baru wajib diisi!', 'warn');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password minimal 6 karakter!', 'warn');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Konfirmasi password tidak cocok!', 'warn');
      return;
    }

    setLoading(false);
    try {
      setLoading(true);
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.data) {
        toast('Password berhasil diperbarui!', 'ok');
        close();
      }
    } catch (err: any) {
      toast(err.message || 'Gagal mengubah password', 'warn');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ padding: '24px' }}>
        <div
          className="h-14 w-14 mb-4 flex items-center justify-center mx-auto"
          style={{ borderRadius: '50%', background: 'rgba(183,148,255,0.15)', color: '#b794ff' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div
          className="mb-1.5 text-center text-lg tracking-tight font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          Ubah Password
        </div>
        <p className="text-center text-xs text-ink-3 mb-6">
          Masukkan password baru Anda di bawah ini
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-ink-2">Password Baru</label>
            <input
              type="password"
              className="input w-full"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-ink-2">Konfirmasi Password Baru</label>
            <input
              type="password"
              className="input w-full"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <button type="button" className="btn flex-1 justify-center" onClick={close}>
              Batal
            </button>
            <button type="submit" className="btn primary flex-1 justify-center" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
