window.VX = {
  GOAL_MMR2: 95, GOAL_FLU: 80, GOAL_POLIO: 90,
  C: ['#1F7BC1', '#14A3A3', '#5B8DEF'],
  small: () => window.matchMedia('(max-width: 600px)').matches,
  ok: (id) => dash.data(id).status === 'ok',
  rows: (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : []; },
  int: d3.format(','),
  fail: (el, id) => {
    const s = dash.data(id).status;
    el.classList.toggle('dash-skeleton', s === 'loading');
    if (s === 'error') { el.replaceChildren(); const f = document.createElement('div'); f.className = 'fail'; f.textContent = 'โหลดข้อมูลไม่สำเร็จ'; el.append(f); return true; }
    if (s !== 'ok') { el.replaceChildren(); return true; }
    el.classList.remove('dash-skeleton');
    return false;
  },
  tip: (box) => {
    let t = box.querySelector(':scope > .tip');
    if (!t) { t = document.createElement('div'); t.className = 'tip'; t.hidden = true; box.append(t); }
    return t;
  },
  showTip: (box, tip, ev, lines) => {
    tip.replaceChildren(...lines.map((l, i) => { const d = document.createElement('div'); if (i === 0) d.className = 'k'; d.textContent = l; return d; }));
    tip.hidden = false;
    const r = box.getBoundingClientRect();
    let x = ev.clientX - r.left + 12, y = ev.clientY - r.top + 12;
    x = Math.min(x, r.width - tip.offsetWidth - 4); y = Math.min(y, r.height - tip.offsetHeight - 4);
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = Math.max(0, y) + 'px';
  }
};
VX.q = { mmr2: '', kb: '', ref: '', aud: 'parent', grp: '', kind: '', sub: '', net: '' };
VX.sort = { mmr2: { k: 'coverage', dir: 1 } };

// ---- ตัวเลขที่คำนวณจากข้อมูล ----
dash.calc('mmr2_total', {
  inputs: ['mmr2'],
  fn: (mmr2) => {
    const sum = (k) => mmr2.reduce((s, r) => s + Number(r[k] || 0), 0);
    const row = (period, t, v) => ({ period, target: t, vaccinated: v, coverage: Math.round(v / t * 1000) / 10 });
    const all = row('ทั้งปี', sum('target'), sum('vaccinated'));
    all.below_goal = mmr2.filter((r) => Number(r.coverage) < VX.GOAL_MMR2).length;
    all.districts = mmr2.length;
    return [all].concat([1, 2, 3, 4].map((q) => row('ไตรมาส ' + q, sum('q' + q + '_target'), sum('q' + q + '_vaccinated'))));
  }
});
dash.calc('mmr2_gap', {
  inputs: ['mmr2'],
  fn: (mmr2) => mmr2.filter((r) => Number(r.coverage) < VX.GOAL_MMR2)
    .map((r) => ({ district: r.district, coverage: Number(r.coverage), need: Math.max(0, Math.ceil(Number(r.target) * VX.GOAL_MMR2 / 100 - Number(r.vaccinated))) }))
    .sort((a, b) => a.coverage - b.coverage)
});
dash.calc('flu_total', {
  inputs: ['flu'],
  fn: (flu) => {
    const t = flu.reduce((s, r) => s + Number(r.target), 0), v = flu.reduce((s, r) => s + Number(r.vaccinated), 0);
    return [{ target: t, vaccinated: v, coverage: Math.round(v / t * 1000) / 10, below_goal: flu.filter((r) => Number(r.coverage) < VX.GOAL_FLU).length }];
  }
});
dash.calc('flu_gap', {
  inputs: ['flu'],
  fn: (flu) => flu.filter((r) => Number(r.coverage) < VX.GOAL_FLU)
    .map((r) => ({ unit: r.unit, coverage: Number(r.coverage), need: Math.max(0, Math.ceil(Number(r.target) * VX.GOAL_FLU / 100 - Number(r.vaccinated))) }))
    .sort((a, b) => a.coverage - b.coverage)
});
dash.calc('flu_sub_low', {
  inputs: ['flu_sub'],
  fn: (sub) => sub.filter((r) => Number(r.target) > 0 && Number(r.coverage) < VX.GOAL_FLU)
    .map((r) => ({ code: r.code, name: r.name, network: r.network, target: Number(r.target), vaccinated: Number(r.vaccinated), coverage: Number(r.coverage), need: Math.max(0, Math.ceil(Number(r.target) * VX.GOAL_FLU / 100 - Number(r.vaccinated))) }))
    .sort((a, b) => a.coverage - b.coverage)
});

