import React from 'react';
import { D, RoleIcon, AuRise, AuStagger, ScrambleText } from './LandingUtils.jsx';

export default function RolesSection() {
  return (
    <section className="au-section">
      <AuRise>
        <div className="au-section-tag">
          <ScrambleText text="— Untuk siapa" />
        </div>
        <h2 className="au-section-h2">
          Lima peran, satu <em>alur</em>. Setiap orang tahu giliran mereka.
        </h2>
        <p className="au-section-sub">
          Loka memetakan tugas per-role secara eksplisit — tidak ada draf yang ngendap di inbox,
          tidak ada stok BHP yang lupa dicatat.
        </p>
      </AuRise>
      <AuStagger className="au-roles">
        {D.roles.map((r, i) => (
          <div key={r.id} className={`au-role ${i === 0 ? 'r-big' : 'r-small'}`} data-c={r.color}>
            <div className="au-role-glow" />
            <div className="au-role-icon" style={{ color: 'var(--ink-2)' }}>
              <RoleIcon kind={r.id} />
            </div>
            <div className="au-role-short">{r.short}</div>
            <div className="au-role-title">{r.title}</div>
            <div className="au-role-action">{r.action}</div>
            {i === 0 && <div className="au-role-desc">{r.desc}</div>}
            <div className="au-role-tasks">
              {r.tasks.map((t) => (
                <div key={t} className="au-role-task">
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </AuStagger>
    </section>
  );
}
