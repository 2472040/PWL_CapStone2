import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { Icon } from '../../components/app-shell';

interface VerificationData {
  code: string;
  title: string;
  finalized_at: string;
  creator: string;
  finalizer: string;
  total: number;
  itemCount: number;
}

export function VerifyBast() {
  const { id, hash } = useParams<{ id: string; hash: string }>();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function performVerification() {
      try {
        const res = await apiFetch<{ verified: boolean; message?: string; data?: VerificationData }>(
          `/procurement/verify-bast/${id}/${hash}`
        );
        if (res.verified && res.data) {
          setVerified(true);
          setData(res.data);
        } else {
          setVerified(false);
          setErrorMsg(res.message || 'Verifikasi gagal. Tanda tangan dokumen tidak cocok.');
        }
      } catch (err: any) {
        setVerified(false);
        setErrorMsg(err.message || 'Gagal menghubungi server verifikasi.');
      } finally {
        setLoading(false);
      }
    }

    if (id && hash) {
      performVerification();
    } else {
      setLoading(false);
      setVerified(false);
      setErrorMsg('Parameter verifikasi tidak lengkap.');
    }
  }, [id, hash]);

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4"
      style={{
        background: 'radial-gradient(circle at center, #121020 0%, #08070d 100%)',
        color: 'var(--color-ink)',
      }}
    >
      <div
        className="w-full max-w-lg p-8 rounded-2xl border"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="flex items-center justify-center h-12 w-12 rounded-xl mb-3"
            style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              color: 'var(--color-violet)',
            }}
          >
            <Icon name="flask" size={24} />
          </div>
          <h1 className="text-lg fw-6 tracking-tight">LokaLab Suite</h1>
          <p className="text-[10px] text-ink-3 tracking-widest uppercase mt-0.5">
            VERIFIKATOR BAST KRIPTOGRAFIS
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-8">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet mb-4"
              style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }}
            />
            <span className="text-xs text-ink-3 font-medium">Memverifikasi tanda tangan digital...</span>
          </div>
        ) : verified && data ? (
          <div className="animate-fade-in">
            {/* Success Status Card */}
            <div
              className="rounded-xl p-5 mb-6 flex flex-col items-center text-center"
              style={{
                background: 'rgba(52, 211, 153, 0.05)',
                border: '1px solid rgba(52, 211, 153, 0.15)',
                boxShadow: '0 0 25px rgba(52, 211, 153, 0.05)',
              }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: 'var(--color-green)',
                }}
              >
                <Icon name="check" size={20} strokeWidth={2.4} />
              </div>
              <h2 className="text-sm fw-6 text-green tracking-wide">DOKUMEN ASLI & TERVERIFIKASI</h2>
              <p className="text-xs text-ink-3 mt-1 max-w-[280px]">
                Integritas data dokumen ini dijamin 100% valid dan belum pernah dimodifikasi sejak disetujui.
              </p>
            </div>

            {/* Details Table */}
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 mb-6">
              <div className="text-xs fw-6 text-ink mb-3 tracking-wide">RINCIAN DOKUMEN</div>
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Nama Kegiatan:</span>
                  <span className="fw-5 text-right max-w-[220px]">{data.title}</span>
                </div>
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Kode BAST:</span>
                  <span className="mono text-cyan">{data.code}</span>
                </div>
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Total Transaksi:</span>
                  <span className="fw-6 text-green">
                    Rp {data.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Jumlah Item:</span>
                  <span>{data.itemCount} jenis barang</span>
                </div>
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Pihak I (Kepala Lab):</span>
                  <span>{data.creator}</span>
                </div>
                <div className="flex between py-1 border-b border-white/[0.03]">
                  <span className="text-ink-3">Pihak II (Kaprodi):</span>
                  <span>{data.finalizer}</span>
                </div>
                <div className="flex between py-1">
                  <span className="text-ink-3">Tanggal Disetujui:</span>
                  <span>
                    {new Date(data.finalized_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Hash block */}
            <div className="bg-black/20 border border-white/[0.03] rounded-lg p-3">
              <div className="text-[10px] text-ink-3 font-semibold mb-1">
                TANDA TANGAN DIGITAL (HMAC-SHA256)
              </div>
              <div className="mono text-[9px] text-ink-3 break-all bg-black/40 p-2 rounded border border-white/[0.02] tracking-wider leading-relaxed">
                {hash}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Mismatch Status Card */}
            <div
              className="rounded-xl p-5 mb-6 flex flex-col items-center text-center"
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.05)',
              }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center mb-3"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-rose)',
                }}
              >
                <Icon name="x" size={20} strokeWidth={2.4} />
              </div>
              <h2 className="text-sm fw-6 text-rose tracking-wide">VERIFIKASI DOKUMEN GAGAL</h2>
              <p className="text-xs text-ink-3 mt-1 max-w-[280px]">
                Tanda tangan digital tidak valid atau tidak terdaftar di server LokaLab. Dokumen ini kemungkinan besar palsu atau telah dimodifikasi secara ilegal.
              </p>
            </div>

            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 text-xs leading-relaxed text-ink-3">
              <span className="text-ink fw-5 block mb-1">Rincian Error:</span>
              {errorMsg}
              <div className="mt-4 text-[10px] text-ink-3 bg-black/20 p-2.5 rounded border border-white/[0.02]">
                <b>Keamanan BAST LokaLab Suite:</b> Setiap BAST memiliki tanda tangan digital unik yang dihasilkan dari data riil pengadaan barang di basis data kami. Jika isi dokumen diubah sekalipun hanya satu huruf, validasi akan langsung ditolak.
              </div>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center mt-6 pt-5 border-t border-white/[0.03]">
          <a
            href="/"
            className="text-xs text-violet hover:underline inline-flex items-center gap-1.5"
          >
            <Icon name="arrowL" size={11} /> Kembali ke Aplikasi
          </a>
        </div>
      </div>

      <div className="text-center text-[10px] text-ink-3 mt-6">
        LokaLab Suite © 2026 — Sistem Inventaris & Pengadaan Lab Tingkat Enterprise
      </div>
    </div>
  );
}
