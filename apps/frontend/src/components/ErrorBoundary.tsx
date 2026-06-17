import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Loka Error]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: 40,
            textAlign: 'center',
            color: 'var(--color-ink)',
            background: 'var(--color-bg)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(251,113,133,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              color: 'var(--color-rose)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Terjadi kesalahan
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-ink-2)',
              maxWidth: 400,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Aplikasi mengalami masalah. Coba muat ulang halaman atau hubungi admin jika masalah
            berlanjut.
          </p>
          <button className="btn" onClick={() => window.location.reload()}>
            Muat Ulang Halaman
          </button>
          {this.state.error && (
            <pre
              style={{
                marginTop: 24,
                fontSize: 11,
                color: 'var(--color-ink-3)',
                background: 'var(--color-surface)',
                padding: 16,
                borderRadius: 12,
                maxWidth: 600,
                overflow: 'auto',
                textAlign: 'left',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
