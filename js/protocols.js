(function () {
  let data = loadData();
  const session = window.MsSession && window.MsSession.get();
  const userCenterId = session && session.centerId;

  // If user has a session, restrict the UI to their center only.
  const singleCenterMode = !!userCenterId;
  let activeCenterId = singleCenterMode ? userCenterId : (data.centers[0] ? data.centers[0].id : null);
  let activeTab = 'visits'; // 'visits' | 'durations' | 'info'

  const layout = document.getElementById('protocolsLayout');
  const centersPanel = document.getElementById('centersPanel');
  const centerList = document.getElementById('centerList');
  const centerEditor = document.getElementById('centerEditor');
  const addCenterBtn = document.getElementById('addCenterBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (singleCenterMode) {
    // Hide the centers list panel and make editor full width
    if (centersPanel) centersPanel.hidden = true;
    if (layout) layout.classList.add('single-center');
  }

  function persist() {
    saveData(data);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function renderCenterList() {
    if (data.centers.length === 0) {
      centerList.innerHTML = '<div class="empty">No hay centros. Añade uno.</div>';
      return;
    }
    centerList.innerHTML = data.centers.map(c => `
      <div class="center-item ${c.id === activeCenterId ? 'active' : ''}" data-id="${c.id}">
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="addr">${escapeHtml(c.address || '')}</div>
      </div>
    `).join('');

    centerList.querySelectorAll('.center-item').forEach(el => {
      el.addEventListener('click', () => {
        activeCenterId = el.dataset.id;
        renderAll();
      });
    });
  }

  function renderEditor() {
    const center = data.centers.find(c => c.id === activeCenterId);
    if (!center) {
      centerEditor.innerHTML = '<div class="card empty">Selecciona o crea un centro para empezar.</div>';
      return;
    }

    centerEditor.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <h2 style="margin: 0;">${escapeHtml(center.name)}</h2>
          <div class="actions">
            ${singleCenterMode ? '' : '<button class="danger icon" id="deleteCenterBtn">Eliminar centro</button>'}
          </div>
        </div>

        <div class="tabs">
          <button data-tab="visits"    class="${activeTab === 'visits' ? 'active' : ''}">Visitas y procedimientos</button>
          <button data-tab="durations" class="${activeTab === 'durations' ? 'active' : ''}">Duraciones de procedimientos</button>
          <button data-tab="info"      class="${activeTab === 'info' ? 'active' : ''}">Información del centro</button>
        </div>

        <div id="tabContent"></div>
      </div>
    `;

    const deleteBtn = centerEditor.querySelector('#deleteCenterBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!confirm(`¿Quieres eliminar el centro "${center.name}"?`)) return;
        data.centers = data.centers.filter(c => c.id !== center.id);
        activeCenterId = data.centers[0] ? data.centers[0].id : null;
        persist();
        renderAll();
      });
    }

    centerEditor.querySelectorAll('.tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        renderEditor();
      });
    });

    if (activeTab === 'visits')    renderVisitsTab(center);
    if (activeTab === 'durations') renderDurationsTab(center);
    if (activeTab === 'info')      renderInfoTab(center);
  }

  function renderVisitsTab(center) {
    const container = document.getElementById('tabContent');
    if (!center.visitProcedures) center.visitProcedures = {};

    const html = `
      <div class="legend">
        <span class="legend-item"><span class="proc-dot state-green"></span> Obligatorio — del protocolo, bloqueado</span>
        <span class="legend-item"><span class="proc-dot state-orange"></span> Confirmar — selecciona "Aplica" o "No aplica" según el paciente</span>
        <span class="legend-item"><span class="proc-dot state-gray"></span> No aplica — no forma parte del protocolo en esta visita</span>
      </div>
      <div class="note-banner">
        <strong>Nota sobre las ventanas:</strong> el protocolo del ALLEGRO solo define ventanas a nivel de prueba
        (screening hasta 30 días antes del baseline; RM ±4 días; llamadas 14±2 d; test de embarazo 28±2 d).
        Las ventanas de ±7 días de las visitas programadas (±14 en terminación) son un <em>supuesto de este TFM</em>,
        basado en la práctica habitual en ensayos de EM, no un dato del protocolo.
      </div>
    ` + data.visits.map(visit => {
      const entries = center.visitProcedures[visit.id] || [];
      // Mandatory always counts
      const mandatoryMin = entries
        .filter(e => !e.conditional)
        .map(e => data.procedures.find(p => p.id === e.id))
        .filter(Boolean)
        .reduce((sum, p) => sum + getProcedureDuration(center, p), 0);
      // Confirmed-applies (entry.applied === true) counts
      const appliedMin = entries
        .filter(e => e.conditional && e.applied === true)
        .map(e => data.procedures.find(p => p.id === e.id))
        .filter(Boolean)
        .reduce((sum, p) => sum + getProcedureDuration(center, p), 0);
      // Pending decision (entry.applied === undefined) is uncertain
      const pendingMin = entries
        .filter(e => e.conditional && e.applied !== true && e.applied !== false)
        .map(e => data.procedures.find(p => p.id === e.id))
        .filter(Boolean)
        .reduce((sum, p) => sum + getProcedureDuration(center, p), 0);

      const definite = mandatoryMin + appliedMin;
      const maxTotal = definite + pendingMin;

      const windowText = visit.windowBefore === 0 && visit.windowAfter === 0
        ? 'sin ventana'
        : `±${visit.windowBefore}/${visit.windowAfter} días`;

      const durBadge = pendingMin > 0
        ? `<span class="badge success">${formatDuration(definite)} – ${formatDuration(maxTotal)}</span>`
        : `<span class="badge success">${formatDuration(definite)}</span>`;

      return `
        <div class="visit-block">
          <div class="visit-head">
            <div>
              <span class="name">${escapeHtml(visit.name)}</span>
              <span class="meta"> · Día ${visit.day} · ${windowText}</span>
            </div>
            <div>
              <span class="badge">${entries.length} procedimientos</span>
              ${durBadge}
            </div>
          </div>
          <div class="proc-grid">
            ${data.procedures.map(p => {
              const entry = entries.find(e => e.id === p.id);
              const state = !entry ? 'gray' : (entry.conditional ? 'orange' : 'green');
              const stateLabel = state === 'green' ? 'Obligatorio' : (state === 'orange' ? 'Confirmar' : 'No aplica');
              const dur = getProcedureDuration(center, p);
              const note = entry && entry.note ? entry.note : '';
              const applied = entry && entry.applied;
              return `
                <div class="proc-card state-${state}" data-visit="${visit.id}" data-proc="${p.id}" title="${stateLabel}">
                  <div class="proc-row">
                    <span class="proc-dot state-${state}"></span>
                    <span class="proc-name">${escapeHtml(p.name)}</span>
                    <span class="proc-dur">${dur}'</span>
                    ${state === 'green' ? '<span class="proc-lock" title="Obligatorio del protocolo">🔒</span>' : ''}
                  </div>
                  ${note ? `<div class="proc-note">${escapeHtml(note)}</div>` : ''}
                  ${state === 'orange' ? `
                    <div class="applies-toggle">
                      <button class="applies-btn aplica ${applied === true ? 'selected' : ''}" data-action="apply" data-value="true">✓ Aplica</button>
                      <button class="applies-btn no-aplica ${applied === false ? 'selected' : ''}" data-action="apply" data-value="false">✕ No aplica</button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.proc-card [data-action="apply"]').forEach(btn => {
      const card = btn.closest('.proc-card');
      const visitId = card.dataset.visit;
      const procId = card.dataset.proc;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entry = findEntry(center, visitId, procId);
        if (!entry) return;
        const value = btn.dataset.value === 'true';
        // Toggle off if same selection clicked again
        if (entry.applied === value) {
          delete entry.applied;
        } else {
          entry.applied = value;
        }
        persist();
        renderVisitsTab(center);
      });
    });
  }

  function renderDurationsTab(center) {
    const container = document.getElementById('tabContent');
    if (!center.procedureDurations) center.procedureDurations = {};

    const total = data.procedures.length;
    const reviewed = Object.keys(center.procedureDurations).length;
    const pending = total - reviewed;
    const progressPct = Math.round((reviewed / total) * 100);

    container.innerHTML = `
      <div class="alert warning">
        <strong>⚠ Las duraciones son orientativas y deben revisarse para este centro.</strong>
        Los tiempos por defecto son una estimación realista pero cada centro tiene su operativa. Ajusta cada procedimiento al tiempo real del centro.
      </div>

      <div class="review-progress">
        <div class="review-progress-info">
          <strong>${reviewed}</strong> de <strong>${total}</strong> duraciones confirmadas para este centro
          ${pending > 0 ? `<span style="color: var(--warning); font-weight: 600;"> · ${pending} por revisar</span>` : '<span style="color: var(--success); font-weight: 600;"> · todas confirmadas ✓</span>'}
        </div>
        <div class="review-progress-bar">
          <div class="review-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
      </div>

      <div class="duration-grid">
        ${data.procedures.map(p => {
          const override = center.procedureDurations[p.id];
          const isOverridden = override != null;
          const value = isOverridden ? override : p.defaultDuration;
          return `
            <div class="duration-row ${isOverridden ? 'reviewed' : 'pending'}">
              <div class="dur-input-wrap">
                <input type="number" min="0" step="5"
                       data-proc="${p.id}"
                       value="${value}">
                <span class="dur-unit">min</span>
              </div>
              <div class="dur-name">${escapeHtml(p.name)}</div>
              <div class="dur-status">
                ${isOverridden
                  ? '<span class="badge success">✓ Confirmado</span>'
                  : `<span class="badge warning">Por revisar</span><span class="dur-default">pred. ${p.defaultDuration}'</span>`}
              </div>
              ${isOverridden ? `<button class="dur-reset" data-proc="${p.id}" title="Volver al valor por defecto">↺</button>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('input[type=number]').forEach(input => {
      input.addEventListener('change', () => {
        const procId = input.dataset.proc;
        const val = input.value.trim();
        const n = parseInt(val, 10);
        if (val !== '' && !isNaN(n) && n >= 0) {
          // Any value entered (even same as default) marks it as reviewed
          center.procedureDurations[procId] = n;
        }
        persist();
        renderDurationsTab(center);
      });
    });

    container.querySelectorAll('.dur-reset').forEach(btn => {
      btn.addEventListener('click', () => {
        const procId = btn.dataset.proc;
        delete center.procedureDurations[procId];
        persist();
        renderDurationsTab(center);
      });
    });
  }

  function renderInfoTab(center) {
    const container = document.getElementById('tabContent');
    if (!center.coords) center.coords = { lat: null, lon: null };

    container.innerHTML = `
      <div class="form-group">
        <label>Nombre del centro</label>
        <input type="text" id="editName" value="${escapeHtml(center.name)}">
      </div>
      <div class="form-group">
        <label>Dirección (informativa)</label>
        <textarea id="editAddress">${escapeHtml(center.address || '')}</textarea>
        <div class="hint">Texto mostrado al paciente. No se usa para calcular rutas.</div>
      </div>
      <div class="form-group">
        <label>Coordenadas del centro (usadas para el cálculo de rutas)</label>
        <div class="coords-row">
          <div>
            <input type="number" step="0.000001" id="editLat" placeholder="Latitud" value="${center.coords.lat != null ? center.coords.lat : ''}">
            <div class="hint">Latitud (ej. 41.42667)</div>
          </div>
          <div>
            <input type="number" step="0.000001" id="editLon" placeholder="Longitud" value="${center.coords.lon != null ? center.coords.lon : ''}">
            <div class="hint">Longitud (ej. 2.14946)</div>
          </div>
        </div>
        <div class="coords-actions">
          <a id="mapPreviewLink" href="#" target="_blank" rel="noopener" class="map-link">📍 Ver en OpenStreetMap</a>
          <button type="button" class="secondary icon" id="clearCoordsBtn">Borrar coordenadas</button>
        </div>
        <div class="alert info" style="margin-top: 10px;">
          <strong>Cómo obtener las coordenadas:</strong> abre <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">openstreetmap.org</a>, busca el centro, haz clic derecho sobre la ubicación exacta → "Mostrar dirección" / "Show address". Las coordenadas aparecen en la URL como <code>?mlat=41.42667&mlon=2.14946</code>.
        </div>
      </div>
    `;

    function updateMapLink() {
      const lat = parseFloat(document.getElementById('editLat').value);
      const lon = parseFloat(document.getElementById('editLon').value);
      const link = document.getElementById('mapPreviewLink');
      if (!isNaN(lat) && !isNaN(lon)) {
        link.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
        link.style.opacity = '1';
        link.style.pointerEvents = 'auto';
      } else {
        link.href = '#';
        link.style.opacity = '0.5';
        link.style.pointerEvents = 'none';
      }
    }

    container.querySelector('#editName').addEventListener('input', (e) => {
      center.name = e.target.value;
      persist();
      renderCenterList();
    });
    container.querySelector('#editAddress').addEventListener('input', (e) => {
      center.address = e.target.value;
      persist();
      renderCenterList();
    });
    container.querySelector('#editLat').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      center.coords.lat = v === '' ? null : parseFloat(v);
      persist();
      updateMapLink();
    });
    container.querySelector('#editLon').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      center.coords.lon = v === '' ? null : parseFloat(v);
      persist();
      updateMapLink();
    });
    container.querySelector('#clearCoordsBtn').addEventListener('click', () => {
      center.coords = { lat: null, lon: null };
      persist();
      renderInfoTab(center);
    });
    updateMapLink();
  }

  function renderAll() {
    renderCenterList();
    renderEditor();
  }

  addCenterBtn.addEventListener('click', () => {
    const name = prompt('Nombre del nuevo centro:');
    if (!name || !name.trim()) return;
    const id = 'c_' + Date.now();
    const newCenter = {
      id,
      name: name.trim(),
      address: '',
      visitProcedures: {},
      procedureDurations: {}
    };
    // Pre-fill with common procedures for screening / baseline
    newCenter.visitProcedures.screening = [
      { id: 'consent' }, { id: 'medHistory' }, { id: 'physicalExam' },
      { id: 'vitalSigns' }, { id: 'neuroExam' }, { id: 'bloodSample' }, { id: 'ecg' }
    ];
    newCenter.visitProcedures.baseline = [
      { id: 'vitalSigns' }, { id: 'neuroExam' }, { id: 'msfc' },
      { id: 'bloodSample' }, { id: 'ipAdmin' }, { id: 'aeReview' }, { id: 'conMedReview' }
    ];
    data.centers.push(newCenter);
    activeCenterId = id;
    activeTab = 'info';
    persist();
    renderAll();
  });

  resetBtn.addEventListener('click', () => {
    if (singleCenterMode) {
      if (!confirm('¿Restaurar el protocolo predeterminado de este centro? Se perderán los cambios que hayas hecho.')) return;
      // Replace only the user's center with the default version
      const defaults = resetData();
      const defaultCenter = defaults.centers.find(c => c.id === userCenterId);
      if (!defaultCenter) return;
      // Reload current data (resetData wiped it) and inject any other untouched centers
      data = loadData();
      const idx = data.centers.findIndex(c => c.id === userCenterId);
      if (idx >= 0) data.centers[idx] = defaultCenter;
      else data.centers.push(defaultCenter);
      persist();
      activeTab = 'visits';
      renderAll();
      return;
    }
    if (!confirm('¿Borrar todos los datos locales y restaurar los predeterminados? Esta acción no se puede deshacer.')) return;
    data = resetData();
    activeCenterId = data.centers[0] ? data.centers[0].id : null;
    activeTab = 'visits';
    renderAll();
  });

  renderAll();
})();
