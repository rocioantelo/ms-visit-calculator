// Schedule of Activities — ALLEGRO Study (MS-LAQ-301)
// Based on Protocol No: MS-LAQ-301, Amended protocol No. 4 (Oct 7, 2009)
console.log('[MS Calculator] data.js cargado — versión ALLEGRO (12 visitas, 33 procedimientos)');

const DEFAULT_VISITS = [
  { id: 'screening',   name: 'V-1 Screening (Month -1)',            day: -30, windowBefore: 7,  windowAfter: 0  },
  { id: 'baseline',    name: 'V BL Baseline (Month 0)',             day: 0,   windowBefore: 0,  windowAfter: 0  },
  { id: 'v1',          name: 'V1 (Month 1)',                        day: 30,  windowBefore: 7,  windowAfter: 7  },
  { id: 'v2',          name: 'V2 (Month 2)',                        day: 60,  windowBefore: 7,  windowAfter: 7  },
  { id: 'v3',          name: 'V3 (Month 3)',                        day: 90,  windowBefore: 7,  windowAfter: 7  },
  { id: 'v4',          name: 'V4 (Month 6)',                        day: 180, windowBefore: 7,  windowAfter: 7  },
  { id: 'v5',          name: 'V5 (Month 9)',                        day: 270, windowBefore: 7,  windowAfter: 7  },
  { id: 'v6',          name: 'V6 (Month 12)',                       day: 360, windowBefore: 7,  windowAfter: 7  },
  { id: 'v7',          name: 'V7 (Month 15)',                       day: 450, windowBefore: 7,  windowAfter: 7  },
  { id: 'v8',          name: 'V8 (Month 18)',                       day: 540, windowBefore: 7,  windowAfter: 7  },
  { id: 'v9',          name: 'V9 (Month 21)',                       day: 630, windowBefore: 7,  windowAfter: 7  },
  { id: 'termination', name: 'V10/V12 Termination (Month 24)',      day: 720, windowBefore: 14, windowAfter: 14 }
];

// Default procedures with default duration in minutes
// These are reference/orientative times. Each center MUST review them in the
// "Duraciones de procedimientos" tab.
const DEFAULT_PROCEDURES = [
  { id: 'consent',         name: 'Informed Consent',                              defaultDuration: 45 },
  { id: 'eligibility',     name: 'Eligibility Criteria',                          defaultDuration: 10 },
  { id: 'medHistory',      name: 'Medical History',                               defaultDuration: 30 },
  { id: 'msHistory',       name: 'MS History',                                    defaultDuration: 25 },
  { id: 'conMed',          name: 'Historical and Concomitant Medication',         defaultDuration: 10 },
  { id: 'firstDose',       name: 'First Dose at Site',                            defaultDuration: 90 },
  { id: 'physicalExam',    name: 'Physical Examination',                          defaultDuration: 20 },
  { id: 'vitalSigns',      name: 'Vital Signs',                                   defaultDuration: 5  },
  { id: 'ecg',             name: '12-lead ECG',                                   defaultDuration: 10 },
  { id: 'chestXray',       name: 'Chest X-ray',                                   defaultDuration: 30 },
  { id: 'factorV',         name: 'Factor V Leiden Mutation',                      defaultDuration: 5  },
  { id: 'safetyLab',       name: 'Safety Lab (CBC, Chemistry, Urinalysis)',       defaultDuration: 15 },
  { id: 'immunology',      name: 'Immunology/MOA Whole Blood & Serum (ancillary)', defaultDuration: 10 },
  { id: 'moaSerum',        name: 'Serum samples for MOA (all subjects)',          defaultDuration: 5  },
  { id: 'serumHCG',        name: 'Serum βHCG',                                    defaultDuration: 5  },
  { id: 'urineHCG',        name: 'Urine βHCG (on site)',                          defaultDuration: 5  },
  { id: 'mri',             name: 'MRI (T1, T2)',                                  defaultDuration: 60 },
  { id: 'freqMri',         name: 'Frequent MRI (ancillary)',                      defaultDuration: 75 },
  { id: 'mtMri',           name: 'Magnetization Transfer MRI (ancillary)',        defaultDuration: 30 },
  { id: 'mrs',             name: 'MR Spectroscopy (ancillary)',                   defaultDuration: 45 },
  { id: 'neuroExam',       name: 'Neurological Exam (EDSS/FS/AI/25fw)',           defaultDuration: 45 },
  { id: 'relapseEval',     name: 'Evaluation of Relapse',                         defaultDuration: 10 },
  { id: 'msfc',            name: 'MSFC',                                          defaultDuration: 45 },
  { id: 'visualAcuity',    name: 'Binocular Low-Contrast Visual Acuity',          defaultDuration: 15 },
  { id: 'mfis',            name: 'MFIS',                                          defaultDuration: 10 },
  { id: 'sf36',            name: 'SF-36',                                         defaultDuration: 15 },
  { id: 'eq5d',            name: 'EuroQoL (EQ5D)',                                defaultDuration: 5  },
  { id: 'pgx',             name: 'Pharmacogenomics (ancillary)',                  defaultDuration: 5  },
  { id: 'ppk',             name: 'PPK Sampling',                                  defaultDuration: 30 },
  { id: 'thrombosisCall',  name: 'Thrombosis Questionnaire (phone call)',         defaultDuration: 10 },
  { id: 'drugDispensing',  name: 'Drug Compliance & Dispensing',                  defaultDuration: 20 },
  { id: 'ae',              name: 'Adverse Event Review',                          defaultDuration: 10 },
  { id: 'termDoc',         name: 'Termination Documentation',                     defaultDuration: 30 }
];