// ---- ตัวเลขเดี่ยวและแถบความคืบหน้า ----
const one = (name, id, pick, fmt) => dash.draw(name, (el) => {
  const rows = VX.rows(id);
  const r = rows.length ? pick(rows) : null;
  el.textContent = r === null || r === undefined ? '—' : fmt(r);
});
const all = (rows) => rows.find((r) => r.period === 'ทั้งปี');
const y68 = (k) => (rs) => { const r = rs.find((x) => String(x.year) === '2568'); return r ? Number(r[k]) : null; };
one('lede-mmr2', 'mmr2_total', (rs) => all(rs) && all(rs).coverage, (v) => v.toFixed(1));
one('t-mmr2', 'mmr2_total', (rs) => all(rs) && all(rs).coverage, (v) => v.toFixed(1));
one('lede-low', 'mmr2_total', (rs) => all(rs) && all(rs).below_goal, String);
one('t-low', 'mmr2_total', (rs) => all(rs) && all(rs).below_goal, String);
one('t-districts', 'mmr2_total', (rs) => all(rs) && all(rs).districts, String);
one('t-mmr2-v', 'mmr2_total', (rs) => all(rs) && all(rs).vaccinated, VX.int);
one('t-mmr2-t', 'mmr2_total', (rs) => all(rs) && all(rs).target, VX.int);
one('lede-flu', 'flu_total', (rs) => rs[0].coverage, (v) => v.toFixed(1));
one('t-flu', 'flu_total', (rs) => rs[0].coverage, (v) => v.toFixed(1));
one('t-flu-v', 'flu_total', (rs) => rs[0].vaccinated, VX.int);
one('t-flu-t', 'flu_total', (rs) => rs[0].target, VX.int);
one('t-flu-low', 'flu_total', (rs) => rs[0].below_goal, String);
one('t-opv', 'polio', y68('opv3'), (v) => v.toFixed(1));
one('t-ipv', 'polio', y68('ipv'), (v) => v.toFixed(1));
dash.draw('goal-mmr2', (el) => { el.textContent = VX.GOAL_MMR2; });
dash.draw('goal-flu', (el) => { el.textContent = VX.GOAL_FLU; });
dash.draw('goal-polio', (el) => { el.textContent = VX.GOAL_POLIO; });
const meter = (name, id, pick, goal) => dash.draw(name, (el) => {
  const rows = VX.rows(id); const v = rows.length ? pick(rows) : null;
  el.style.width = v === null || v === undefined ? '0%' : Math.min(100, v) + '%';
  el.classList.toggle('low', v !== null && v !== undefined && v < goal);
});
meter('m-mmr2', 'mmr2_total', (rs) => all(rs) && all(rs).coverage, VX.GOAL_MMR2);
meter('m-flu', 'flu_total', (rs) => rs[0].coverage, VX.GOAL_FLU);
meter('m-opv', 'polio', y68('opv3'), VX.GOAL_POLIO);
const grp = (code, k) => (rs) => { const r = rs.find((x) => x.code === code); return r && r[k] !== '' && r[k] != null ? Number(r[k]) : null; };
one('ins-g9', 'flu_groups', grp('G9', 'vaccinated'), VX.int);
one('ins-g9p', 'flu_groups', grp('G9', 'share'), (v) => v.toFixed(1));
one('ins-g1', 'flu_groups', grp('G1', 'vaccinated'), VX.int);
one('ins-g2', 'flu_groups', grp('G2', 'vaccinated'), VX.int);
one('ins-v12', 'flu_groups', grp('V12', 'vaccinated'), VX.int);
one('ins-v12t', 'flu_groups', grp('V12', 'target'), VX.int);
one('fu-sub-n', 'flu_sub_low', (rs) => rs.length, String);

