import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useStore, useToast, Icon, QR } from '../../../components/app-shell';
import jsQR from 'jsqr';
import LokaSounds from '../../../utils/app-sounds';

export function QRScanner({ close }: { close: () => void }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [selectedAssetCode, setSelectedAssetCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const selectedAsset = state.inventory.find((i: any) => i.code === selectedAssetCode);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive, facingMode]);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.error('Error playing video:', err);
          });
          startDecoding();
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      toast('Gagal mengakses kamera. Pastikan izin telah diberikan dan koneksi aman (HTTPS).', 'warn');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startDecoding = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const decodedCode = code.data.trim();
            const matched = state.inventory.find(
              (i: any) => i.code.toLowerCase() === decodedCode.toLowerCase()
            );

            if (matched) {
              LokaSounds.success();
              toast(`QR Code terdeteksi: ${matched.code}!`, 'ok');
              stopCamera();
              close();
              setTimeout(() => {
                dispatch({
                  type: 'OPEN_DRAWER',
                  drawer: { kind: 'inventory', payload: matched },
                });
              }, 300);
              return;
            } else {
              toast(`QR terbaca: "${decodedCode}", tetapi aset tidak terdaftar.`, 'warn');
              setIsCameraActive(false);
              return;
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  function handleScanSimulate() {
    if (!selectedAsset) {
      toast('Pilih aset yang ingin dipindai terlebih dahulu', 'warn');
      return;
    }

    LokaSounds.success();
    toast(`Pindai berhasil: ${selectedAsset.code} terdeteksi!`, 'ok');
    close();

    setTimeout(() => {
      dispatch({
        type: 'OPEN_DRAWER',
        drawer: {
          kind: 'inventory',
          payload: selectedAsset,
        },
      });
    }, 300);
  }

  function handleQrUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast('Tipe file tidak valid. Hanya menerima file gambar PNG atau JPEG.', 'warn');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast('Ukuran file terlalu besar. Maksimal ukuran gambar adalah 2MB.', 'warn');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);

        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imgData.data, imgData.width, imgData.height);

          if (decoded && decoded.data) {
            const code = decoded.data.trim();
            const matched = state.inventory.find(
              (i: any) => i.code.toLowerCase() === code.toLowerCase()
            );

            if (matched) {
              LokaSounds.success();
              toast(`QR Code terdeteksi: ${matched.code}!`, 'ok');
              close();
              setTimeout(() => {
                dispatch({
                  type: 'OPEN_DRAWER',
                  drawer: { kind: 'inventory', payload: matched },
                });
              }, 300);
            } else {
              toast(`QR terbaca: "${code}", tetapi aset tidak terdaftar di database.`, 'warn');
            }
          } else {
            toast('Gagal mendeteksi QR Code dari gambar ini. Pastikan gambar jelas.', 'warn');
          }
        } catch (err) {
          console.error('Error decoding QR:', err);
          toast('Terjadi kesalahan saat memproses gambar QR.', 'warn');
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <style>{`
        @keyframes scan {
          0% { top: 8%; }
          50% { top: 92%; }
          100% { top: 8%; }
        }
        .scan-laser {
          animation: scan 2.5s infinite ease-in-out;
        }
      `}</style>

      <div className="drawer-bar">
        <div className="drawer-title">Pindai QR Aset</div>
        <button className="x-btn" onClick={close}>
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="drawer-body flex flex-col items-center">
        <div className="text-center text-xs text-3 mb-4 max-w-[280px]">
          Arahkan kamera ke kode QR aset atau gunakan gambar QR dari menu Cetak Label / Detail Aset.
        </div>

        {/* Pemindai Holografis */}
        <div className="relative w-56 h-56 border-2 border-dashed border-violet/40 rounded-2xl flex items-center justify-center overflow-hidden mb-4 bg-black/40 shadow-inner">
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-violet z-10" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-violet z-10" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-violet z-10" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-violet z-10" />

          {/* Laser Line */}
          <div
            className="scan-laser absolute left-4 right-4 h-[2px] z-10 shadow-[0_0_12px_var(--color-violet)]"
            style={{ background: 'var(--color-violet)' }}
          />

          {isCameraActive ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
          ) : selectedAsset ? (
            <div className="flex flex-col items-center animate-fade-in">
              <QR seed={selectedAsset.code} size={10} />
              <div className="mono text-[10px] text-violet mt-3 font-semibold tracking-wider">
                {selectedAsset.code}
              </div>
            </div>
          ) : (
            <div className="text-3 text-[11px] text-center px-6 leading-relaxed">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto mb-2 text-ink-3"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 12h.01" />
              </svg>
              Kamera tidak aktif atau menunggu objek...
            </div>
          )}
        </div>

        {/* Kontrol Kamera */}
        <div className="flex gap-2 mb-6 w-full justify-center">
          <button
            className={`btn compact justify-center gap-1.5 ${isCameraActive ? 'danger' : 'primary'}`}
            onClick={() => setIsCameraActive(!isCameraActive)}
            style={{ minWidth: '140px' }}
          >
            <Icon name={isCameraActive ? 'x' : 'qr'} size={13} />
            {isCameraActive ? 'Matikan Kamera' : 'Aktifkan Kamera'}
          </button>
          {isCameraActive && (
            <button
              className="btn compact secondary justify-center gap-1.5"
              onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              <Icon name="swap" size={13} />
              {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
            </button>
          )}
        </div>

        {/* Upload QR Code Button */}
        <div className="w-full mb-5">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleQrUpload}
          />
          <button
            className="btn w-full justify-center gap-2"
            style={{
              border: '1px dashed rgba(167, 139, 250, 0.4)',
              background: 'rgba(167, 139, 250, 0.05)',
              color: 'var(--color-violet)',
            }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Icon name="upload" size={13} /> Unggah Gambar QR Aset
          </button>
        </div>

        <div className="field w-full">
          <div className="field-lbl">Simulasi Pindai Via Pilihan Aset</div>
          <select
            className="select"
            value={selectedAssetCode}
            onChange={(e) => setSelectedAssetCode(e.target.value)}
          >
            <option value="">-- Pilih Aset Lab --</option>
            {state.inventory.map((i: any) => (
              <option key={i.code} value={i.code}>
                [{i.code}] {i.name} ({i.room})
              </option>
            ))}
          </select>
        </div>

        {selectedAsset && (
          <div
            className="card compact w-full mt-4 p-3 animate-fade-in"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="text-xs text-ink">
              <b>Spesifikasi Aset Terdeteksi:</b>
            </div>
            <div className="text-xs text-ink-3 mt-1.5 leading-relaxed">
              <b>Nama:</b> {selectedAsset.name}
              <br />
              <b>Kategori:</b> {selectedAsset.cat}
              <br />
              <b>Kondisi:</b>{' '}
              <span className={`cond ${selectedAsset.cond.toLowerCase().replace(' ', '-')}`}>
                {selectedAsset.cond}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-foot gap-2">
        <button className="btn w-full justify-center" onClick={close}>
          Batal
        </button>
        <button
          className="btn primary w-full justify-center"
          onClick={handleScanSimulate}
          disabled={!selectedAsset}
        >
          <Icon name="qr" size={13} /> Pindai Simulasi
        </button>
      </div>
    </>
  );
}