// Build per-center visitProcedures map from the ALLEGRO SoA.
// Helpers:
//   m(id)           -> mandatory, no note
//   mn(id, note)    -> mandatory with informational note
//   co(id)          -> conditional (Si procede) without note
//   c(id, note)     -> conditional with explanation note
const DEFAULT_CENTERS = (() => {
  const m  = id        => ({ id });
  const mn = (id, n)   => ({ id, note: n });
  const co = id        => ({ id, conditional: true });
  const c  = (id, n)   => ({ id, conditional: true, note: n });

  // Footnote text (from ALLEGRO protocol amendments a-r)
  const N = {
    wocbp:        'Mujeres en edad fértil (WOCBP)',                                            // f
    ecgScreen:    'Si QTc > 450 ms, registro adicional cada 30 min',                            // c
    ecgBaseline:  '3 registros en intervalos de 15 min',                                        // c
    vitalsBL:     'Pre-dosis y post-dosis (30 y 60 min)',                                       // m
    mriBaseline:  'Realizar 13-7 días antes de la randomización',                               // g
    msfcScreen:   '3 veces para entrenamiento',                                                 // i
    visualAcuity: '3 cartillas (100%, 2.5% y 1.25% de contraste)',                              // n
    immunoLim:    'Solo meses 0, 1, 6, 12 y 24',                                                // l
    factorVStor:  'Muestra almacenada congelada; analizable a petición del DMC',                // o
    chestXrayHi:  'Aceptable si realizada en los 6 meses previos al screening',                 // d
    thrombosis:   'Llamadas cada 2 semanas durante los primeros 3 meses (fase doble ciego)',    // k
    ancillarySub: 'Sub-estudio ancillary (subgrupo)',                                           // e
    sitesSub:     'Sub-estudio ancillary, solo sitios participantes',                           // e
    termExt:      'Si estudio extendido, también en mes 30',                                    // j
    eq5dTerm:     'Solo en visita de terminación (mes 24 o 30 si extendido)',                   // j
    relapse:      'También en visitas no programadas si lo determina el investigador',          // h
    serumMOA:     'Detección de MoA o antígenos infecciosos'                                    // p
  };

  // The full ALLEGRO mapping for a site participating in all ancillary studies
  const fullAllegro = {
    screening: [
      m('consent'), m('eligibility'), m('medHistory'), m('msHistory'),
      m('conMed'), m('physicalExam'), m('vitalSigns'),
      mn('ecg', N.ecgScreen),
      c('chestXray', N.chestXrayHi),
      mn('factorV', N.factorVStor),
      m('safetyLab'),
      c('immunology', N.sitesSub),
      mn('moaSerum', N.serumMOA),
      c('serumHCG', N.wocbp),
      c('urineHCG', N.wocbp),
      mn('mri', N.mriBaseline),
      m('neuroExam'),
      mn('relapseEval', N.relapse),
      mn('msfc', N.msfcScreen),
      m('ae')
    ],
    baseline: [
      m('eligibility'), m('conMed'), m('firstDose'),
      m('physicalExam'),
      mn('vitalSigns', N.vitalsBL),
      mn('ecg', N.ecgBaseline),
      m('safetyLab'),
      c('immunology', N.immunoLim),
      mn('moaSerum', N.serumMOA),
      c('serumHCG', N.wocbp),
      c('urineHCG', N.wocbp),
      m('neuroExam'),
      mn('relapseEval', N.relapse),
      m('msfc'),
      mn('visualAcuity', N.visualAcuity),
      m('mfis'), m('sf36'), m('eq5d'),
      c('pgx', N.ancillarySub),
      c('freqMri', N.ancillarySub),
      c('mtMri', N.ancillarySub),
      c('mrs', N.ancillarySub),
      m('drugDispensing'), m('ae')
    ],
    v1: [
      m('conMed'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('immunology', N.immunoLim),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      c('freqMri', N.ancillarySub),
      m('ppk'),
      mn('thrombosisCall', N.thrombosis),
      m('drugDispensing'), m('ae')
    ],
    v2: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('ppk'),
      mn('thrombosisCall', N.thrombosis),
      m('drugDispensing'), m('ae')
    ],
    v3: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('msfc'), mn('visualAcuity', N.visualAcuity), m('mfis'), m('sf36'),
      mn('thrombosisCall', N.thrombosis),
      m('drugDispensing'), m('ae')
    ],
    v4: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('immunology', N.immunoLim),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('mri'),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('msfc'), mn('visualAcuity', N.visualAcuity), m('mfis'), m('sf36'),
      c('freqMri', N.ancillarySub), c('mtMri', N.ancillarySub),
      m('ppk'),
      m('drugDispensing'), m('ae')
    ],
    v5: [
      m('conMed'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('drugDispensing'), m('ae')
    ],
    v6: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('immunology', N.immunoLim),
      mn('moaSerum', N.serumMOA),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('mri'),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('msfc'), mn('visualAcuity', N.visualAcuity), m('mfis'), m('sf36'),
      m('drugDispensing'), m('ae')
    ],
    v7: [
      m('conMed'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('drugDispensing'), m('ae')
    ],
    v8: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('msfc'), mn('visualAcuity', N.visualAcuity), m('mfis'), m('sf36'),
      m('drugDispensing'), m('ae')
    ],
    v9: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'), m('safetyLab'),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('neuroExam'), mn('relapseEval', N.relapse),
      m('drugDispensing'), m('ae')
    ],
    termination: [
      m('conMed'), m('physicalExam'), m('vitalSigns'), m('ecg'),
      m('chestXray'),
      m('safetyLab'),
      c('immunology', N.immunoLim),
      mn('moaSerum', N.serumMOA),
      c('serumHCG', N.wocbp), c('urineHCG', N.wocbp),
      m('mri'),
      m('neuroExam'), mn('relapseEval', N.relapse),
      mn('msfc', N.termExt),
      mn('visualAcuity', N.visualAcuity),
      mn('mfis', N.termExt), mn('sf36', N.termExt),
      c('eq5d', N.eq5dTerm),
      c('mtMri', N.ancillarySub), c('mrs', N.ancillarySub),
      m('termDoc'), m('ae')
    ]
  };

  // Build a variant with selected ancillary sub-studies removed
  function removeProcedures(visitProcs, procIdsToRemove) {
    const out = {};
    Object.keys(visitProcs).forEach(visitId => {
      out[visitId] = visitProcs[visitId].filter(e => !procIdsToRemove.includes(e.id));
    });
    return out;
  }

  const allAncillaries = ['immunology', 'freqMri', 'mtMri', 'mrs', 'pgx'];
  const allButImmunology = ['freqMri', 'mtMri', 'mrs', 'pgx'];

  return [
    {
      id: 'vh',
      name: "Centre d'Esclerosi Múltiple de Catalunya (Cemcat) - Hospital Universitari Vall d'Hebron",
      address: "Passeig de la Vall d'Hebron, 119-129, Edifici Cemcat, 08035 Barcelona",
      coords: { lat: 41.42667, lon: 2.14946 },
      visitProcedures: JSON.parse(JSON.stringify(fullAllegro)),
      procedureDurations: {}
    },
    {
      id: 'clinic',
      name: 'Hospital Clínic de Barcelona',
      address: 'Calle de Villarroel, 170, 08036 Barcelona',
      coords: { lat: 41.38887, lon: 2.15125 },
      visitProcedures: removeProcedures(fullAllegro, allAncillaries),
      procedureDurations: {}
    },
    {
      id: 'bellvitge',
      name: 'Hospital Universitario de Bellvitge',
      address: "Calle de la Feixa Llarga, s/n, 08907 L'Hospitalet de Llobregat",
      coords: { lat: 41.34786, lon: 2.10947 },
      visitProcedures: removeProcedures(fullAllegro, allButImmunology),
      procedureDurations: {}
    },
    {
      id: 'gtp',
      name: 'Hospital Universitari Germans Trias i Pujol',
      address: 'Carretera de Canyet, s/n, 08916 Badalona',
      coords: { lat: 41.49585, lon: 2.23548 },
      visitProcedures: removeProcedures(fullAllegro, allAncillaries),
      procedureDurations: {}
    }
  ];
})();