// ---- แผนภูมิ ----
VX.axisStyle = (g) => g.attr('font-size', null).attr('font-family', null)
  .call((s) => s.selectAll('text').attr('fill', 'var(--color-fg-muted)'))
  .call((s) => s.selectAll('line,path').attr('stroke', 'var(--cds-chart-axis)'));
VX.measure = (svg, data) => {
  const tmp = svg.append('g').attr('font-size', 12); let lw = 0;
  data.forEach((d) => { lw = Math.max(lw, tmp.append('text').text(d.name).node().getComputedTextLength()); });
  tmp.remove(); return lw;
};

VX.hbar = (el, data, opt) => {
  const W = el.clientWidth || 600, rowH = 22, m = { t: 8, r: 52, b: 26, l: 8 };
  const H = m.t + m.b + data.length * rowH;
  el.style.minHeight = H + 'px';
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opt.label);
  el.replaceChildren(svg.node());
  m.l = Math.min(VX.measure(svg, data) + 12, W * 0.45);
  const x = d3.scaleLinear([opt.min, 100], [m.l, W - m.r]);
  const y = d3.scaleBand(data.map((d) => d.name), [m.t, H - m.b]).padding(0.25);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.max(2, Math.floor((W - m.l) / 70))).tickFormat((v) => v + '%')).call(VX.axisStyle);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', m.l - 6).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--color-fg)').text((d) => d.name);
  const bars = svg.append('g').selectAll('rect').data(data).join('rect')
    .attr('x', m.l).attr('y', (d) => y(d.name)).attr('height', y.bandwidth()).attr('rx', 3)
    .attr('width', (d) => Math.max(1, x(Math.max(opt.min, d.v)) - m.l))
    .attr('fill', (d) => d.v < opt.goal ? 'var(--cds-chart-status-critical)' : VX.C[0]);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(Math.max(opt.min, d.v)) + 4).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((d) => d.v.toFixed(1));
  svg.append('line').attr('x1', x(opt.goal)).attr('x2', x(opt.goal)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
  const tip = VX.tip(el);
  bars.on('mousemove', (ev, d) => VX.showTip(el, tip, ev, opt.tip(d))).on('mouseleave', () => { tip.hidden = true; });
};

dash.draw('ch-mmr2-mini', (el) => {
  if (VX.fail(el, 'mmr2')) return;
  const data = VX.rows('mmr2').map((r) => ({ name: r.district, v: Number(r.coverage), r })).sort((a, b) => a.v - b.v);
  VX.hbar(el, data, { min: 80, goal: VX.GOAL_MMR2, label: 'MMR2 รายอำเภอ', tip: (d) => [d.name, 'ร้อยละ ' + d.v.toFixed(2), 'ได้รับ ' + VX.int(d.r.vaccinated) + ' / ' + VX.int(d.r.target) + ' คน'] });
});

dash.draw('ch-flu', (el) => {
  if (VX.fail(el, 'flu')) return;
  const data = VX.rows('flu').map((r) => ({ name: r.unit, v: Math.min(100, Number(r.coverage)), raw: Number(r.coverage), r })).sort((a, b) => a.v - b.v);
  VX.hbar(el, data, { min: 0, goal: VX.GOAL_FLU, label: 'ไข้หวัดใหญ่รายหน่วยบริการ', tip: (d) => [d.name, 'ร้อยละ ' + d.raw.toFixed(2), 'ฉีด ' + VX.int(d.r.vaccinated) + ' / ' + VX.int(d.r.target) + ' โดส'] });
});

