(function () {
  const data = loadData();
  const geocodeCache = new Map();
  let routeInfo = null; // { distanceKm, durationMin, patientDisplay, centerDisplay }

  // Patient characteristics: each one matches procedure notes via regex.
  // When the user ticks one, conditional procedures with matching notes auto-apply.
  const PATIENT_TRAITS = [
    { id: 'wocbp', label: 'Mujer en edad fértil (WOCBP)', match: /WOCBP|edad f[ée]rtil/i }
  ];

  // Per-patient decisions for conditional procedures: { visitId: { procId: true|false } }
  // Reset on each Calcular click.
  let patientDecisions = {};
  let lastCalcContext = null; // saved so we can re-render on decision change

  const centerSelect = document.getElementById('centerSelect');
  const centerHint = document.getElementById('centerHint');
  const patientSelect = document.getElementById('patientSelect');
  const patientHint = document.getElementById('patientHint');
  const patientAddressEl = document.getElementById('patientAddress');
  const anchorDateInput = document.getElementById('anchorDate');
  const anchorVisitSelect = document.getElementById('anchorVisit');
  const calculateBtn = document.getElementById('calculateBtn');
  const printBtn = document.getElementById('printBtn');
  const resultsContainer = document.getElementById('resultsContainer');

  anchorDateInput.value = formatDateIso(new Date());

  function populateCenters() {
    centerSelect.innerHTML = '';
    if (data.centers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— No hay centros definidos —';
      centerSelect.appendChild(opt);
      centerSelect.disabled = true;
      centerHint.textContent = 'Ve a "Protocolos por centro" para crear uno.';
      calculateBtn.disabled = true;
      return;
    }
    centerSelect.disabled = false;
    calculateBtn.disabled = false;
    data.centers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      centerSelect.appendChild(opt);
    });
    // Pre-select center from session if available
    const session = window.MsSession && window.MsSession.get();
    if (session && session.centerId && data.centers.some(c => c.id === session.centerId)) {
      centerSelect.value = session.centerId;
    }
    updateCenterHint();
  }

  function updateCenterHint() {
    const center = data.centers.find(c => c.id === centerSelect.value);
    centerHint.textContent = center ? center.address : '';
  }

  function populatePatients() {
    const centerId = centerSelect.value;
    const patients = getPatientsForCenter(centerId);
    patientSelect.innerHTML = '';
    if (patients.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— No hay pacientes asignados a este centro —';
      patientSelect.appendChild(opt);
      patientHint.textContent = '';
      patientAddressEl.value = '';
      return;
    }
    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const meta = [];
      if (p.sex && p.sex !== '—') meta.push(p.sex);
      if (p.birthYear) meta.push((new Date().getFullYear() - p.birthYear) + ' años');
      opt.textContent = p.name
        ? `${p.id} — ${p.name}${meta.length ? ' (' + meta.join(', ') + ')' : ''}`
        : p.id;
      patientSelect.appendChild(opt);
    });
    applySelectedPatient();
  }

  function applySelectedPatient() {
    const patient = findPatient(patientSelect.value);
    if (!patient) {
      patientHint.textContent = '';
      return;
    }
    const parts = [];
    if (patient.name) parts.push(patient.name);
    if (patient.sex && patient.sex !== '—') {
      parts.push(patient.sex === 'F' ? 'Mujer' : 'Hombre');
    }
    if (patient.birthYear) {
      parts.push((new Date().getFullYear() - patient.birthYear) + ' años');
    }
    if (patient.wocbp) parts.push('WOCBP');
    patientHint.textContent = parts.join(' · ');
    patientAddressEl.value = patient.address || '';
    // If a calc was already showing, re-render to reflect new traits
    if (lastCalcContext) renderResults();
  }

  centerSelect.addEventListener('change', () => {
    updateCenterHint();
    populatePatients();
  });

  patientSelect.addEventListener('change', applySelectedPatient);

  // ---- New patient modal ----
  const modal = document.getElementById('newPatientModal');
  const newPatientBtn = document.getElementById('newPatientBtn');
  const closeBtn = document.getElementById('closePatientModal');
  const cancelBtn = document.getElementById('cancelPatientModal');
  const newPatientForm = document.getElementById('newPatientForm');

  function openPatientModal() {
    newPatientForm.reset();
    // Suggest next free P-XXX id
    const all = loadPatients().map(p => p.id);
    let n = all.length + 1;
    let suggestion = 'P-' + String(n).padStart(3, '0');
    while (all.includes(suggestion)) {
      n++;
      suggestion = 'P-' + String(n).padStart(3, '0');
    }
    document.getElementById('newPatientId').value = suggestion;
    modal.hidden = false;
    setTimeout(() => document.getElementById('newPatientName').focus(), 50);
  }

  function closePatientModal() {
    modal.hidden = true;
  }

  if (newPatientBtn) newPatientBtn.addEventListener('click', openPatientModal);
  if (closeBtn) closeBtn.addEventListener('click', closePatientModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePatientModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePatientModal();
  });

  newPatientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('newPatientId').value.trim();
    const name = document.getElementById('newPatientName').value.trim();
    const address = document.getElementById('newPatientAddress').value.trim();
    const wocbp = document.getElementById('newPatientWocbp').checked;
    const centerId = centerSelect.value;

    if (!id || !name || !address) return;
    if (findPatient(id)) {
      alert(`Ya existe un paciente con ID "${id}". Elige otro.`);
      return;
    }
    addPatient({
      id, name, address, wocbp,
      centerId,
      sex: wocbp ? 'F' : '—',
      birthYear: null
    });
    closePatientModal();
    populatePatients();
    patientSelect.value = id;
    applySelectedPatient();
  });

  async function geocode(address) {
    if (!address || !address.trim()) throw new Error('Dirección vacía');
    const key = address.trim().toLowerCase();
    if (geocodeCache.has(key)) {
      console.log('[Geocode] Usando caché para:', address);
      return geocodeCache.get(key);
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    console.log('[Geocode] Consultando Nominatim:', url);
    let res;
    try {
      res = await fetch(url, { headers: { 'Accept-Language': 'es,ca,en' } });
    } catch (e) {
      console.error('[Geocode] Error de red:', e);
      throw new Error('No se ha podido contactar con Nominatim (¿sin conexión?). Detalle: ' + e.message);
    }
    if (!res.ok) throw new Error('Error en la geocodificación (HTTP ' + res.status + ')');
    const json = await res.json();
    console.log('[Geocode] Respuesta para "' + address + '":', json);
    if (!json.length) throw new Error('Dirección no encontrada: "' + address + '". Prueba a simplificarla (calle, ciudad).');
    const result = {
      lat: parseFloat(json[0].lat),
      lon: parseFloat(json[0].lon),
      display: json[0].display_name
    };
    geocodeCache.set(key, result);
    return result;
  }

  async function getDrivingRoute(from, to) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    console.log('[Route] Consultando OSRM:', url);
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      console.error('[Route] Error de red:', e);
      throw new Error('No se ha podido contactar con OSRM. Detalle: ' + e.message);
    }
    if (!res.ok) throw new Error('Error en la ruta (HTTP ' + res.status + ')');
    const json = await res.json();
    console.log('[Route] Respuesta:', json);
    if (!json.routes || !json.routes.length) throw new Error('No se ha encontrado ruta entre las direcciones');
    return {
      distanceKm: json.routes[0].distance / 1000,
      durationMin: Math.round(json.routes[0].duration / 60)
    };
  }

  async function computeRoute(patientAddress, center) {
    // Geocode patient; use center coordinates directly if available
    const patientLoc = await geocode(patientAddress);
    let centerLoc;
    if (center.coords && center.coords.lat != null && center.coords.lon != null) {
      centerLoc = {
        lat: parseFloat(center.coords.lat),
        lon: parseFloat(center.coords.lon),
        display: center.address || center.name
      };
      console.log('[Route] Usando coordenadas fijas del centro:', centerLoc);
    } else {
      centerLoc = await geocode(center.address);
    }
    const route = await getDrivingRoute(patientLoc, centerLoc);
    return {
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      patientDisplay: patientLoc.display,
      centerDisplay: centerLoc.display
    };
  }

  async function calculate() {
    const center = data.centers.find(c => c.id === centerSelect.value);
    if (!center) return;

    // Reset decisions on fresh calc (new patient context)
    patientDecisions = {};

    const anchorVisitId = anchorVisitSelect.value;
    const anchorVisit = data.visits.find(v => v.id === anchorVisitId);
    if (!anchorVisit) return;

    const anchorDateStr = anchorDateInput.value;
    if (!anchorDateStr) {
      alert("Selecciona una fecha de anclaje");
      return;
    }
    const anchorDate = new Date(anchorDateStr + 'T00:00:00');
    const day0 = addDays(anchorDate, -anchorVisit.day);

    const patient = findPatient(patientSelect.value);
    const patientId = patient ? patient.id : (patientSelect.value || '—');
    const patientName = patient ? patient.name : '';
    const patientAddress = patientAddressEl.value.trim();


    // Compute taxi travel time (async)
    let travelOneWayMin = 0;
    routeInfo = null;
    let routeError = null;

    if (patientAddress && (center.coords || center.address)) {
      try {
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Calculando ruta…';
        resultsContainer.innerHTML = '<div class="card empty">Geocodificando dirección del paciente y calculando ruta en taxi…</div>';
        routeInfo = await computeRoute(patientAddress, center);
        travelOneWayMin = routeInfo.durationMin;
      } catch (e) {
        routeError = e.message || 'Error desconocido calculando la ruta';
      } finally {
        calculateBtn.disabled = false;
        calculateBtn.textContent = 'Calcular';
      }
    } else if (!patientAddress) {
      routeError = "No se ha introducido la dirección del paciente — tiempo de desplazamiento = 0.";
    }

    const rows = data.visits.map(visit => {
      const targetDate = addDays(day0, visit.day);
      const windowStart = addDays(targetDate, -visit.windowBefore);
      const windowEnd = addDays(targetDate, visit.windowAfter);

      const entries = getVisitEntries(center, visit.id);
      const items = entries.map(e => {
        const proc = data.procedures.find(p => p.id === e.id);
        if (!proc) return null;
        return {
          procedure: proc,
          conditional: !!e.conditional,
          note: e.note || '',
          duration: getProcedureDuration(center, proc)
        };
      }).filter(Boolean);

      return { visit, targetDate, windowStart, windowEnd, items };
    });

    const totalTravelMin = travelOneWayMin * 2 * rows.length;
    const firstDate = rows.length ? rows[0].targetDate : null;
    const lastDate = rows.length ? rows[rows.length - 1].targetDate : null;

    lastCalcContext = {
      center, patientId, patientName, patientAddress,
      routeInfo, routeError, travelOneWayMin,
      rows, totalTravelMin, firstDate, lastDate
    };
    renderResults();
  }

  function readCurrentTraits() {
    // Traits now come directly from the selected patient profile
    const patient = findPatient(patientSelect.value);
    return {
      wocbp: !!(patient && patient.wocbp)
    };
  }

  // For a procedure note, find a matching trait. Returns:
  //   'wocbp' (or other trait id) if a trait matches
  //   null otherwise
  function matchingTrait(note) {
    if (!note) return null;
    for (const t of PATIENT_TRAITS) {
      if (t.match.test(note)) return t;
    }
    return null;
  }

  // Get the effective decision for a conditional procedure:
  //   true   = applies (counts)
  //   false  = does not apply (excluded)
  //   null   = pending decision
  // Priority: user click in calculator > trait auto-decision > pending
  function getDecision(visitId, item) {
    if (!item.conditional) return true;
    const userVal = patientDecisions[visitId] && patientDecisions[visitId][item.procedure.id];
    if (userVal === true || userVal === false) return userVal;
    const trait = matchingTrait(item.note);
    if (trait) {
      const traits = readCurrentTraits();
      return traits[trait.id] === true;
    }
    return null;
  }

  function setDecision(visitId, procId, value) {
    if (!patientDecisions[visitId]) patientDecisions[visitId] = {};
    if (value === null) {
      delete patientDecisions[visitId][procId];
    } else {
      patientDecisions[visitId][procId] = value;
    }
    renderResults();
  }

  function renderResults() {
    if (!lastCalcContext) return;
    const r = lastCalcContext;

    // Per-row durations using current decisions
    const rowSummaries = r.rows.map(row => {
      let definite = 0, pending = 0, pendingCount = 0;
      row.items.forEach(it => {
        const dec = getDecision(row.visit.id, it);
        if (dec === true) definite += it.duration;
        else if (dec === null) { pending += it.duration; pendingCount++; }
      });
      return { definite, pending, pendingCount };
    });

    const totalDefinite = rowSummaries.reduce((s, x) => s + x.definite, 0);
    const totalPending = rowSummaries.reduce((s, x) => s + x.pending, 0);
    const totalPendingCount = rowSummaries.reduce((s, x) => s + x.pendingCount, 0);
    const totalLabel = totalPending > 0
      ? `${formatDuration(totalDefinite)} – ${formatDuration(totalDefinite + totalPending)}`
      : formatDuration(totalDefinite);

    const routeBox = renderRouteBox(r);

    const pendingNotice = totalPendingCount > 0
      ? `<div class="alert warning" style="margin-bottom: 16px;">
           ⚠ Quedan <strong>${totalPendingCount}</strong> procedimientos por confirmar. Pulsa <strong>Aplica</strong> o <strong>No aplica</strong> en cada uno para refinar la duración.
         </div>`
      : '';

    const html = `
      <div class="results-actions no-print">
        <button class="primary" id="patientSummaryBtn">📄 Resumen para paciente (PDF)</button>
      </div>
      <div class="card">
        <div class="toolbar">
          <div>
            <h2 style="margin-bottom: 4px;">Resumen del paciente</h2>
            <div style="color: var(--text-soft); font-size: 13px;">
              <strong>${escapeHtml(r.patientId)}${r.patientName ? ' — ' + escapeHtml(r.patientName) : ''}</strong>
              · ${escapeHtml(r.center.name)}
            </div>
          </div>
        </div>

        <div class="results-summary">
          <div class="stat">
            <div class="label">Visitas totales</div>
            <div class="value">${r.rows.length}</div>
          </div>
          <div class="stat">
            <div class="label">Primera visita</div>
            <div class="value" style="font-size: 16px;">${r.firstDate ? formatDate(r.firstDate) : '—'}</div>
            <div class="sub">${r.firstDate ? r.rows[0].visit.name : ''}</div>
          </div>
          <div class="stat">
            <div class="label">Última visita</div>
            <div class="value" style="font-size: 16px;">${r.lastDate ? formatDate(r.lastDate) : '—'}</div>
            <div class="sub">${r.lastDate ? r.rows[r.rows.length-1].visit.name : ''}</div>
          </div>
          <div class="stat">
            <div class="label">Tiempo total en el centro</div>
            <div class="value" style="font-size: 18px;">${totalLabel}</div>
            <div class="sub">${r.totalTravelMin > 0 ? '+ ' + formatDuration(r.totalTravelMin) + ' en taxi (total)' : ''}</div>
          </div>
        </div>

        ${routeBox}
      </div>

      ${pendingNotice}

      <div class="card">
        <h2>Schedule of Activities</h2>
        <div class="visit-cards">
          ${r.rows.map((row, i) => renderVisitCard(row, i, r.rows.length, r.travelOneWayMin, rowSummaries[i])).join('')}
        </div>
      </div>
    `;
    resultsContainer.innerHTML = html;

    // Wire up Aplica/No aplica buttons in result table
    resultsContainer.querySelectorAll('[data-action="apply"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const visitId = btn.dataset.visit;
        const procId = btn.dataset.proc;
        const value = btn.dataset.value === 'true';
        // Toggle off if same value clicked again (back to pending)
        const current = patientDecisions[visitId] && patientDecisions[visitId][procId];
        setDecision(visitId, procId, current === value ? null : value);
      });
    });

    const summaryBtn = document.getElementById('patientSummaryBtn');
    if (summaryBtn) {
      summaryBtn.addEventListener('click', openPatientSummary);
    }
  }

  function openPatientSummary() {
    if (!lastCalcContext) return;
    const r = lastCalcContext;
    const travelRoundTrip = r.travelOneWayMin * 2;

    // Compute per-visit hospital duration based on current decisions
    let totalHospitalMin = 0;
    let totalHospitalMaxMin = 0;
    const visitDurations = r.rows.map(row => {
      let definite = 0, pending = 0;
      row.items.forEach(it => {
        const dec = getDecision(row.visit.id, it);
        if (dec === true) definite += it.duration;
        else if (dec === null) pending += it.duration;
      });
      totalHospitalMin += definite;
      totalHospitalMaxMin += definite + pending;
      return { hospital: definite, hospitalMax: definite + pending };
    });

    const totalTaxiMin = travelRoundTrip * r.rows.length;
    const totalAllMin = totalHospitalMin + totalTaxiMin;
    const totalAllMaxMin = totalHospitalMaxMin + totalTaxiMin;
    const totalLabel = totalHospitalMaxMin > totalHospitalMin
      ? `${formatDuration(totalAllMin)} – ${formatDuration(totalAllMaxMin)}`
      : formatDuration(totalAllMin);

    const visitsHtml = r.rows.map((row, i) => {
      const windowText = row.visit.windowBefore === 0 && row.visit.windowAfter === 0
        ? 'Fecha fija'
        : `${formatDate(row.windowStart)} → ${formatDate(row.windowEnd)}`;
      const weekday = row.targetDate.toLocaleDateString('es-ES', { weekday: 'long' });
      const vd = visitDurations[i];
      const visitTotalMin = vd.hospital + travelRoundTrip;
      const visitTotalMax = vd.hospitalMax + travelRoundTrip;
      const totalCell = vd.hospitalMax > vd.hospital
        ? `<strong>${formatDuration(visitTotalMin)}</strong> <span class="range">– ${formatDuration(visitTotalMax)}</span>`
        : `<strong>${formatDuration(visitTotalMin)}</strong>`;
      const hospCell = vd.hospitalMax > vd.hospital
        ? `${formatDuration(vd.hospital)} – ${formatDuration(vd.hospitalMax)}`
        : formatDuration(vd.hospital);
      return `
        <tr>
          <td class="visit-num">${i + 1}</td>
          <td class="visit-name">${escapeHtml(row.visit.name)}</td>
          <td class="visit-date">
            <div class="date-main">${formatDate(row.targetDate)}</div>
            <div class="date-weekday">${weekday}</div>
          </td>
          <td class="visit-window">${windowText}</td>
          <td class="visit-time">
            <div class="time-total">${totalCell}</div>
            <div class="time-breakdown">
              <span>🏥 ${hospCell}</span>
              ${travelRoundTrip > 0 ? `<span>🚖 ${formatDuration(travelRoundTrip)}</span>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const taxiBlock = r.routeInfo ? `
      <div class="taxi-info">
        <strong>🚖 Desplazamiento al centro:</strong>
        aproximadamente <strong>${r.routeInfo.durationMin} min</strong> por trayecto
        (${formatDuration(travelRoundTrip)} ida + vuelta · ${r.routeInfo.distanceKm.toFixed(1)} km).
      </div>
    ` : '';

    const totalsBlock = `
      <div class="totals-block">
        <div class="totals-row">
          <span class="totals-label">⏱ Tiempo total estimado en el ensayo</span>
          <span class="totals-value">${totalLabel}</span>
        </div>
        <div class="totals-detail">
          🏥 ${formatDuration(totalHospitalMin)}${totalHospitalMaxMin > totalHospitalMin ? ' – ' + formatDuration(totalHospitalMaxMin) : ''} en el centro
          ${totalTaxiMin > 0 ? `· 🚖 ${formatDuration(totalTaxiMin)} en taxi (${r.rows.length} visitas × ida y vuelta)` : ''}
        </div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen de visitas — ${escapeHtml(r.patientId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1f2937;
      line-height: 1.5;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 6px;
      color: #1e3a8a;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0 0 24px;
    }
    .patient-block {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 14px 18px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .patient-block .row {
      display: flex;
      gap: 8px;
      margin: 2px 0;
      font-size: 13px;
    }
    .patient-block .label {
      font-weight: 600;
      min-width: 100px;
      color: #4b5563;
    }
    .taxi-info {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 13px;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #eff6ff;
      color: #1e40af;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #2563eb;
    }
    td {
      padding: 14px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .visit-num {
      width: 36px;
      font-weight: 700;
      color: #2563eb;
      font-size: 16px;
    }
    .visit-name {
      font-weight: 600;
    }
    .visit-date {
      width: 140px;
    }
    .date-main {
      font-weight: 700;
      font-size: 14px;
      color: #065f46;
      font-variant-numeric: tabular-nums;
    }
    .date-weekday {
      color: #6b7280;
      font-size: 11px;
      text-transform: capitalize;
    }
    .visit-window {
      width: 200px;
      color: #6b7280;
      font-size: 12px;
    }
    .visit-time {
      width: 170px;
      text-align: right;
    }
    .time-total {
      font-size: 14px;
      color: #1e40af;
      font-variant-numeric: tabular-nums;
    }
    .time-total .range {
      color: #6b7280;
      font-weight: 500;
      font-size: 12px;
    }
    .time-breakdown {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .totals-block {
      background: linear-gradient(135deg, #eef2ff, #f0f9ff);
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .totals-label {
      font-size: 13px;
      font-weight: 600;
      color: #4338ca;
    }
    .totals-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a8a;
      font-variant-numeric: tabular-nums;
    }
    .totals-detail {
      font-size: 12px;
      color: #4b5563;
      margin-top: 4px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    .actions {
      position: fixed;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
    }
    .actions button {
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      background: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .actions button.primary {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }
    @media print {
      .actions { display: none; }
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()" class="primary">Imprimir / Guardar PDF</button>
    <button onclick="window.close()">Cerrar</button>
  </div>

  <h1>Calendario de visitas del ensayo</h1>
  <p class="subtitle">Resumen para el paciente</p>

  <div class="patient-block">
    <div class="row"><span class="label">Paciente:</span> <strong>${escapeHtml(r.patientId)}${r.patientName ? ' — ' + escapeHtml(r.patientName) : ''}</strong></div>
    <div class="row"><span class="label">Centro:</span> ${escapeHtml(r.center.name)}</div>
    <div class="row"><span class="label">Dirección:</span> ${escapeHtml(r.center.address || '—')}</div>
    <div class="row"><span class="label">Total visitas:</span> ${r.rows.length}</div>
    <div class="row"><span class="label">Periodo:</span>
      ${r.firstDate ? formatDate(r.firstDate) : '—'} → ${r.lastDate ? formatDate(r.lastDate) : '—'}
    </div>
  </div>

  ${taxiBlock}

  ${totalsBlock}

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Visita</th>
        <th>Fecha prevista</th>
        <th>Margen permitido</th>
        <th style="text-align: right;">Tiempo aproximado</th>
      </tr>
    </thead>
    <tbody>
      ${visitsHtml}
    </tbody>
  </table>

  <div class="footer">
    Documento generado el ${formatDate(new Date())} · MS Trial Visit Calculator
    <br>Las fechas son orientativas. Confirma con el equipo investigador en cada visita.
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      alert('No se ha podido abrir la ventana de resumen. Comprueba que el navegador no bloquea las ventanas emergentes.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function renderRouteBox(r) {
    if (r.routeError) {
      return `
        <div class="route-box route-error">
          <div class="route-icon">⚠</div>
          <div class="route-content">
            <div class="route-title">No se ha podido calcular la ruta</div>
            <div class="route-detail">${escapeHtml(r.routeError)}</div>
            <div class="route-hint">Revisa la dirección o consulta la consola del navegador (F12) para más detalles.</div>
          </div>
        </div>
      `;
    }
    if (!r.routeInfo) return '';
    const ri = r.routeInfo;
    return `
      <div class="route-box route-ok">
        <div class="route-icon">🚖</div>
        <div class="route-content">
          <div class="route-title">Ruta en taxi calculada</div>
          <div class="route-stats">
            <span class="route-stat"><strong>${ri.distanceKm.toFixed(1)} km</strong> distancia</span>
            <span class="route-stat"><strong>${ri.durationMin} min</strong> por trayecto</span>
            <span class="route-stat"><strong>${formatDuration(r.travelOneWayMin * 2)}</strong> ida + vuelta</span>
            <span class="route-stat"><strong>${formatDuration(r.totalTravelMin)}</strong> taxi total (${r.rows.length} visitas)</span>
          </div>
          <div class="route-detail">
            <strong>Origen:</strong> ${escapeHtml(ri.patientDisplay)}<br>
            <strong>Destino:</strong> ${escapeHtml(ri.centerDisplay)}
          </div>
        </div>
      </div>
    `;
  }

  function renderVisitCard(row, idx, total, travelOneWayMin, summary) {
    const applied = [];
    const pending = [];
    row.items.forEach(item => {
      const dec = getDecision(row.visit.id, item);
      if (dec === true) applied.push(item);
      else if (dec === null) pending.push(item);
    });

    const footnotes = [];
    [...applied, ...pending].forEach(item => {
      if (item.note) {
        footnotes.push({ procId: item.procedure.id, name: item.procedure.name, note: item.note, conditional: item.conditional, index: footnotes.length + 1 });
      }
    });
    const findFn = (procId) => footnotes.find(f => f.procId === procId);

    const appliedChips = applied.map(item => {
      const isCond = item.conditional;
      const fn = findFn(item.procedure.id);
      const marker = fn ? `<sup class="fn-marker">${fn.index}</sup>` : '';
      const cls = isCond ? 'cond-applied' : (item.note ? 'has-note' : '');
      const title = item.note ? (isCond ? 'Aplica — ' + item.note : item.note) : '';
      return `<span class="chip ${cls}" title="${escapeHtml(title)}">${escapeHtml(item.procedure.name)}${marker}</span>`;
    }).join('');

    const pendingBlock = pending.length ? `
      <div class="pending-block">
        <div class="pending-title">⚠ Por confirmar (${pending.length})</div>
        <div class="pending-list">
          ${pending.map(item => {
            const fn = findFn(item.procedure.id);
            const marker = fn ? `<sup class="fn-marker">${fn.index}</sup>` : '';
            return `
              <div class="pending-item">
                <span class="pending-name">${escapeHtml(item.procedure.name)}${marker}
                  <span class="pending-dur">${item.duration}'</span>
                </span>
                <div class="pending-actions">
                  <button class="applies-btn aplica" data-action="apply" data-visit="${row.visit.id}" data-proc="${item.procedure.id}" data-value="true">✓ Aplica</button>
                  <button class="applies-btn no-aplica" data-action="apply" data-visit="${row.visit.id}" data-proc="${item.procedure.id}" data-value="false">✕ No aplica</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const fnHtml = footnotes.length
      ? `<div class="footnotes"><ol>${footnotes.map(f => {
          const tag = f.conditional ? '<span class="fn-tag cond">Si procede</span>' : '';
          return `<li>${tag}<strong>${escapeHtml(f.name)}:</strong> ${escapeHtml(f.note)}</li>`;
        }).join('')}</ol></div>`
      : '';

    const hasWindow = !(row.visit.windowBefore === 0 && row.visit.windowAfter === 0);
    const windowText = hasWindow
      ? `${formatDate(row.windowStart)} → ${formatDate(row.windowEnd)} <span style="color:var(--text-soft);">(±${row.visit.windowBefore}/${row.visit.windowAfter} d)</span>`
      : '<span class="badge muted">Sin ventana</span>';

    const durationText = summary.pending > 0
      ? `<strong>${formatDuration(summary.definite)}</strong> <span class="dur-range">– ${formatDuration(summary.definite + summary.pending)}</span>`
      : `<strong>${formatDuration(summary.definite)}</strong>`;

    const procBody = (applied.length + pending.length) === 0
      ? '<div class="empty-procs">Sin procedimientos aplicables</div>'
      : `${appliedChips ? `<div class="applied-chips">${appliedChips}</div>` : ''}${pendingBlock}`;

    return `
      <div class="visit-card">
        <div class="visit-card-header">
          <div class="visit-step">${idx + 1}<span class="step-total">/${total}</span></div>
          <div class="visit-meta">
            <div class="visit-title">${escapeHtml(row.visit.name)}</div>
            <div class="visit-info-line">
              <span class="info-pill info-day">D${row.visit.day}</span>
              <span class="info-pill info-date">📅 ${formatDate(row.targetDate)}</span>
              <span class="info-pill info-window">${windowText}</span>
            </div>
          </div>
          <div class="visit-duration">
            <div class="dur-label">Duración</div>
            <div class="dur-value">${durationText}</div>
            ${travelOneWayMin > 0 ? `<div class="dur-travel">+ ${formatDuration(travelOneWayMin * 2)} taxi</div>` : ''}
          </div>
        </div>
        <div class="visit-card-body">
          ${procBody}
          ${fnHtml}
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  calculateBtn.addEventListener('click', calculate);
  printBtn.addEventListener('click', () => window.print());

  populateCenters();
  populatePatients();
})();