// Simulated patient profiles. Each one is associated to a center.
// Used by the calculator to pre-fill patient data after login.
const DEFAULT_PATIENT_PROFILES = [
  {
    id: 'P-001',
    centerId: 'clinic',
    name: 'Núria Vidal',
    birthYear: 1988,    // ~38
    sex: 'F',
    wocbp: true,
    address: 'Carrer de Sicília 245, 08013 Barcelona'
  },
  {
    id: 'P-002',
    centerId: 'vh',
    name: 'Marc Puig',
    birthYear: 1985,    // ~41
    sex: 'M',
    wocbp: false,
    address: 'Carrer del Pi i Margall 53, 08024 Barcelona'
  },
  {
    id: 'P-003',
    centerId: 'gtp',
    name: 'Laia Ferrer',
    birthYear: 1995,    // ~31
    sex: 'F',
    wocbp: true,
    address: 'Avinguda President Companys 12, 08911 Badalona'
  },
  {
    id: 'P-004',
    centerId: 'vh',
    name: 'Helena Casals',
    birthYear: 2002,    // ~24
    sex: 'F',
    wocbp: true,
    address: 'Carrer de Cartagena 268, 08025 Barcelona'
  },
  {
    id: 'P-005',
    centerId: 'bellvitge',
    name: 'Aina Domènech',
    birthYear: 1989,    // ~37
    sex: 'F',
    wocbp: true,
    address: 'Rambla Marina 244, 08907 L\'Hospitalet de Llobregat'
  },
  {
    id: 'P-006',
    centerId: 'bellvitge',
    name: 'Sílvia Vives',
    birthYear: 1976,    // ~50
    sex: 'F',
    wocbp: false,
    address: 'Carrer de Riera Blanca 105, 08907 L\'Hospitalet de Llobregat'
  }
];