dash.draw('ch-flu-groups', (el) => {
  if (VX.fail(el, 'flu_groups')) return;
  const data = VX.rows('flu_groups').filter((r) => r.item === 'V11' && Number(r.vaccinated) > 0)
    .map((r) => ({ name: r.group, v: Number(r.vaccinated), p: Number(r.share), code: r.code })).sort((a, b) => b.v - a.v);
  const W = el.clientWidth || 500, rowH = 26, m = { t: 4, r: 96, b: 4, l: 8 };
  const H = m.t + m.b + data.length * rowH;
  el.style.minHeight = H + 'px';
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'ไข้หวัดใหญ่แยกกลุ่มเสี่ยง');
  el.replaceChildren(svg.node());
  m.l = Math.min(VX.measure(svg, data) + 12, W * (VX.small() ? 0.5 : 0.45));
  const x = d3.scaleLinear([0, d3.max(data, (d) => d.v)], [m.l, W - m.r]);
  const y = d3.scaleBand(data.map((d) => d.name), [m.t, H - m.b]).padding(0.28);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', m.l - 6).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--color-fg)').text((d) => d.name);
  const bars = svg.append('g').selectAll('rect').data(data).join('rect').attr('x', m.l).attr('y', (d) => y(d.name)).attr('height', y.bandwidth()).attr('rx', 3)
    .attr('width', (d) => Math.max(2, x(d.v) - m.l)).attr('fill', (d) => d.code === 'G9' ? '#F2B544' : (d.code === 'G1' || d.code === 'G2') ? VX.C[1] : VX.C[0]);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(d.v) + 4).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((d) => VX.int(d.v) + ' (' + d.p.toFixed(1) + '%)');
  const tip = VX.tip(el);
  bars.on('mousemove', (ev, d) => VX.showTip(el, tip, ev, [d.code + ' ' + d.name, VX.int(d.v) + ' โดส', 'ร้อยละ ' + d.p.toFixed(2) + ' ของทั้งหมด'])).on('mouseleave', () => { tip.hidden = true; });
});

dash.draw('ch-mmr2-q', (el) => {
  if (VX.fail(el, 'mmr2_total')) return;
  const data = VX.rows('mmr2_total').filter((r) => r.period !== 'ทั้งปี');
  const W = el.clientWidth || 500, H = 220, m = { t: 16, r: 12, b: 28, l: 40 };
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'MMR2 รายไตรมาส');
  const x = d3.scaleBand(data.map((d) => d.period), [m.l, W - m.r]).padding(0.35);
  const y = d3.scaleLinear([90, 100], [H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => v + '%')).call(VX.axisStyle);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x)).call(VX.axisStyle);
  const bw = Math.min(32, x.bandwidth()), off = (x.bandwidth() - bw) / 2;
  const bars = svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (d) => x(d.period) + off).attr('width', bw)
    .attr('y', (d) => y(Math.max(90, d.coverage))).attr('height', (d) => H - m.b - y(Math.max(90, d.coverage))).attr('rx', 3)
    .attr('fill', (d) => d.coverage < VX.GOAL_MMR2 ? 'var(--cds-chart-status-critical)' : VX.C[0]);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(d.period) + x.bandwidth() / 2).attr('y', (d) => y(d.coverage) - 4)
    .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg)').text((d) => d.coverage.toFixed(1));
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(VX.GOAL_MMR2)).attr('y2', y(VX.GOAL_MMR2)).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
  el.replaceChildren(svg.node());
  const tip = VX.tip(el);
  bars.on('mousemove', (ev, d) => VX.showTip(el, tip, ev, [d.period, 'ร้อยละ ' + d.coverage.toFixed(1), 'ได้รับ ' + VX.int(d.vaccinated) + ' / ' + VX.int(d.target) + ' คน'])).on('mouseleave', () => { tip.hidden = true; });
});

dash.draw('ch-polio', (el) => {
  if (VX.fail(el, 'polio')) return;
  const data = VX.rows('polio').map((r) => ({ year: Number(r.year), opv3: Number(r.opv3), ipv: Number(r.ipv) }));
  const W = el.clientWidth || 500, H = 220, m = { t: 16, r: 72, b: 28, l: 40 };
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'แนวโน้ม OPV3 และ IPV');
  const x = d3.scaleLinear(d3.extent(data, (d) => d.year), [m.l, W - m.r]);
  const y = d3.scaleLinear([80, 95], [H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat((v) => v + '%')).call(VX.axisStyle);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format('d'))).call(VX.axisStyle);
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(VX.GOAL_POLIO)).attr('y2', y(VX.GOAL_POLIO)).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '4 3');
  el.replaceChildren(svg.node());
  const tip = VX.tip(el);
  [{ k: 'opv3', name: 'OPV3', c: VX.C[0] }, { k: 'ipv', name: 'IPV', c: VX.C[1] }].forEach((s) => {
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
      .attr('d', d3.line((d) => x(d.year), (d) => y(d[s.k])));
    svg.append('g').selectAll('circle').data(data).join('circle').attr('cx', (d) => x(d.year)).attr('cy', (d) => y(d[s.k])).attr('r', 4).attr('fill', s.c)
      .on('mousemove', (ev, d) => VX.showTip(el, tip, ev, ['ปี ' + d.year, 'OPV3 ' + d.opv3.toFixed(1) + '%', 'IPV ' + d.ipv.toFixed(1) + '%'])).on('mouseleave', () => { tip.hidden = true; });
    const last = data[data.length - 1];
    svg.append('text').attr('x', x(last.year) + 8).attr('y', y(last[s.k])).attr('dy', s.k === 'opv3' ? '0.9em' : '-0.2em').attr('font-size', 11).attr('fill', s.c).text(s.name + ' ' + last[s.k].toFixed(1));
  });
});

