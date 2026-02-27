/* SIMPRO Page: reports — v0.12.0 */
const Page = (() => {

  let _projectId = null;
  let _sprintId  = null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _getProjects() {
    const user = Auth.getCurrentUser();
    if (!user) return [];
    const all = Storage.get('sp_projects') || [];
    if (user.role === 'admin' || user.role === 'pm') return all.filter(p => p.status !== 'archived');
    return all.filter(p => (p.memberIds || []).includes(user.id) && p.status !== 'archived');
  }

  function _getSprints(projectId) {
    return (Storage.get('sp_sprints') || [])
      .filter(s => s.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function _h(hrs) {
    return hrs === 0 ? '0j' : `${Math.round(hrs * 10) / 10}j`;
  }

  // ── Canvas Drawing Primitives ─────────────────────────────────────────────
  function _isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function _colors() {
    const dark = _isDark();
    return {
      text:    dark ? '#9BA0AD' : '#5C6070',
      text2:   dark ? '#5C6070' : '#9BA0AD',
      grid:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      accent:  '#3B5BDB',
      success: '#2F9E44',
      warning: '#E67700',
      danger:  '#C92A2A',
      purple:  '#7048E8',
      surface: dark ? '#1E2028' : '#FFFFFF',
    };
  }

  function _setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 600;
    const h = rect.height || canvas.offsetHeight || 280;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function _drawGrid(ctx, x0, y0, x1, y1, rows, C) {
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= rows; i++) {
      const y = y0 + (y1 - y0) * (i / rows);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    }
  }

  function _axisLabel(ctx, text, x, y, align, C) {
    ctx.fillStyle = C.text;
    ctx.textAlign = align;
    ctx.font = `11px DM Sans, system-ui, sans-serif`;
    ctx.fillText(text, x, y);
  }

  // ── Burndown Chart ────────────────────────────────────────────────────────
  function _drawBurndown(canvas, data) {
    const { ctx, w, h } = _setupCanvas(canvas);
    const C = _colors();
    const pad = { t: 16, r: 16, b: 40, l: 48 };
    const cx0 = pad.l, cy0 = pad.t, cx1 = w - pad.r, cy1 = h - pad.b;
    const cw = cx1 - cx0, ch = cy1 - cy0;

    if (!data || data.labels.length < 2) {
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.font = '13px DM Sans, system-ui';
      ctx.fillText('Data tidak cukup', w / 2, h / 2);
      return;
    }

    const maxVal = data.totalPoints || 1;
    const rows = 5;

    ctx.clearRect(0, 0, w, h);
    _drawGrid(ctx, cx0, cy0, cx1, cy1, rows, C);

    // Y axis labels
    for (let i = 0; i <= rows; i++) {
      const val = Math.round(maxVal * (1 - i / rows));
      const y = cy0 + ch * (i / rows);
      _axisLabel(ctx, val, cx0 - 8, y + 4, 'right', C);
    }

    // X axis labels — show max 8
    const step = Math.max(1, Math.ceil(data.labels.length / 8));
    data.labels.forEach((lbl, i) => {
      if (i % step !== 0 && i !== data.labels.length - 1) return;
      const x = cx0 + cw * (i / (data.labels.length - 1));
      _axisLabel(ctx, lbl, x, cy1 + 16, 'center', C);
    });

    function toXY(i, val) {
      return {
        x: cx0 + cw * (i / (data.labels.length - 1)),
        y: cy0 + ch * (1 - val / maxVal),
      };
    }

    // Planned area fill
    ctx.beginPath();
    const p0 = toXY(0, data.planned[0]);
    ctx.moveTo(p0.x, p0.y);
    data.planned.forEach((v, i) => { const p = toXY(i, v); ctx.lineTo(p.x, p.y); });
    ctx.lineTo(cx1, cy1); ctx.lineTo(cx0, cy1); ctx.closePath();
    ctx.fillStyle = 'rgba(59,91,219,0.08)';
    ctx.fill();

    // Planned line
    ctx.beginPath();
    data.planned.forEach((v, i) => {
      const p = toXY(i, v);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Actual line
    if (data.actual.length > 1) {
      ctx.beginPath();
      data.actual.forEach((v, i) => {
        const p = toXY(i, v);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Actual dots
      data.actual.forEach((v, i) => {
        const p = toXY(i, v);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = C.danger;
        ctx.fill();
      });
    }
  }

  // ── Velocity Chart ────────────────────────────────────────────────────────
  function _drawVelocity(canvas, data) {
    const { ctx, w, h } = _setupCanvas(canvas);
    const C = _colors();
    const pad = { t: 16, r: 16, b: 48, l: 48 };
    const cx0 = pad.l, cy0 = pad.t, cx1 = w - pad.r, cy1 = h - pad.b;
    const cw = cx1 - cx0, ch = cy1 - cy0;

    ctx.clearRect(0, 0, w, h);

    if (!data || !data.length) {
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.font = '13px DM Sans, system-ui';
      ctx.fillText('Belum ada sprint selesai', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...data.map(d => Math.max(d.planned, d.done)), 1);
    const rows = 5;
    _drawGrid(ctx, cx0, cy0, cx1, cy1, rows, C);

    for (let i = 0; i <= rows; i++) {
      const val = Math.round(maxVal * (1 - i / rows));
      const y = cy0 + ch * (i / rows);
      _axisLabel(ctx, val, cx0 - 8, y + 4, 'right', C);
    }

    const barGroupW = cw / data.length;
    const barW = Math.min(barGroupW * 0.35, 28);
    const gap = 4;

    data.forEach((d, i) => {
      const gx = cx0 + barGroupW * i + barGroupW / 2;

      // Planned bar
      const ph = (d.planned / maxVal) * ch;
      ctx.fillStyle = 'rgba(59,91,219,0.2)';
      ctx.fillRect(gx - barW - gap / 2, cy1 - ph, barW, ph);
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx - barW - gap / 2, cy1 - ph, barW, ph);

      // Done bar
      const dh = (d.done / maxVal) * ch;
      const doneColor = d.status === 'completed'
        ? (d.done >= d.planned ? C.success : C.warning)
        : C.accent;
      ctx.fillStyle = doneColor;
      ctx.fillRect(gx + gap / 2, cy1 - dh, barW, dh);

      // Sprint label
      const lbl = d.sprintName.length > 10 ? d.sprintName.slice(0, 10) + '…' : d.sprintName;
      _axisLabel(ctx, lbl, gx, cy1 + 14, 'center', C);
      if (d.done > 0) {
        ctx.fillStyle = C.text;
        ctx.textAlign = 'center';
        ctx.font = '10px DM Sans, system-ui';
        ctx.fillText(d.done, gx + gap / 2 + barW / 2, cy1 - dh - 4);
      }
    });
  }

  // ── Donut Chart (Status) ──────────────────────────────────────────────────
  function _drawDonut(canvas, byStatus, total) {
    const { ctx, w, h } = _setupCanvas(canvas);
    const C = _colors();
    ctx.clearRect(0, 0, w, h);

    const segments = [
      { key: 'todo',        label: 'To Do',       color: '#9BA0AD' },
      { key: 'in-progress', label: 'In Progress',  color: C.accent },
      { key: 'review',      label: 'In Review',    color: C.warning },
      { key: 'done',        label: 'Done',         color: C.success },
    ].filter(s => byStatus[s.key] > 0);

    if (total === 0) {
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.font = '13px DM Sans, system-ui';
      ctx.fillText('Tidak ada task', w / 2, h / 2);
      return;
    }

    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 24;
    const inner = r * 0.58;
    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
      const val  = byStatus[seg.key] || 0;
      const sweep = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sweep;
    });

    // Inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = C.surface;
    ctx.fill();

    // Center text
    ctx.fillStyle = _isDark() ? '#EAEDF3' : '#1A1D23';
    ctx.textAlign = 'center';
    ctx.font = `bold 22px DM Sans, system-ui`;
    ctx.fillText(total, cx, cy + 1);
    ctx.fillStyle = C.text;
    ctx.font = `11px DM Sans, system-ui`;
    ctx.fillText('total task', cx, cy + 16);
  }

  // ── Horizontal Bar (Assignee) ─────────────────────────────────────────────
  function _drawAssigneeBar(canvas, data) {
    const { ctx, w, h } = _setupCanvas(canvas);
    const C = _colors();
    ctx.clearRect(0, 0, w, h);

    if (!data || !data.length) {
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.font = '13px DM Sans, system-ui';
      ctx.fillText('Tidak ada data', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...data.map(d => d.count), 1);
    const rowH   = Math.min(32, (h - 16) / data.length);
    const labelW = 100;
    const barX0  = labelW + 8;
    const barW   = w - barX0 - 48;

    data.slice(0, 10).forEach((d, i) => {
      const y = 8 + i * rowH + rowH / 2;

      // Name
      ctx.fillStyle = C.text;
      ctx.textAlign = 'right';
      ctx.font = '12px DM Sans, system-ui';
      const name = d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name;
      ctx.fillText(name, labelW, y + 4);

      // Bar bg
      ctx.fillStyle = C.grid;
      ctx.beginPath();
      ctx.roundRect(barX0, y - 8, barW, 16, 4);
      ctx.fill();

      // Total bar
      const tw = (d.count / maxVal) * barW;
      ctx.fillStyle = 'rgba(59,91,219,0.25)';
      ctx.beginPath();
      ctx.roundRect(barX0, y - 8, tw, 16, 4);
      ctx.fill();

      // Done bar
      const dw = (d.done / maxVal) * barW;
      ctx.fillStyle = C.success;
      ctx.beginPath();
      ctx.roundRect(barX0, y - 8, dw, 16, 4);
      ctx.fill();

      // Count label
      ctx.fillStyle = C.text;
      ctx.textAlign = 'left';
      ctx.font = '11px DM Sans, system-ui';
      ctx.fillText(`${d.done}/${d.count}`, barX0 + tw + 6, y + 4);
    });
  }

  // ── Priority Bar ──────────────────────────────────────────────────────────
  function _drawPriorityBar(canvas, byPriority, total) {
    const { ctx, w, h } = _setupCanvas(canvas);
    const C = _colors();
    ctx.clearRect(0, 0, w, h);

    const priorities = [
      { key: 'critical', label: 'Critical', color: C.danger },
      { key: 'high',     label: 'High',     color: C.warning },
      { key: 'medium',   label: 'Medium',   color: C.accent },
      { key: 'low',      label: 'Low',      color: '#9BA0AD' },
    ].filter(p => byPriority[p.key] > 0);

    if (!priorities.length) {
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      ctx.font = '13px DM Sans, system-ui';
      ctx.fillText('Tidak ada data', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...priorities.map(p => byPriority[p.key]), 1);
    const barCount = priorities.length;
    const barGroupW = w / barCount;
    const barW = Math.min(barGroupW * 0.55, 60);
    const pad = { t: 24, b: 40 };
    const ch = h - pad.t - pad.b;

    priorities.forEach((p, i) => {
      const val = byPriority[p.key] || 0;
      const bh  = (val / maxVal) * ch;
      const gx  = barGroupW * i + barGroupW / 2;
      const by  = pad.t + ch - bh;

      ctx.fillStyle = p.color + '33';
      ctx.beginPath();
      ctx.roundRect(gx - barW / 2, by, barW, bh, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(gx - barW / 2, by, barW, Math.min(bh, 6), [4, 4, 0, 0]);
      ctx.fill();

      // Count on top
      ctx.fillStyle = _isDark() ? '#EAEDF3' : '#1A1D23';
      ctx.textAlign = 'center';
      ctx.font = `bold 13px DM Sans, system-ui`;
      ctx.fillText(val, gx, by - 6);

      // Label
      ctx.fillStyle = C.text;
      ctx.font = '11px DM Sans, system-ui';
      ctx.fillText(p.label, gx, pad.t + ch + 16);

      // Percent
      ctx.fillStyle = C.text2;
      ctx.font = '10px DM Sans, system-ui';
      ctx.fillText(`${Math.round(val / total * 100)}%`, gx, pad.t + ch + 28);
    });
  }

  // ── Render Charts ─────────────────────────────────────────────────────────
  function _renderCharts(projectId, sprintId) {
    const dist   = Report.distribution(projectId, sprintId);
    const tStats = Report.timeStats(projectId, sprintId);
    const velData = Report.velocity(projectId);

    // Stat cards
    const statRow = document.getElementById('stat-row');
    if (statRow) {
      const doneCount = dist.byStatus.done || 0;
      const pct = dist.total ? Math.round(doneCount / dist.total * 100) : 0;
      statRow.innerHTML = `
        <div class="report-stat-card"><div class="stat-value">${dist.total}</div><div class="stat-label">Total Task</div></div>
        <div class="report-stat-card"><div class="stat-value">${doneCount}</div><div class="stat-label">Selesai</div></div>
        <div class="report-stat-card"><div class="stat-value">${pct}%</div><div class="stat-label">Progress</div></div>
        <div class="report-stat-card"><div class="stat-value">${_h(tStats.totalLogged)}</div><div class="stat-label">Jam Tercatat</div></div>
        <div class="report-stat-card"><div class="stat-value">${_h(tStats.totalEstimated)}</div><div class="stat-label">Jam Estimasi</div></div>
      `;
    }

    // Burndown
    const burnCanvas = document.getElementById('canvas-burndown');
    if (burnCanvas) {
      if (sprintId) {
        const burnData = Report.burndown(sprintId);
        _drawBurndown(burnCanvas, burnData);
      } else {
        // Use last active/completed sprint
        const sprints = _getSprints(projectId).filter(s => s.status !== 'planned');
        const last = sprints[sprints.length - 1];
        const burnData = last ? Report.burndown(last.id) : null;
        _drawBurndown(burnCanvas, burnData);
        const meta = document.getElementById('burndown-meta');
        if (meta) meta.textContent = last ? last.name : 'Pilih sprint untuk burndown spesifik';
      }
    }

    // Velocity
    const velCanvas = document.getElementById('canvas-velocity');
    if (velCanvas) _drawVelocity(velCanvas, velData);

    // Status donut
    const donutCanvas = document.getElementById('canvas-donut');
    if (donutCanvas) _drawDonut(donutCanvas, dist.byStatus, dist.total);

    // Assignee bar
    const assigneeCanvas = document.getElementById('canvas-assignee');
    if (assigneeCanvas) _drawAssigneeBar(assigneeCanvas, dist.byAssignee);

    // Priority bar
    const prioCanvas = document.getElementById('canvas-priority');
    if (prioCanvas) _drawPriorityBar(prioCanvas, dist.byPriority, dist.total);

    // Time table
    _renderTimeTable(tStats);
  }

  function _renderTimeTable(tStats) {
    const el = document.getElementById('time-section');
    if (!el) return;

    const maxLogged = Math.max(...tStats.byTask.map(t => t.logged), 1);

    const taskRows = tStats.byTask.length ? tStats.byTask.map(t => {
      const pct  = t.estimated > 0 ? Math.min((t.logged / t.estimated) * 100, 100) : 0;
      const estPct = t.estimated > 0 ? Math.min((t.logged / t.estimated) * 100, 200) : 0;
      return `<tr>
        <td><span class="task-key">${t.key}</span></td>
        <td>${Utils.truncate(t.title, 50)}</td>
        <td>${_h(t.estimated)}</td>
        <td class="${t.over ? 'over-estimate' : ''}">
          <div class="hours-bar-wrap">
            <div class="hours-bar-bg"><div class="hours-bar-fill${t.over ? ' over' : ''}" style="width:${Math.min(estPct, 100)}%"></div></div>
            <span>${_h(t.logged)}</span>
          </div>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--color-text-3);padding:16px;">Belum ada log waktu</td></tr>`;

    const memberRows = tStats.byMember.length ? tStats.byMember.map(m => {
      const pct = m.estimated > 0 ? Math.min((m.logged / m.estimated) * 100, 100) : 0;
      return `<tr>
        <td>${m.name}</td>
        <td>${_h(m.estimated)}</td>
        <td>
          <div class="hours-bar-wrap">
            <div class="hours-bar-bg"><div class="hours-bar-fill" style="width:${pct}%"></div></div>
            <span>${_h(m.logged)}</span>
          </div>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="3" style="text-align:center;color:var(--color-text-3);padding:16px;">Belum ada log waktu</td></tr>`;

    el.innerHTML = `
      <div class="chart-card full-width">
        <div class="chart-card-header">
          <span class="chart-card-title">Time Tracking — Per Task</span>
        </div>
        <div class="time-table-wrap">
          <table class="time-table">
            <thead><tr><th>Key</th><th>Task</th><th>Estimasi</th><th>Logged</th></tr></thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </div>
      <div class="chart-card full-width">
        <div class="chart-card-header">
          <span class="chart-card-title">Time Tracking — Per Member</span>
        </div>
        <div class="time-table-wrap">
          <table class="time-table">
            <thead><tr><th>Member</th><th>Estimasi</th><th>Logged</th></tr></thead>
            <tbody>${memberRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function _renderContent(projectId) {
    const content = document.getElementById('reports-content');
    content.innerHTML = `
      <div class="report-stat-row" id="stat-row"></div>

      <div class="reports-actions">
        <button class="btn btn-secondary btn-sm" id="btn-print">
          <i data-lucide="printer"></i> Cetak Laporan
        </button>
      </div>

      <div class="reports-grid">
        <div class="chart-card full-width">
          <div class="chart-card-header">
            <span class="chart-card-title">Burndown Chart</span>
            <span class="chart-card-meta" id="burndown-meta">Story points tersisa vs rencana</span>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-line" style="background:var(--color-accent);border-top:2px dashed var(--color-accent);"></div><span>Planned</span></div>
            <div class="legend-item"><div class="legend-line" style="background:var(--color-danger);"></div><span>Actual</span></div>
          </div>
          <div class="chart-canvas-wrap"><canvas id="canvas-burndown" height="240"></canvas></div>
        </div>

        <div class="chart-card full-width">
          <div class="chart-card-header">
            <span class="chart-card-title">Velocity per Sprint</span>
            <div class="chart-legend">
              <div class="legend-item"><div class="legend-dot" style="background:rgba(59,91,219,0.4);border:1.5px solid var(--color-accent);"></div><span>Planned</span></div>
              <div class="legend-item"><div class="legend-dot" style="background:var(--color-success);"></div><span>Done (tercapai)</span></div>
              <div class="legend-item"><div class="legend-dot" style="background:var(--color-warning);"></div><span>Done (kurang)</span></div>
            </div>
          </div>
          <div class="chart-canvas-wrap"><canvas id="canvas-velocity" height="220"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Task by Status</span>
          </div>
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-dot" style="background:#9BA0AD;"></div><span>To Do</span></div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--color-accent);"></div><span>In Progress</span></div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--color-warning);"></div><span>In Review</span></div>
            <div class="legend-item"><div class="legend-dot" style="background:var(--color-success);"></div><span>Done</span></div>
          </div>
          <div class="chart-canvas-wrap" style="height:200px;"><canvas id="canvas-donut" height="200"></canvas></div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">Task by Priority</span>
          </div>
          <div class="chart-canvas-wrap" style="height:200px;"><canvas id="canvas-priority" height="200"></canvas></div>
        </div>

        <div class="chart-card full-width">
          <div class="chart-card-header">
            <span class="chart-card-title">Task by Assignee</span>
            <div class="chart-legend">
              <div class="legend-item"><div class="legend-dot" style="background:var(--color-success);"></div><span>Done</span></div>
              <div class="legend-item"><div class="legend-dot" style="background:rgba(59,91,219,0.25);"></div><span>Total</span></div>
            </div>
          </div>
          <div class="chart-canvas-wrap"><canvas id="canvas-assignee" height="220"></canvas></div>
        </div>

        <div id="time-section" style="display:contents;"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    document.getElementById('btn-print').addEventListener('click', () => window.print());

    // Delay draw to let DOM settle (canvas needs width)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _renderCharts(projectId, _sprintId);
      });
    });
  }

  // ── Filter Logic ──────────────────────────────────────────────────────────
  function _populateProjects() {
    const sel = document.getElementById('filter-project');
    if (!sel) return;
    const projects = _getProjects();
    sel.innerHTML = '<option value="">Pilih project...</option>' +
      projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function _populateSprints(projectId) {
    const sel = document.getElementById('filter-sprint');
    if (!sel) return;
    if (!projectId) {
      sel.innerHTML = '<option value="">Semua sprint</option>';
      sel.disabled = true;
      return;
    }
    const sprints = _getSprints(projectId);
    sel.innerHTML = '<option value="">Semua sprint</option>' +
      sprints.map(s => `<option value="${s.id}">${s.name} (${s.status})</option>`).join('');
    sel.disabled = false;
  }

  function _onProjectChange() {
    const sel = document.getElementById('filter-project');
    _projectId = sel.value || null;
    _sprintId  = null;
    _populateSprints(_projectId);
    if (_projectId) {
      _renderContent(_projectId);
    } else {
      document.getElementById('reports-content').innerHTML = `
        <div class="report-empty" style="padding:80px 24px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          <p>Pilih project untuk melihat laporan</p>
          <span>Data burndown, velocity, distribusi task, dan time tracking akan tampil di sini</span>
        </div>`;
    }
  }

  function _onSprintChange() {
    const sel = document.getElementById('filter-sprint');
    _sprintId = sel.value || null;
    if (_projectId) _renderCharts(_projectId, _sprintId);
  }

  // ── Theme change → redraw ─────────────────────────────────────────────────
  function _bindThemeRedraw() {
    const obs = new MutationObserver(() => {
      if (_projectId) _renderCharts(_projectId, _sprintId);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ── Resize → redraw ───────────────────────────────────────────────────────
  function _bindResize() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (_projectId) _renderCharts(_projectId, _sprintId);
      }, 200);
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    _populateProjects();

    const projSel = document.getElementById('filter-project');
    const sprintSel = document.getElementById('filter-sprint');

    if (projSel)    projSel.addEventListener('change', _onProjectChange);
    if (sprintSel) sprintSel.addEventListener('change', _onSprintChange);

    _bindThemeRedraw();
    _bindResize();

    // Auto-select first project if only one
    const projects = _getProjects();
    if (projects.length === 1 && projSel) {
      projSel.value = projects[0].id;
      _onProjectChange();
    }
  }

  return { init };
})();