const PATIENTS_STORAGE_KEY = 'msTrialPatients_v2';
const PATIENTS_STORAGE_KEY_LEGACY = 'msTrialPatients_v1';

function loadPatients() {
  const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  // Seed with defaults on first run (and clear legacy)
  localStorage.removeItem(PATIENTS_STORAGE_KEY_LEGACY);
  const seed = JSON.parse(JSON.stringify(DEFAULT_PATIENT_PROFILES));
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function savePatients(patients) {
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

function addPatient(patient) {
  const patients = loadPatients();
  patients.push(patient);
  savePatients(patients);
  return patients;
}

function getPatientsForCenter(centerId) {
  return loadPatients().filter(p => p.centerId === centerId);
}

function findPatient(patientId) {
  return loadPatients().find(p => p.id === patientId);
}

const STORAGE_KEY = 'msTrialCalculatorData_v5';
const STORAGE_KEY_LEGACY_V4 = 'msTrialCalculatorData_v4';
const STORAGE_KEY_LEGACY_V3 = 'msTrialCalculatorData_v3';
const STORAGE_KEY_LEGACY_V2 = 'msTrialCalculatorData_v2';
const STORAGE_KEY_LEGACY_V1 = 'msTrialCalculatorData_v1';

function migrateData(data) {
  // Convert any legacy string-array format to object-array format
  if (!data || !Array.isArray(data.centers)) return data;
  data.centers.forEach(center => {
    if (!center.visitProcedures) return;
    Object.keys(center.visitProcedures).forEach(visitId => {
      const arr = center.visitProcedures[visitId];
      if (!Array.isArray(arr)) return;
      center.visitProcedures[visitId] = arr.map(entry =>
        typeof entry === 'string' ? { id: entry } : entry
      );
    });
  });
  return data;
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return migrateData(JSON.parse(raw));
    } catch (e) {
      console.warn('Could not parse stored data, resetting.', e);
    }
  }
  // Fresh defaults — also clear any legacy keys
  localStorage.removeItem(STORAGE_KEY_LEGACY_V1);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V2);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V3);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V4);
  return {
    visits: JSON.parse(JSON.stringify(DEFAULT_VISITS)),
    procedures: JSON.parse(JSON.stringify(DEFAULT_PROCEDURES)),
    centers: JSON.parse(JSON.stringify(DEFAULT_CENTERS))
  };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V1);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V2);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V3);
  localStorage.removeItem(STORAGE_KEY_LEGACY_V4);
  return loadData();
}

function getProcedureDuration(center, procedure) {
  if (center.procedureDurations && center.procedureDurations[procedure.id] != null) {
    return center.procedureDurations[procedure.id];
  }
  return procedure.defaultDuration;
}

function getVisitEntries(center, visitId) {
  return (center.visitProcedures && center.visitProcedures[visitId]) || [];
}

function findEntry(center, visitId, procId) {
  return getVisitEntries(center, visitId).find(e => e.id === procId);
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