dash.draw('ch-vpd', (el) => {
  if (VX.fail(el, 'vpd')) return;
  const data = VX.rows('vpd').map((r) => ({ name: r.disease, v: Number(r.cases), r })).filter((d) => d.v > 0).sort((a, b) => b.v - a.v);
  const W = el.clientWidth || 500, rowH = 28, m = { t: 6, r: 70, b: 8, l: 8 };
  const H = m.t + m.b + data.length * rowH;
  el.style.minHeight = H + 'px';
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'จำนวนผู้ป่วยสะสม');
  el.replaceChildren(svg.node());
  m.l = Math.min(VX.measure(svg, data) + 12, W * 0.4);
  const x = d3.scaleLog([10, d3.max(data, (d) => d.v) * 1.2], [m.l, W - m.r]);
  const y = d3.scaleBand(data.map((d) => d.name), [m.t, H - m.b]).padding(0.3);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', m.l - 6).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 12).attr('fill', 'var(--color-fg)').text((d) => d.name);
  const bars = svg.append('g').selectAll('rect').data(data).join('rect').attr('x', m.l).attr('y', (d) => y(d.name)).attr('height', y.bandwidth()).attr('rx', 3)
    .attr('width', (d) => Math.max(1, x(Math.max(10, d.v)) - m.l)).attr('fill', VX.C[2]);
  svg.append('g').selectAll('text').data(data).join('text').attr('x', (d) => x(Math.max(10, d.v)) + 4).attr('y', (d) => y(d.name) + y.bandwidth() / 2).attr('dy', '0.35em').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)').text((d) => VX.int(d.v));
  const tip = VX.tip(el);
  bars.on('mousemove', (ev, d) => VX.showTip(el, tip, ev, [d.name, VX.int(d.v) + ' ราย', d.r.period])).on('mouseleave', () => { tip.hidden = true; });
});

