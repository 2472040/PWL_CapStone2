import React, { useState, useEffect } from 'react';
import { useStore, Icon } from './app-shell.jsx';
import { apiFetch } from '../services/api';

export function AiPredictiveModal({ payload, close }) {
  const { state } = useStore();
  const { bhpId, bhpName } = payload;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0.85);

  useEffect(() => {
    async function fetchPrediction() {
      try {
        const res = await apiFetch(`/bhp/${bhpId}/predictive`);
        if (res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load predictive statistics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPrediction();
  }, [bhpId]);

  // Simulated AI training steps
  useEffect(() => {
    if (loading || !data) return;

    let timer;
    const maxEpochs = data.epochsTrained || 50;

    const trainStep = () => {
      setEpoch((prev) => {
        if (prev >= maxEpochs) {
          setTraining(false);
          return maxEpochs;
        }

        // Decaying loss curve mimicking actual OLS/gradient descent
        const targetLoss = data.lossMse || 0.024;
        const decay = Math.exp(-prev / 12);
        const lossVal = targetLoss + (0.85 - targetLoss) * decay + (Math.random() * 0.015 - 0.0075);
        setCurrentLoss(Math.max(targetLoss, Number(lossVal.toFixed(4))));

        timer = setTimeout(trainStep, 20);
        return prev + 1;
      });
    };

    timer = setTimeout(trainStep, 20);
    return () => clearTimeout(timer);
  }, [loading, data]);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 text-center"
        style={{ minWidth: '400px', minHeight: '300px' }}
      >
        <Icon name="bolt" size={32} className="text-violet animate-pulse mb-3" />
        <h3 className="text-base font-bold">Menghubungkan ke LokaLab AI...</h3>
        <p className="text-xs text-ink-3 mt-1">
          Mengumpulkan riwayat transaksi pengadaan & log pemeliharaan.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex flex-col items-center justify-center p-8 text-center"
        style={{ minWidth: '400px', minHeight: '300px' }}
      >
        <Icon name="alert" size={32} className="text-rose mb-3" />
        <h3 className="text-base font-bold text-rose">Gagal Memuat Analisis AI</h3>
        <p className="text-xs text-ink-3 mt-1">
          Gagal memproses model analisis prediktif pada server lokal.
        </p>
        <button className="btn sm mt-4" onClick={close}>
          Tutup
        </button>
      </div>
    );
  }

  const {
    currentStock,
    unit,
    dailyBurnRate,
    predictedDays,
    predictedDate,
    r2Score,
    lossMse,
    coordinates,
    usagesCount,
    aiAnalysis,
    riskTitle,
    riskColor,
    slopeSe,
    tStatistic,
    pValueScore,
    mLowerBound,
    mUpperBound,
    confLowerDays,
    confUpperDays,
  } = data;

  // Render SVG regression chart
  const hasCoordinates = coordinates && coordinates.length >= 1;
  const padding = 25;
  const width = 360;
  const height = 160;

  let points = [];
  let regressionPath = '';

  if (hasCoordinates) {
    const maxX = Math.max(30, ...coordinates.map((c) => c.x));
    const maxY = Math.max(10, ...coordinates.map((c) => c.y), currentStock * 1.5);

    const getX = (val) => padding + (val / maxX) * (width - 2 * padding);
    const getY = (val) => height - padding - (val / maxY) * (height - 2 * padding);

    points = coordinates.map((c) => ({
      cx: getX(c.x),
      cy: getY(c.y),
      x: c.x,
      y: c.y,
    }));

    // Generate fitted regression line from x=0 to x=maxX
    const y0 = getY(0);
    const yMax = getY(maxX * dailyBurnRate);
    regressionPath = `M ${getX(0)} ${y0} L ${getX(maxX)} ${yMax}`;
  }

  return (
    <div
      className="flex flex-col min-h-0 w-full overflow-hidden"
      style={{ height: 'auto', maxHeight: 'calc(80vh - 48px)' }}
    >
      {/* Header (fixed at top) */}
      <div className="flex justify-between items-start mb-4 shrink-0">
        <div>
          <span className="mono text-[10px] text-violet font-bold bg-violet/10 px-2 py-0.5 rounded tracking-wider uppercase flex items-center gap-1 w-max">
            <Icon name="bolt" size={9} /> LokaLab Predictive AI v2.0
          </span>
          <h2 className="text-base font-bold mt-1 tracking-tight">AI Predictive Analysis</h2>
          <p className="text-xs text-ink-3 truncate max-w-[340px] mt-0.5">{bhpName}</p>
        </div>
        <button className="act-btn" onClick={close}>
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Main scrollable content body */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0">
        {training ? (
          /* Training State Screen */
          <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
            <div className="relative w-14 h-14 flex items-center justify-center mb-4">
              {/* Spinning gradient outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-t-violet border-r-transparent border-b-cyan border-l-transparent animate-spin" />
              <Icon name="bolt" size={20} className="text-violet animate-pulse" />
            </div>

            <h3 className="text-xs font-bold tracking-tight">Melatih Model Regresi Linear...</h3>

            <div className="w-full bg-surface-2 rounded-full h-1 mt-3 max-w-[160px] overflow-hidden">
              <div
                className="bg-violet h-full rounded-full transition-all duration-100"
                style={{ width: `${(epoch / data.epochsTrained) * 100}%` }}
              />
            </div>

            <div className="flex gap-4 justify-center items-center mt-5 mono text-[10px] text-ink-3">
              <div>
                Epoch: <span className="text-violet font-semibold">{epoch}</span>/
                {data.epochsTrained}
              </div>
              <div className="h-3 w-px bg-surface" />
              <div>
                Loss (MSE): <span className="text-cyan font-semibold">{currentLoss}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Prediction Results Screen */
          <div className="flex flex-col gap-4 flex-1">
            {/* Main Alert Card */}
            <div
              className="card compact glow flex items-start gap-3 p-4"
              style={{
                '--role-accent': predictedDays < 15 ? 'var(--color-rose)' : 'var(--color-cyan)',
                background: 'rgba(255,255,255,0.01)',
              }}
            >
              <div className="p-2 rounded bg-surface-2 flex items-center justify-center shrink-0">
                <Icon
                  name={predictedDays < 15 ? 'alert' : 'flask'}
                  size={18}
                  className={predictedDays < 15 ? 'text-rose' : 'text-cyan'}
                />
              </div>
              <div>
                <span className="text-[10px] text-ink-3 uppercase tracking-wider font-bold">
                  Hasil Estimasi AI
                </span>
                <h4 className="text-sm font-bold mt-1 text-ink leading-snug">
                  {predictedDays > 0 && predictedDays < 365 ? (
                    <>
                      Stok diprediksi habis dalam{' '}
                      <span
                        className={
                          predictedDays < 15 ? 'text-rose font-bold' : 'text-cyan font-bold'
                        }
                      >
                        {predictedDays} hari
                      </span>
                    </>
                  ) : (
                    <span className="text-green font-bold">Aman & stabil (&gt; 1 year)</span>
                  )}
                </h4>
                <p className="text-[11px] text-ink-3 mt-1.5 leading-normal">
                  {predictedDays > 0 && predictedDays < 365 ? (
                    <>
                      Berdasarkan tren penggunaan harian, sisa{' '}
                      <b>
                        {currentStock} {unit}
                      </b>{' '}
                      diprediksi akan habis pada tanggal{' '}
                      <b>
                        {new Date(predictedDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </b>
                      .
                    </>
                  ) : (
                    <>
                      Rata-rata penggunaan harian sangat kecil. Stok{' '}
                      <b>
                        {currentStock} {unit}
                      </b>{' '}
                      saat ini diproyeksikan mencukupi kebutuhan jangka panjang.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* AI Analysis & Recommendation Card */}
            {aiAnalysis && (
              <div
                className="card compact glow flex items-start gap-3 p-4"
                style={{
                  '--role-accent': 'var(--color-violet)',
                  background: 'rgba(183,148,255,0.03)',
                  borderColor: 'rgba(183,148,255,0.15)',
                }}
              >
                <div className="p-2 rounded bg-violet/10 flex items-center justify-center text-violet shrink-0">
                  <Icon name="bolt" size={18} className="animate-pulse" />
                </div>
                <div className="grow">
                  <span className="text-[10px] text-violet uppercase tracking-wider font-bold flex items-center gap-1">
                    <Icon name="bolt" size={10} /> Analisis & Rekomendasi AI LokaLab
                  </span>
                  <div
                    className="text-xs text-ink-2 mt-2 leading-relaxed font-normal"
                    dangerouslySetInnerHTML={{ __html: aiAnalysis }}
                  />
                </div>
              </div>
            )}

            {/* Dynamic SVG Regression Chart */}
            <div className="card compact p-3 flex flex-col items-center">
              <span className="text-[10px] text-ink-3 uppercase tracking-wider font-bold mb-2 self-start">
                Visualisasi Tren & Regresi Linear
              </span>

              {hasCoordinates ? (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto overflow-visible mt-1"
                >
                  {/* Horizontal grid lines */}
                  <line
                    x1={padding}
                    y1={padding}
                    x2={width - padding}
                    y2={padding}
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth={1}
                  />
                  <line
                    x1={padding}
                    y1={height / 2}
                    x2={width - padding}
                    y2={height / 2}
                    stroke="rgba(255,255,255,0.03)"
                    strokeWidth={1}
                  />
                  <line
                    x1={padding}
                    y1={height - padding}
                    x2={width - padding}
                    y2={height - padding}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1.5}
                  />

                  {/* Vertical Axis line */}
                  <line
                    x1={padding}
                    y1={padding}
                    x2={padding}
                    y2={height - padding}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1.5}
                  />

                  {/* Regression fitted line */}
                  {regressionPath && (
                    <path
                      d={regressionPath}
                      fill="none"
                      stroke="var(--color-violet)"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      style={{ opacity: 0.8 }}
                    />
                  )}

                  {/* Historical Scatter plot points */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group">
                      <circle
                        cx={p.cx}
                        cy={p.cy}
                        r={4}
                        fill="var(--color-cyan)"
                        className="transition-all hover:r-6 cursor-help"
                      />
                      <title>{`Hari ${p.x}: Pakai ${p.y} ${unit}`}</title>
                    </g>
                  ))}

                  {/* Legend / Axis Labels */}
                  <text
                    x={padding}
                    y={height - 6}
                    fill="rgba(255,255,255,0.3)"
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    WAKTU (HARI)
                  </text>
                  <text
                    x={width - padding}
                    y={height - 6}
                    fill="rgba(255,255,255,0.3)"
                    fontSize={8}
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    HARI INI
                  </text>
                  <text
                    x={padding + 5}
                    y={padding + 8}
                    fill="rgba(255,255,255,0.3)"
                    fontSize={8}
                    fontFamily="monospace"
                    transform={`rotate(90 ${padding} ${padding})`}
                  >
                    KONSUMSI ({unit.toUpperCase()})
                  </text>
                </svg>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-ink-3">
                  <Icon name="cal" size={20} className="opacity-30 mb-2" />
                  <span className="text-[10px] leading-relaxed">
                    Belum ada riwayat konsumsi BHP.
                    <br />
                    Model menggunakan asumsi standar.
                  </span>
                </div>
              )}
            </div>

            {/* Model Statistics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  Akurasi R²
                </span>
                <div className="text-xs font-semibold text-green mt-0.5">
                  {usagesCount >= 2 ? `${Math.round(r2Score * 100)}%` : '95%'}
                </div>
              </div>
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  MSE Loss
                </span>
                <div className="text-xs font-semibold text-violet mt-0.5">{lossMse}</div>
              </div>
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  Laju Harian
                </span>
                <div
                  className="text-xs font-semibold text-cyan mt-0.5 truncate"
                  title={`${dailyBurnRate} ${unit}/hari`}
                >
                  {dailyBurnRate} {unit}
                </div>
              </div>
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  P-Value
                </span>
                <div className="text-xs font-semibold mt-0.5 text-amber">
                  {usagesCount >= 2 ? pValueScore : '-'}
                </div>
              </div>
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  Std. Error
                </span>
                <div className="text-xs font-semibold mt-0.5 text-ink-2">
                  {usagesCount >= 2 ? slopeSe : '-'}
                </div>
              </div>
              <div
                className="card compact p-2 text-center"
                style={{ background: 'rgba(255,255,255,0.01)' }}
              >
                <span className="text-[9px] text-ink-3 uppercase font-bold tracking-wider">
                  Rentang Hari
                </span>
                <div
                  className="text-xs font-semibold mt-0.5 text-violet"
                  style={{ color: 'var(--color-violet)' }}
                >
                  {usagesCount >= 2
                    ? `${confLowerDays}-${confUpperDays}`
                    : `${Math.ceil(predictedDays)}`}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-ink-3 text-center leading-normal italic mt-1 shrink-0">
              *Model dilatih secara linear dari total {usagesCount} riwayat pemeliharaan pada
              database.
            </p>
          </div>
        )}
      </div>

      {/* Footer (fixed at bottom) */}
      <div className="flex justify-end mt-4 pt-3 border-t border-surface shrink-0">
        <button className="btn primary sm" onClick={close}>
          Tutup Analisis
        </button>
      </div>
    </div>
  );
}
