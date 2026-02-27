/* SIMPRO Module: gantt — v0.9.0 */
const Gantt = (() => {

  const ZOOM_CONFIGS = {
    week: {
      label: 'Week',
      colWidth: 40,       // px per day
      headerFormat: 'day', // render day numbers
      minDays: 14,
    },
    month: {
      label: 'Month',
      colWidth: 16,
      headerFormat: 'week',
      minDays: 30,
    },
    quarter: {
      label: 'Quarter',
      colWidth: 6,
      headerFormat: 'month',
      minDays: 90,
    },
  };

  function getZoomConfig(zoom) {
    return ZOOM_CONFIGS[zoom] || ZOOM_CONFIGS.month;
  }

  function getTasksWithDates(projectId) {
    return Storage.query('sp_tasks', t =>
      t.projectId === projectId && !t.parentId && t.dueDate
    ).sort((a, b) => {
      const da = a.startDate || a.dueDate;
      const db = b.startDate || b.dueDate;
      return da.localeCompare(db);
    });
  }

  function calculateLayout(tasks, milestones, zoom) {
    if (!tasks.length && !milestones.length) return null;

    const cfg = getZoomConfig(zoom);
    const today = Utils.todayISO();

    // Collect all dates
    const allDates = [];
    tasks.forEach(t => {
      if (t.startDate) allDates.push(t.startDate);
      if (t.dueDate) allDates.push(t.dueDate);
    });
    milestones.forEach(m => {
      if (m.dueDate) allDates.push(m.dueDate);
    });
    allDates.push(today);

    const sorted = allDates.sort();
    let rangeStart = sorted[0];
    let rangeEnd   = sorted[sorted.length - 1];

    // Pad range
    const startDate = _shiftDate(rangeStart, -3);
    const totalDays = Math.max(
      cfg.minDays,
      _daysBetween(startDate, _shiftDate(rangeEnd, 5)) + 1
    );

    return { startDate, totalDays, cfg };
  }

  // ── SVG renderer helpers ───────────────────────────────────────────────────

  function _daysBetween(a, b) {
    const msA = new Date(a).getTime();
    const msB = new Date(b).getTime();
    return Math.round((msB - msA) / 86400000);
  }

  function _shiftDate(iso, days) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function _dateAtOffset(startDate, offset) {
    return _shiftDate(startDate, offset);
  }

  // Render grid header rows: dates across the top
  function _buildHeaderGroups(startDate, totalDays, cfg) {
    const groups = [];
    if (cfg.headerFormat === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        groups.push({ label: String(d.getDate()), x: i * cfg.colWidth, w: cfg.colWidth, isWeekend, day: d });
      }
    } else if (cfg.headerFormat === 'week') {
      let i = 0;
      while (i < totalDays) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const weekNum = _weekNumber(d);
        let w = 0;
        const startI = i;
        while (i < totalDays) {
          const di = new Date(startDate);
          di.setDate(di.getDate() + i);
          if (_weekNumber(di) !== weekNum) break;
          w++;
          i++;
        }
        groups.push({ label: `W${weekNum}`, x: startI * cfg.colWidth, w: w * cfg.colWidth, day: d });
      }
    } else if (cfg.headerFormat === 'month') {
      let i = 0;
      while (i < totalDays) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const month = d.getMonth();
        const year  = d.getFullYear();
        let w = 0;
        const startI = i;
        while (i < totalDays) {
          const di = new Date(startDate);
          di.setDate(di.getDate() + i);
          if (di.getMonth() !== month || di.getFullYear() !== year) break;
          w++;
          i++;
        }
        const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        groups.push({ label: monthName, x: startI * cfg.colWidth, w: w * cfg.colWidth, day: d });
      }
    }
    return groups;
  }

  function _weekNumber(d) {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  }

  const STATUS_COLORS = {
    'todo':        { fill: '#E0E4F0', stroke: '#A0AABB' },
    'in-progress': { fill: '#BFD4FD', stroke: '#3B5BDB' },
    'inprogress':  { fill: '#BFD4FD', stroke: '#3B5BDB' },
    'review':      { fill: '#FFE8A3', stroke: '#E67700' },
    'inreview':    { fill: '#FFE8A3', stroke: '#E67700' },
    'done':        { fill: '#B2F0C8', stroke: '#2F9E44' },
  };

  function renderToSVG(tasks, milestones, layout, rowHeight, leftWidth) {
    const { startDate, totalDays, cfg } = layout;
    const today = Utils.todayISO();
    const svgW = totalDays * cfg.colWidth;

    const headerH  = cfg.headerFormat === 'day' ? 28 : 48;
    const taskRows = tasks.length;
    const msRows   = milestones.length;
    const totalRows = taskRows + msRows;
    const svgH = headerH + totalRows * rowHeight;

    const headerGroups = _buildHeaderGroups(startDate, totalDays, cfg);
    const todayX = _daysBetween(startDate, today) * cfg.colWidth;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="display:block;min-width:${svgW}px">`;

    // ── Grid background ──
    svg += `<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="var(--color-bg)"/>`;

    // Weekend shading (week zoom only)
    if (cfg.headerFormat === 'day') {
      headerGroups.forEach(g => {
        if (g.isWeekend) {
          svg += `<rect x="${g.x}" y="${headerH}" width="${g.w}" height="${svgH - headerH}" fill="var(--color-surface-2)" opacity="0.7"/>`;
        }
      });
    }

    // Vertical grid lines
    for (let i = 0; i <= totalDays; i++) {
      const x = i * cfg.colWidth;
      svg += `<line x1="${x}" y1="${headerH}" x2="${x}" y2="${svgH}" stroke="var(--color-border)" stroke-width="0.5"/>`;
    }

    // Horizontal row lines
    for (let r = 0; r <= totalRows; r++) {
      const y = headerH + r * rowHeight;
      svg += `<line x1="0" y1="${y}" x2="${svgW}" y2="${y}" stroke="var(--color-border)" stroke-width="0.5"/>`;
    }

    // ── Header ──
    if (cfg.headerFormat !== 'day') {
      // Two-row header for week/month views
      const topH = 22;
      const botH = headerH - topH;

      // Build sub-header (days numbers for week, week numbers for month)
      let subGroups = [];
      if (cfg.headerFormat === 'week') {
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          subGroups.push({ label: String(d.getDate()), x: i * cfg.colWidth, w: cfg.colWidth, isWeekend });
        }
      } else {
        subGroups = _buildHeaderGroups(startDate, totalDays, { headerFormat: 'week', colWidth: cfg.colWidth });
      }

      svg += `<rect x="0" y="0" width="${svgW}" height="${topH}" fill="var(--color-surface-2)"/>`;
      svg += `<rect x="0" y="${topH}" width="${svgW}" height="${botH}" fill="var(--color-surface)"/>`;

      headerGroups.forEach(g => {
        svg += `<text x="${g.x + g.w / 2}" y="${topH / 2 + 4}" text-anchor="middle" font-size="11" fill="var(--color-text)" font-family="var(--font-sans)" font-weight="500">${g.label}</text>`;
        svg += `<line x1="${g.x}" y1="0" x2="${g.x}" y2="${topH}" stroke="var(--color-border)" stroke-width="1"/>`;
      });
      subGroups.forEach(g => {
        svg += `<text x="${g.x + g.w / 2}" y="${topH + botH / 2 + 4}" text-anchor="middle" font-size="10" fill="var(--color-text-3)" font-family="var(--font-sans)">${g.label}</text>`;
      });
      svg += `<line x1="0" y1="${topH}" x2="${svgW}" y2="${topH}" stroke="var(--color-border)" stroke-width="1"/>`;
    } else {
      svg += `<rect x="0" y="0" width="${svgW}" height="${headerH}" fill="var(--color-surface)"/>`;
      headerGroups.forEach(g => {
        svg += `<text x="${g.x + g.w / 2}" y="${headerH / 2 + 4}" text-anchor="middle" font-size="11" fill="${g.isWeekend ? 'var(--color-text-3)' : 'var(--color-text)'}" font-family="var(--font-sans)">${g.label}</text>`;
      });
      svg += `<line x1="0" y1="${headerH}" x2="${svgW}" y2="${headerH}" stroke="var(--color-border)" stroke-width="1"/>`;
    }

    // ── Task bars ──
    tasks.forEach((task, i) => {
      const y = headerH + i * rowHeight;
      const barY = y + (rowHeight - 20) / 2;
      const taskStart = task.startDate || task.dueDate;
      const taskEnd   = task.dueDate;

      const x1 = Math.max(0, _daysBetween(startDate, taskStart)) * cfg.colWidth;
      const x2 = Math.max(x1 + cfg.colWidth, (_daysBetween(startDate, taskEnd) + 1) * cfg.colWidth);
      const w  = Math.max(cfg.colWidth, x2 - x1);

      const col = STATUS_COLORS[task.status] || STATUS_COLORS.todo;
      const radius = 4;

      // Progress fill
      let progressW = 0;
      if (task.status === 'done') progressW = w;
      else if (task.status === 'in-progress' || task.status === 'inprogress' || task.status === 'review' || task.status === 'inreview') {
        progressW = Math.round(w * 0.5);
      }

      svg += `<g class="gantt-bar" data-task-id="${task.id}" style="cursor:pointer">`;
      svg += `<rect x="${x1}" y="${barY}" width="${w}" height="20" rx="${radius}" fill="${col.fill}" stroke="${col.stroke}" stroke-width="1.2"/>`;
      if (progressW > 0) {
        svg += `<rect x="${x1}" y="${barY}" width="${progressW}" height="20" rx="${radius}" fill="${col.stroke}" opacity="0.35"/>`;
      }
      // Label inside bar if wide enough
      if (w > 40) {
        const label = task.key;
        svg += `<text x="${x1 + 6}" y="${barY + 13}" font-size="10" fill="${col.stroke}" font-family="var(--font-mono)" font-weight="500" clip-path="url(#clip-${task.id})">${_esc(label)}</text>`;
        svg += `<clipPath id="clip-${task.id}"><rect x="${x1}" y="${barY}" width="${w - 4}" height="20"/></clipPath>`;
      }
      svg += `</g>`;
    });

    // ── Milestone diamonds ──
    milestones.forEach((ms, i) => {
      if (!ms.dueDate) return;
      const rowIdx = taskRows + i;
      const y = headerH + rowIdx * rowHeight;
      const cx = (_daysBetween(startDate, ms.dueDate) + 0.5) * cfg.colWidth;
      const cy = y + rowHeight / 2;
      const size = 8;

      const msColor = ms.status === 'completed' ? '#2F9E44'
                    : ms.status === 'missed'     ? '#C92A2A'
                    : '#7048E8';

      svg += `<g class="gantt-milestone" data-ms-id="${ms.id}" style="cursor:pointer">`;
      svg += `<polygon points="${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}" fill="${msColor}" opacity="0.9"/>`;
      svg += `</g>`;
    });

    // ── Today marker ──
    if (todayX >= 0 && todayX <= svgW) {
      svg += `<line x1="${todayX}" y1="${headerH}" x2="${todayX}" y2="${svgH}" stroke="var(--color-danger)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
      svg += `<rect x="${todayX - 17}" y="0" width="34" height="16" rx="3" fill="var(--color-danger)"/>`;
      svg += `<text x="${todayX}" y="11" text-anchor="middle" font-size="9" fill="white" font-family="var(--font-sans)" font-weight="600">Hari Ini</text>`;
    }

    svg += `</svg>`;
    return svg;
  }

  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { calculateLayout, getTasksWithDates, renderToSVG, getZoomConfig };
})();