// ---- ตาราง ----
const td = (text, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = text; return c; };
dash.draw('tb-mmr2', (el) => {
  if (!VX.ok('mmr2')) { el.replaceChildren(); return; }
  const s = VX.sort.mmr2, q = VX.q.mmr2.trim();
  const rows = VX.rows('mmr2').filter((r) => !q || String(r.district).includes(q)).slice()
    .sort((a, b) => { const x = s.k === 'district' ? String(a[s.k]).localeCompare(String(b[s.k]), 'th') : Number(a[s.k]) - Number(b[s.k]); return x * s.dir; });
  el.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    const cov = Number(r.coverage);
    tr.append(td(r.district), td(VX.int(r.target), 'num'), td(VX.int(r.vaccinated), 'num'), td(cov.toFixed(2), 'num ' + (cov < VX.GOAL_MMR2 ? 'bad' : 'ok')),
      ...[1, 2, 3, 4].map((i) => { const v = Number(r['q' + i + '_coverage']); return td(v.toFixed(2), 'num ' + (v < VX.GOAL_MMR2 ? 'bad' : '')); }));
    return tr;
  }));
});
const gapTable = (name, id, unit) => dash.draw(name, (el) => {
  if (!VX.ok(id)) { el.replaceChildren(); return; }
  el.replaceChildren(...VX.rows(id).map((r) => { const tr = document.createElement('tr'); tr.append(td(r[unit]), td(Number(r.coverage).toFixed(2), 'num bad'), td(VX.int(r.need), 'num')); return tr; }));
});
gapTable('tb-mmr2-gap', 'mmr2_gap', 'district');
gapTable('tb-flu-gap', 'flu_gap', 'unit');
dash.draw('sub-net', (sel) => {
  const nets = [...new Set(VX.rows('flu_sub_low').map((r) => r.network))].sort((a, b) => a.localeCompare(b, 'th'));
  sel.replaceChildren(new Option('ทุกเครือข่าย', ''), ...nets.map((n) => new Option(n, n)));
  sel.value = VX.q.net;
});
dash.draw('tb-flu-sub', (el) => {
  if (!VX.ok('flu_sub_low')) { el.replaceChildren(); return; }
  const q = VX.q.sub.trim(), n = VX.q.net;
  const rows = VX.rows('flu_sub_low').filter((r) => (!n || r.network === n) && (!q || String(r.name).includes(q)));
  el.replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(td(r.name), td(r.network), td(VX.int(r.target), 'num'), td(VX.int(r.vaccinated), 'num'), td(r.coverage.toFixed(1), 'num bad'), td(VX.int(r.need), 'num')); return tr; }));
});
dash.draw('tb-refs', (el) => {
  if (!VX.ok('refs')) { el.replaceChildren(); return; }
  const q = VX.q.ref.trim().toLowerCase(), k = VX.q.kind;
  const rows = VX.rows('refs').filter((r) => (!k || r.kind === k) && (!q || (r.citation + ' ' + r.topics).toLowerCase().includes(q)));
  el.replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); tr.append(td(r.kind), td(r.citation), td(r.topics), td(r.ref_id)); return tr; }));
});
dash.draw('ref-kind', (sel) => {
  const kinds = [...new Set(VX.rows('refs').map((r) => r.kind))];
  sel.replaceChildren(new Option('ทุกประเภท', ''), ...kinds.map((k) => new Option(k, k)));
  sel.value = VX.q.kind;
});

// ---- การ์ด ----
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
dash.draw('vpd-cards', (el) => {
  if (VX.fail(el, 'vpd')) return;
  el.replaceChildren(...VX.rows('vpd').map((r) => {
    const c = mk('div', 'card vpd');
    const deaths = r.deaths === '' || r.deaths == null ? 'ไม่มีรายงานผู้เสียชีวิต' : 'เสียชีวิต ' + VX.int(Number(r.deaths)) + ' ราย';
    c.append(mk('h3', '', r.disease), mk('span', 'big', VX.int(Number(r.cases)) + ' ราย'), mk('p', 'muted', deaths + ' · ' + r.period), mk('p', '', r.note || ''), mk('p', 'muted', 'ที่มา: ' + r.source));
    return c;
  }));
});
const SEC_PARENT = [['summary', 'รู้จักโรค'], ['vaccine', 'กำหนดการให้วัคซีน'], ['who', 'กลุ่มเป้าหมาย / สิทธิ'], ['side', 'อาการหลังฉีดและการดูแล'], ['prevent', 'การป้องกัน']];
const SEC_STAFF = [['situation', 'สถานการณ์'], ['cause', 'เชื้อก่อโรค'], ['spread', 'การติดต่อ'], ['symptoms', 'อาการ'], ['staff', 'ข้อมูลสำหรับเจ้าหน้าที่'], ['evidence', 'หลักฐานวิชาการ']];
dash.draw('kb-cards', (el) => {
  if (VX.fail(el, 'kb')) return;
  const q = VX.q.kb.trim().toLowerCase();
  const rows = VX.rows('kb').filter((e) => (!VX.q.grp || e.group === VX.q.grp) && (!q || Object.values(e).join(' ').toLowerCase().includes(q)));
  if (!rows.length) { el.replaceChildren(mk('p', 'muted', 'ไม่พบหัวข้อที่ตรงกับคำค้น')); return; }
  el.replaceChildren(...rows.map((e) => {
    const c = mk('article', 'card kb'); c.style.setProperty('--kb-c', e.color); c.id = 'kb-' + e.key;
    c.append(mk('div', 'grp', e.group), mk('h3', '', e.icon + ' ' + e.name));
    const secs = VX.q.aud === 'staff' ? SEC_PARENT.slice(1, 3).concat(SEC_STAFF) : SEC_PARENT;
    secs.forEach(([k, label]) => { if (!e[k]) return; const s = mk('div', 'sec'); s.append(mk('b', '', label), mk('p', '', e[k])); c.append(s); });
    if (VX.q.aud === 'parent') {
      const d = mk('details'); d.append(mk('summary', '', 'อ่านเพิ่ม: สถานการณ์และหลักฐานวิชาการ'));
      [['situation', 'สถานการณ์'], ['evidence', 'หลักฐานวิชาการ']].forEach(([k, label]) => { if (!e[k]) return; const s = mk('div', 'sec'); s.append(mk('b', '', label), mk('p', '', e[k])); d.append(s); });
      c.append(d);
    }
    c.append(mk('p', 'refs', 'อ้างอิง: ' + String(e.refs || '').split(' ').join(', ')));
    return c;
  }));
});
dash.draw('sched', (el) => {
  if (VX.fail(el, 'schedule')) return;
  el.replaceChildren(...VX.rows('schedule').map((r) => {
    const row = mk('div', 'tl-row');
    const right = mk('div'); right.append(mk('div', '', r.vaccines)); if (r.note) right.append(mk('div', 'muted', r.note));
    row.append(mk('div', 'age', r.age), right);
    return row;
  }));
});
dash.draw('promo-cards', (el) => {
  if (VX.fail(el, 'kb')) return;
  const keys = ['pcv', 'flu', 'hpv', 'measles', 'pertussis', 'dengue'];
  const by = Object.fromEntries(VX.rows('kb').map((e) => [e.key, e]));
  el.replaceChildren(...keys.filter((k) => by[k]).map((k, i) => {
    const e = by[k]; const c = mk('div', 'promo' + (i % 2 ? ' orange' : ''));
    c.append(mk('div', 'head', e.icon + ' ' + e.name), mk('div', 'body', e.summary), mk('div', 'who', '💉 ' + e.vaccine), mk('div', 'who', '👥 ' + e.who));
    return c;
  }));
});

// ---- แท็บ ตัวกรอง และการค้นหา ----
const tabs = document.querySelectorAll('.vx .tab');
const CHARTS = ['ch-mmr2-mini', 'ch-vpd', 'ch-mmr2-q', 'ch-polio', 'ch-flu', 'ch-flu-groups'];
const redraw = () => CHARTS.forEach((n) => dash.draw(n));
const show = (id) => {
  document.querySelectorAll('.vx section.page').forEach((s) => { s.hidden = s.id !== id; });
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
};
tabs.forEach((t) => t.addEventListener('click', () => {
  show(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab);
  requestAnimationFrame(redraw); t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}));
let rzT = null, rzW = window.innerWidth;
window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - rzW) < 40) return; clearTimeout(rzT); rzT = setTimeout(() => { rzW = window.innerWidth; redraw(); }, 250); });
const start = location.hash.slice(1);
if (start && document.getElementById(start) && document.getElementById(start).classList.contains('page')) show(start);
document.querySelectorAll('.vx [data-sort]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.sort, s = VX.sort.mmr2;
  if (s.k === k) s.dir = -s.dir; else { s.k = k; s.dir = k === 'district' ? 1 : -1; }
  document.querySelectorAll('.vx [data-sort]').forEach((x) => x.closest('th').setAttribute('aria-sort', x.dataset.sort === k ? (s.dir > 0 ? 'ascending' : 'descending') : 'none'));
  dash.draw('tb-mmr2');
}));
const onInput = (cls, key, target) => document.querySelectorAll('.vx .' + cls).forEach((i) => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { VX.q[key] = i.value; dash.draw(target); }));
onInput('lx-mmr2-q', 'mmr2', 'tb-mmr2');
onInput('lx-kb-q', 'kb', 'kb-cards');
onInput('lx-ref-q', 'ref', 'tb-refs');
onInput('lx-ref-kind', 'kind', 'tb-refs');
onInput('lx-sub-q', 'sub', 'tb-flu-sub');
onInput('lx-sub-net', 'net', 'tb-flu-sub');
const pills = (cls, key, attr) => document.querySelectorAll('.vx .' + cls).forEach((b) => b.addEventListener('click', () => {
  VX.q[key] = b.dataset[attr];
  document.querySelectorAll('.vx .' + cls).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  dash.draw('kb-cards');
}));
pills('lx-aud', 'aud', 'aud');
pills('lx-grp', 'grp', 'grp');

dash.load();
