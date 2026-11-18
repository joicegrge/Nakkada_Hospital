/* Nakkada Mission Hospital – shared browser-storage data layer (prototype).
   Used by the dashboard, OP registration, Records and Bed Allocation pages.
   Everything is stored in this browser's localStorage. */
(function (w) {
  'use strict';
  const K = {
    patients: 'nakkada_patients',
    covers: 'nakkada_file_covers',
    assess: 'nakkada_assessments',
    tickets: 'nakkada_tickets',
    adm: 'nakkada_admissions',
    beds: 'nakkada_beds',
    log: 'nakkada_bed_log'
  };
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) || (v && typeof v === 'object') ? v : (k === K.beds ? {} : []); } catch (e) { return k === K.beds ? {} : []; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const pad = (n, l) => String(n).padStart(l || 2, '0');
  const dayKey = (d) => { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDT = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const fmtD = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
  const fmtT = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); };
  const nowLocalInput = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const inputToIso = (v) => { const d = v ? new Date(v) : new Date(); return (isNaN(d) ? new Date() : d).toISOString(); };

  /* ---------- OP tickets ---------- */
  const TICKET_STATUS = ['Waiting', 'In Consultation', 'Completed', 'Admitted', 'Cancelled'];
  const TICKET_CLASS = { 'Waiting': 'tk-w', 'In Consultation': 'tk-c', 'Completed': 'tk-d', 'Admitted': 'tk-a', 'Cancelled': 'tk-x' };

  function createTicket(p) {
    const all = read(K.tickets), day = dayKey(), nowIso = new Date().toISOString();
    const token = all.filter((t) => t.day === day).reduce((m, t) => Math.max(m, t.token || 0), 0) + 1;
    const t = {
      id: 'OPT-' + day.replace(/-/g, '') + '-' + pad(token, 3), token: token, day: day,
      patientId: p.patientId, patientName: p.patientName || '', dept: p.departmentDoctor || '',
      status: 'Waiting', createdAt: nowIso, log: [{ status: 'Waiting', at: nowIso }]
    };
    all.push(t); write(K.tickets, all); return t;
  }
  function setTicketStatus(id, status) {
    const all = read(K.tickets), t = all.find((x) => x.id === id);
    if (!t || t.status === status) return t;
    t.status = status; (t.log = t.log || []).push({ status: status, at: new Date().toISOString() });
    write(K.tickets, all); return t;
  }

  /* ---------- Beds: 20 beds in four wards ---------- */
  const WARDS = [
    { id: 'M', name: 'Male Ward', count: 6, sex: 'Male' },
    { id: 'F', name: 'Female Ward', count: 6, sex: 'Female' },
    { id: 'O', name: 'Observation', count: 4, sex: '' },
    { id: 'D', name: 'De-addiction', count: 4, sex: '' }
  ];
  const BEDS = [];
  WARDS.forEach((wd) => { for (let i = 1; i <= wd.count; i++) BEDS.push({ id: wd.id + '-' + pad(i), ward: wd.name, wardId: wd.id, sex: wd.sex }); });

  const activeAdmissions = () => read(K.adm).filter((a) => !a.dischargedAt);
  const activeAdmissionOf = (patientId) => activeAdmissions().find((a) => a.patientId === patientId);
  function bedInfo(bedId) {
    const adm = activeAdmissions().find((a) => a.bedId === bedId);
    if (adm) return { state: 'occupied', adm: adm };
    const b = read(K.beds)[bedId];
    if (b && b.state) return Object.assign({}, b);
    return { state: 'vacant' };
  }
  function setBed(bedId, obj) { const m = read(K.beds); if (obj) m[bedId] = obj; else delete m[bedId]; write(K.beds, m); }
  function logEvent(type, bedId, p, note) {
    const l = read(K.log);
    l.push({ at: new Date().toISOString(), type: type, bedId: bedId, patientId: p && p.patientId || '', name: p && (p.patientName || p.name) || '', note: note || '' });
    write(K.log, l.slice(-300));
  }
  function patientById(id) { return read(K.patients).find((p) => p.patientId === id); }

  function allocate(o) {
    const p = patientById(o.patientId); if (!p) throw new Error('Patient not found');
    if (activeAdmissionOf(o.patientId)) throw new Error('This patient is already admitted.');
    if (bedInfo(o.bedId).state === 'occupied') throw new Error('Bed is already occupied.');
    const adm = {
      id: 'ADM-' + Date.now().toString().slice(-9), patientId: o.patientId, patientName: p.patientName, bedId: o.bedId,
      admittedAt: o.at || new Date().toISOString(), doctor: o.doctor || '', type: o.type || 'Voluntary', reason: o.reason || '',
      guardianContact: o.guardianContact || '', notes: o.notes || '', transfers: []
    };
    const all = read(K.adm); all.push(adm); write(K.adm, all);
    setBed(o.bedId, null);
    logEvent('Admitted', o.bedId, p, adm.type + (adm.reason ? ' · ' + adm.reason : ''));
    // OP ticket moves on to "Admitted" once a bed is allocated.
    const tk = read(K.tickets).filter((t) => t.patientId === o.patientId && t.status !== 'Cancelled' && t.status !== 'Admitted').pop();
    if (tk) setTicketStatus(tk.id, 'Admitted');
    return adm;
  }
  function transfer(admId, newBedId, reason) {
    const all = read(K.adm), a = all.find((x) => x.id === admId); if (!a) throw new Error('Admission not found');
    if (bedInfo(newBedId).state !== 'vacant') throw new Error('Target bed is not vacant.');
    const old = a.bedId; a.transfers.push({ from: old, to: newBedId, at: new Date().toISOString(), reason: reason || '' }); a.bedId = newBedId;
    write(K.adm, all); setBed(old, { state: 'cleaning', since: new Date().toISOString() }); setBed(newBedId, null);
    logEvent('Transferred', newBedId, { patientId: a.patientId, name: a.patientName }, old + ' → ' + newBedId + (reason ? ' · ' + reason : ''));
    return a;
  }
  function discharge(admId, o) {
    const all = read(K.adm), a = all.find((x) => x.id === admId); if (!a) throw new Error('Admission not found');
    a.dischargedAt = o.at || new Date().toISOString(); a.dischargeType = o.type || 'Routine'; a.dischargeSummary = o.summary || ''; a.followUp = o.followUp || '';
    write(K.adm, all); setBed(a.bedId, { state: 'cleaning', since: new Date().toISOString() });
    logEvent('Discharged', a.bedId, { patientId: a.patientId, name: a.patientName }, a.dischargeType);
    return a;
  }
  function reserve(bedId, o) {
    if (bedInfo(bedId).state !== 'vacant') throw new Error('Only a vacant bed can be reserved.');
    setBed(bedId, { state: 'reserved', patientId: o.patientId || '', name: o.name || '', note: o.note || '', since: new Date().toISOString() });
    logEvent('Reserved', bedId, { patientId: o.patientId, name: o.name }, o.note);
  }
  function setBedState(bedId, state, note) {
    if (state === 'vacant') { setBed(bedId, null); logEvent('Bed ready', bedId, null, note); return; }
    setBed(bedId, { state: state, note: note || '', since: new Date().toISOString() });
    logEvent(state === 'maintenance' ? 'Blocked for maintenance' : state === 'cleaning' ? 'Sent for cleaning' : 'Updated', bedId, null, note);
  }

  w.NK = {
    K: K, read: read, write: write, esc: esc, dayKey: dayKey, fmtDT: fmtDT, fmtD: fmtD, fmtT: fmtT, nowLocalInput: nowLocalInput, inputToIso: inputToIso,
    TICKET_STATUS: TICKET_STATUS, TICKET_CLASS: TICKET_CLASS, createTicket: createTicket, setTicketStatus: setTicketStatus,
    WARDS: WARDS, BEDS: BEDS, activeAdmissions: activeAdmissions, activeAdmissionOf: activeAdmissionOf, bedInfo: bedInfo, patientById: patientById,
    allocate: allocate, transfer: transfer, discharge: discharge, reserve: reserve, setBedState: setBedState
  };
})(window);

/* ---------- Editing with audit trail (who changed it, and when) ---------- */
(function (w) {
  'use strict';
  const NK = w.NK, esc = NK.esc, K = NK.K;
  const EDITOR_KEY = 'nakkada_editor_name', DEFAULT_EDITOR = 'Dr. Thomas Mathew';
  NK.getEditor = () => { try { return localStorage.getItem(EDITOR_KEY) || DEFAULT_EDITOR; } catch (e) { return DEFAULT_EDITOR; } };
  NK.setEditor = (n) => { try { localStorage.setItem(EDITOR_KEY, n); } catch (e) { /* ignore */ } };
  NK.nkey = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  /* Field definitions: k = stored key, l = label, t = input type, o = options, full = full row, req = required */
  const SEX = ['Male', 'Female', 'Others'], YN = ['Yes', 'No'];
  const BG = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
  const TA = (k, l) => ({ k: k, l: l, t: 'textarea', full: true });
  NK.FIELDS = {
    patient: [
      { k: 'patientName', l: 'Patient official name', req: true, full: true },
      { k: 'address', l: 'Address', t: 'textarea', full: true },
      { k: 'pin', l: 'PIN' }, { k: 'mobile', l: 'Mobile / telephone', t: 'tel' },
      { k: 'sex', l: 'Sex', t: 'select', o: SEX }, { k: 'age', l: 'Age', t: 'number' },
      { k: 'departmentDoctor', l: 'Dept. / doctor to be consulted' },
      { k: 'diabetic', l: 'Diabetic', t: 'select', o: YN },
      { k: 'medicineAllergy', l: 'Allergic to any medicine' },
      { k: 'bookedEarlier', l: 'Booked earlier', t: 'select', o: YN },
      { k: 'bookingNumber', l: 'Booking number', showIf: ['bookedEarlier', 'Yes'] },
      { k: 'patientSignature', l: 'Name & signature' }, { k: 'registrationDate', l: 'Registration date', t: 'date' }
    ],
    cover: [
      { k: 'fileNumber', l: 'File number' }, { k: 'fileDate', l: 'File date', t: 'date' },
      { k: 'coverPatientName', l: 'Name of patient' }, { k: 'coverAge', l: 'Age', t: 'number' },
      { k: 'coverSex', l: 'Sex', t: 'select', o: SEX }, { k: 'dob', l: 'Date of birth', t: 'date' },
      { k: 'guardianName', l: 'Name of guardian' }, { k: 'guardianRelation', l: 'Relationship with patient' },
      { k: 'religion', l: 'Religion' }, { k: 'bloodGroup', l: 'Blood group', t: 'select', o: BG },
      { k: 'coverPhone', l: 'Phone', t: 'tel' }, { k: 'coverDepartment', l: 'Department' },
      TA('homeAddress', 'Home address')
    ],
    assess: [
      { k: 'patientName', l: 'Patient name', req: true }, { k: 'age', l: 'Age', t: 'number' },
      { k: 'sex', l: 'Sex', t: 'select', o: SEX }, { k: 'assessmentDate', l: 'Assessment date', t: 'date' },
      { k: 'education', l: 'Education' }, { k: 'occupation', l: 'Occupation' }, { k: 'religion', l: 'Religion' },
      { k: 'maritalStatus', l: 'Marital status', t: 'select', o: ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'] },
      { k: 'socialClass', l: 'Social class' }, { k: 'informant', l: 'Informant' }, { k: 'relation', l: 'Relation' }, { k: 'contact', l: 'Contact', t: 'tel' },
      TA('chiefComplaints', 'Chief complaints'), TA('presentIllness', 'History of present illness'), TA('premorbid', 'Premorbid personality'),
      TA('familyHistory', 'Family history'), TA('childhoodHistory', 'Childhood history'), TA('educationOccupationHistory', 'Educational & occupation history'),
      TA('psychiatricHistory', 'Psychiatric history'), TA('medicalHistory', 'Medical history'), TA('physicalCondition', 'Physical condition as on admission'),
      TA('appearance', '1. Appearance'), TA('motorActivity', '2. Motor activity'), TA('speechActivity', '3. Speech activity'), TA('mood', '4. Mood'),
      TA('alertness', '5. Alertness'), TA('thoughts', '6. Thoughts'), TA('perceptions', '7. Perceptions'),
      TA('orientation', 'Orientation'), TA('memory', 'Memory'), TA('mathematicalAbility', 'Simple mathematical operation'), TA('abstractThinking', 'Abstract thinking'), TA('attitude', 'Attitude'),
      TA('physicalExamination', 'Physical examination'), TA('investigations', 'Investigations'), TA('diagnosis', 'Diagnosis'), TA('treatment', 'Treatment'),
      { k: 'doctor', l: 'Doctor', full: true }
    ]
  };

  /* Medical file cover helpers (shared by Records, Medical Files and the dashboard) */
  NK.FC = ['fileNumber', 'fileDate', 'coverPatientName', 'coverAge', 'coverSex', 'guardianName', 'guardianRelation', 'dob', 'homeAddress', 'religion', 'bloodGroup', 'coverPhone', 'coverDepartment'];
  NK.coversFor = (p, all) => (all || NK.read(K.covers)).filter((c) => c.patientId ? c.patientId === p.patientId : NK.nkey(c.patientName || c.coverPatientName) === NK.nkey(p.patientName));
  NK.fileOf = (p) => {
    const cs = NK.coversFor(p), c = cs[cs.length - 1] || null, file = {};
    NK.FC.forEach((f) => { file[f] = c && c[f] != null ? c[f] : (p[f] || ''); });
    return { file: file, cover: c };
  };
  NK.sameAssessment = (a, b) => a.assessmentId || b.assessmentId ? a.assessmentId === b.assessmentId : (a.savedAt === b.savedAt && NK.nkey(a.patientName) === NK.nkey(b.patientName));

  /* Write an edit: updates the record, stamps who/when and appends to its change history. */
  NK.applyEdit = (key, finder, vals, meta, create) => {
    const all = NK.read(key); let rec = finder(all);
    if (!rec) { if (!create) throw new Error('Record not found'); rec = Object.assign({}, create); all.push(rec); }
    Object.keys(vals).forEach((k) => { rec[k] = vals[k]; });
    rec.updatedAt = meta.at; rec.updatedBy = meta.by;
    (rec.editLog = rec.editLog || []).push({ at: meta.at, by: meta.by, why: meta.why || '', changes: meta.changes });
    NK.write(key, all); return rec;
  };
  /* When a patient is renamed, keep tickets, admissions, assessments and file covers linked to them. */
  NK.renameLinks = (pid, oldName, newName) => {
    const same = (n) => NK.nkey(n) === NK.nkey(oldName);
    const fix = (key, test, fn) => { const all = NK.read(key); let hit = false; all.forEach((x) => { if (test(x)) { fn(x); hit = true; } }); if (hit) NK.write(key, all); };
    fix(K.tickets, (t) => t.patientId === pid, (t) => { t.patientName = newName; });
    fix(K.adm, (a) => a.patientId === pid, (a) => { a.patientName = newName; });
    fix(K.log, (l) => l.patientId === pid, (l) => { l.name = newName; });
    fix(K.assess, (a) => same(a.patientName), (a) => { a.patientName = newName; });
    fix(K.covers, (c) => !c.patientId && same(c.patientName || c.coverPatientName), (c) => { c.patientId = pid; c.patientName = newName; });
    const beds = NK.read(K.beds); let bh = false;
    Object.keys(beds).forEach((b) => { if (beds[b] && beds[b].patientId === pid) { beds[b].name = newName; bh = true; } });
    if (bh) NK.write(K.beds, beds);
  };

  /* ---- "Last edited" display ---- */
  const clip = (v) => { v = (v == null || v === '') ? '—' : String(v); return v.length > 90 ? v.slice(0, 90) + '…' : v; };
  NK.latestEdit = (recs) => recs.filter((r) => r && r.updatedAt).sort((a, b) => (b.updatedAt < a.updatedAt ? -1 : 1))[0] || null;
  NK.editedLine = (rec) => rec && rec.updatedAt ? 'Last edited ' + NK.fmtDT(rec.updatedAt) + (rec.updatedBy ? ' by ' + rec.updatedBy : '') : '';
  NK.editedHTML = (rec) => {
    if (!rec || !rec.updatedAt) return '';
    const log = (rec.editLog || []).slice().reverse();
    const hist = log.length ? '<details><summary>Change history (' + log.length + ')</summary><ul>' + log.map((e) =>
      '<li><b>' + esc(NK.fmtDT(e.at)) + '</b> · ' + esc(e.by || 'Unknown') + (e.why ? ' — <i>' + esc(e.why) + '</i>' : '') +
      '<ul>' + (e.changes || []).map((c) => '<li>' + esc(c.label) + ': <s>' + esc(clip(c.from)) + '</s> → <b>' + esc(clip(c.to)) + '</b></li>').join('') + '</ul></li>').join('') + '</ul></details>' : '';
    return '<div class="nke-last"><span class="nke-when">✎ Last edited <b>' + esc(NK.fmtDT(rec.updatedAt)) + '</b>' + (rec.updatedBy ? ' by <b>' + esc(rec.updatedBy) + '</b>' : '') + '</span>' + hist + '</div>';
  };
  NK.editBtn = (kind, extra) => '<button type="button" class="nke-btn" data-edit="' + kind + '"' + (extra || '') + ' aria-label="Edit">✎ Edit</button>';

  /* ---- Edit dialog ---- */
  NK.openEdit = (cfg) => {
    const fields = cfg.fields, vals = cfg.values || {}, lock = cfg.lockKeys || [];
    const opener = cfg.opener || document.activeElement;
    const ctl = (f) => {
      const id = 'nke_' + f.k, v = vals[f.k] == null ? '' : String(vals[f.k]);
      const ro = lock.indexOf(f.k) > -1, at = ' id="' + id + '" name="' + f.k + '"' + (f.req ? ' required' : '') + (ro ? ' readonly' : '');
      if (f.t === 'textarea') return '<textarea' + at + ' rows="3">' + esc(v) + '</textarea>';
      if (f.t === 'select') { const o = f.o.slice(); if (v && o.indexOf(v) < 0) o.push(v); return '<select' + at + '><option value="">Select</option>' + o.map((x) => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>'; }
      return '<input' + at + ' type="' + (f.t || 'text') + '"' + (f.t === 'number' ? ' min="0" max="130"' : '') + ' value="' + esc(v) + '">';
    };
    const back = document.createElement('div'); back.className = 'nke-back';
    back.innerHTML = '<form class="nke" role="dialog" aria-modal="true" aria-labelledby="nkeT"><header><div><h2 id="nkeT">' + esc(cfg.title) + '</h2>' + (cfg.sub ? '<p>' + esc(cfg.sub) + '</p>' : '') + '</div><button type="button" class="nke-x" aria-label="Close">×</button></header>' +
      '<div class="nke-body"><div class="nke-grid">' + fields.map((f) => '<div class="nke-f' + (f.full ? ' full' : '') + '" data-k="' + f.k + '"><label for="nke_' + f.k + '">' + esc(f.l) + (f.req ? ' <span class="req">*</span>' : '') + '</label>' + ctl(f) + (lock.indexOf(f.k) > -1 ? '<small>Linked field — change the name from the patient registration.</small>' : '') + '</div>').join('') + '</div>' +
      '<div class="nke-audit"><h3>Record this change</h3><div class="nke-grid"><div class="nke-f"><label for="nke__by">Edited by <span class="req">*</span></label><input id="nke__by" name="__by" required autocomplete="name" value="' + esc(NK.getEditor()) + '"></div><div class="nke-f"><label for="nke__why">Reason for change (optional)</label><input id="nke__why" name="__why" placeholder="e.g. phone number corrected"></div></div><p class="nke-note">The date and time are saved automatically and shown as “Last edited” on this record.</p></div></div>' +
      '<footer><span class="nke-err" role="alert"></span><button type="button" class="nke-cancel">Cancel</button><button type="submit" class="nke-save">Save changes</button></footer></form>';
    document.body.appendChild(back); document.documentElement.classList.add('nke-lock');
    const form = back.querySelector('form'), err = back.querySelector('.nke-err');
    const close = () => { document.removeEventListener('keydown', onKey, true); back.remove(); document.documentElement.classList.remove('nke-lock'); if (opener && opener.focus && document.contains(opener)) opener.focus(); };
    const syncShow = () => fields.forEach((f) => { if (!f.showIf) return; const par = form.elements[f.showIf[0]], on = par && par.value === f.showIf[1]; const box = form.querySelector('[data-k="' + f.k + '"]'); box.hidden = !on; box.classList.toggle('full', on); });
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { const f = [...form.querySelectorAll('input,select,textarea,button')].filter((x) => !x.readOnly && !x.closest('[hidden]') && !x.disabled); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    document.addEventListener('keydown', onKey, true);
    form.addEventListener('change', syncShow); syncShow();
    back.querySelector('.nke-x').addEventListener('click', close); back.querySelector('.nke-cancel').addEventListener('click', close);
    form.addEventListener('submit', (e) => {
      e.preventDefault(); err.textContent = '';
      const by = form.elements.__by.value.trim(); if (!by) { err.textContent = 'Please enter who is making this change.'; form.elements.__by.focus(); return; }
      const out = {}, changes = [];
      fields.forEach((f) => {
        const box = form.querySelector('[data-k="' + f.k + '"]'); let nv = box.hidden ? '' : form.elements[f.k].value.trim();
        const ov = vals[f.k] == null ? '' : String(vals[f.k]);
        out[f.k] = nv; if (nv !== ov.trim()) changes.push({ k: f.k, label: f.l, from: ov, to: nv });
      });
      if (!changes.length) { err.textContent = 'Nothing was changed.'; return; }
      const meta = { at: new Date().toISOString(), by: by, why: form.elements.__why.value.trim(), changes: changes };
      try { NK.setEditor(by); cfg.onSave(out, meta); } catch (ex) { err.textContent = 'Could not save: ' + (ex && ex.message || 'storage error'); return; }
      close(); if (cfg.onDone) cfg.onDone(meta);
    });
    const first = form.querySelector('.nke-grid input:not([readonly]),.nke-grid select,.nke-grid textarea'); if (first) first.focus();
  };
})(window);


/* ---------- Top-bar patient search (type a name / ID / mobile → matching patients) ---------- */
(function (w) {
  'use strict';
  const NK = w.NK, esc = NK.esc;
  const st = document.createElement('style');
  st.textContent = '.nk-sr{position:fixed;z-index:60;background:var(--card,#fff);border:1px solid var(--line,#dfe6f1);border-radius:12px;box-shadow:0 12px 30px rgba(15,30,60,.18);max-height:320px;overflow:auto;min-width:260px}' +
    '.nk-sr button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line,#eef2f8);padding:9px 14px;font:inherit;font-size:13px;color:var(--tx,#14213d);cursor:pointer}' +
    '.nk-sr button:last-child{border-bottom:0}.nk-sr button:hover,.nk-sr button:focus{background:rgba(37,99,235,.08);outline:0}.nk-sr small{display:block;color:var(--mu,#667085);font-size:11.5px}.nk-sr p{margin:0;padding:12px 14px;font-size:13px;color:var(--mu,#667085)}';
  document.head.appendChild(st);
  /* onPick(patient) is called when a result is chosen; by default the patient's record is opened. */
  NK.attachSearch = function (input, onPick) {
    if (!input) return;
    const box = document.createElement('div'); box.className = 'nk-sr'; box.hidden = true; document.body.appendChild(box);
    onPick = onPick || ((p) => { location.href = 'records.html?id=' + encodeURIComponent(p.patientId); });
    let hits = [];
    function place() { const r = input.getBoundingClientRect(); box.style.left = r.left + 'px'; box.style.top = (r.bottom + 6) + 'px'; box.style.width = Math.max(r.width, 260) + 'px'; }
    function render() {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.hidden = true; return; }
      hits = NK.read(NK.K.patients).filter((p) => [p.patientName, p.patientId, p.mobile, p.fileNumber].join(' ').toLowerCase().indexOf(q) > -1).slice(0, 12);
      box.innerHTML = hits.length ? hits.map((p, i) => '<button type="button" data-i="' + i + '">' + esc(p.patientName || 'Unnamed patient') + '<small>' + esc(p.patientId) + (p.age ? ' · ' + esc(p.age) + ' yrs' : '') + (p.mobile ? ' · ' + esc(p.mobile) : '') + '</small></button>').join('') : '<p>No patient found for “' + esc(input.value.trim()) + '”.</p>';
      place(); box.hidden = false;
    }
    function pick(i) { const p = hits[i]; if (!p) return; box.hidden = true; input.value = p.patientName || ''; onPick(p); }
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); render(); pick(0); } else if (e.key === 'Escape') box.hidden = true; });
    box.addEventListener('mousedown', (e) => { const b = e.target.closest('button[data-i]'); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
    document.addEventListener('click', (e) => { if (e.target !== input && !box.contains(e.target)) box.hidden = true; });
    w.addEventListener('resize', () => { if (!box.hidden) place(); });
  };
})(window);


/* ---------- Profile menu (Sign out) + printable OP ticket ---------- */
(function (w) {
  'use strict';
  const NK = w.NK, esc = NK.esc;
  const st = document.createElement('style');
  st.textContent =
    '.me{position:relative;cursor:pointer;user-select:none}.nk-menu{position:absolute;right:0;top:calc(100% + 10px);min-width:190px;background:var(--card,#fff);border:1px solid var(--line,#dfe6f1);border-radius:12px;box-shadow:0 12px 30px rgba(15,30,60,.18);padding:6px;z-index:70;font-weight:500}' +
    '.nk-menu[hidden]{display:none}.nk-menu .who{padding:8px 10px 8px;border-bottom:1px solid var(--line,#eef2f8);margin-bottom:4px;font-size:12px;font-weight:600}.nk-menu .who small{display:block;font-weight:400;color:var(--mu,#667085)}' +
    '.nk-menu button{display:block;width:100%;text-align:left;background:none;border:0;border-radius:8px;padding:9px 10px;font:inherit;font-size:13px;color:#b42318;cursor:pointer}.nk-menu button:hover{background:rgba(180,35,24,.08)}' +
    '.nk-out{position:fixed;inset:0;z-index:200;background:var(--bg,#f5f8fd);display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}.nk-out[hidden]{display:none}.nk-out div{background:var(--card,#fff);border:1px solid var(--line,#dfe6f1);border-radius:16px;padding:32px 36px;max-width:340px}' +
    '.nk-out h2{margin:0 0 6px;font-size:20px}.nk-out p{margin:0 0 18px;color:var(--mu,#667085);font-size:13px}.nk-out button{background:var(--pr,#2563eb);color:#fff;border:0;border-radius:10px;padding:10px 20px;font:inherit;font-weight:600;cursor:pointer}' +
    '#nkPrint{display:none}' +
    '@media print{body.nk-printing>*:not(#nkPrint){display:none!important}body.nk-printing #nkPrint{display:block!important}}';
  document.head.appendChild(st);

  function menu() {
    const me = document.querySelector('.top .me'); if (!me) return;
    me.setAttribute('role', 'button'); me.setAttribute('tabindex', '0'); me.setAttribute('aria-haspopup', 'true');
    const m = document.createElement('div'); m.className = 'nk-menu'; m.hidden = true;
    m.innerHTML = '<div class="who">' + esc(NK.getEditor()) + '<small>Consultant Psychiatrist</small></div><button type="button">Sign out</button>';
    me.appendChild(m);
    const ov = document.createElement('div'); ov.className = 'nk-out'; ov.hidden = true;
    ov.innerHTML = '<div><h2>You have been signed out</h2><p>Your session has ended on this device.</p><button type="button">Sign in again</button></div>';
    document.body.appendChild(ov);
    const toggle = () => { m.hidden = !m.hidden; };
    me.addEventListener('click', (e) => { if (!m.contains(e.target)) toggle(); });
    me.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } else if (e.key === 'Escape') m.hidden = true; });
    document.addEventListener('click', (e) => { if (!me.contains(e.target)) m.hidden = true; });
    m.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); m.hidden = true; ov.hidden = false; });
    ov.querySelector('button').addEventListener('click', () => { ov.hidden = true; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', menu); else menu();

  /* Printable OP ticket (hides everything else while printing) */
  NK.printTicket = function (t, p) {
    p = p || NK.patientById(t.patientId) || {};
    let box = document.getElementById('nkPrint');
    if (!box) { box = document.createElement('div'); box.id = 'nkPrint'; document.body.appendChild(box); }
    const row = (l, v) => '<tr><td style="padding:6px 0;color:#555;width:42%">' + l + '</td><td style="padding:6px 0;font-weight:600">' + esc(v || '—') + '</td></tr>';
    box.innerHTML = '<div style="max-width:560px;margin:20px auto;border:2px dashed #555;border-radius:14px;padding:22px;font-family:Arial,sans-serif;color:#111">' +
      '<div style="text-align:center;border-bottom:1px solid #999;padding-bottom:10px;margin-bottom:12px"><b style="font-size:20px;letter-spacing:.08em">NAKKADA MISSION HOSPITAL</b><br><small>Neuro Psychiatric Centre · OP Ticket</small></div>' +
      '<div style="text-align:center;margin:8px 0 14px"><small style="letter-spacing:.12em">TOKEN</small><div style="font-size:52px;font-weight:800;line-height:1">' + esc(t.token) + '</div></div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px">' + row('OP Ticket No.', t.id) + row('Patient', t.patientName) + row('Patient ID', t.patientId) + row('Age / Sex', [p.age, p.sex].filter(Boolean).join(' / ')) + row('Mobile', p.mobile) + row('Department / Doctor', t.dept) + row('Issued', NK.fmtDT(t.createdAt)) + row('Status', t.status) + '</table>' +
      '<p style="margin:16px 0 0;font-size:11px;color:#555;text-align:center">Please keep this ticket with you and show it at the consultation room.</p></div>';
    document.body.classList.add('nk-printing');
    w.print();
    setTimeout(() => document.body.classList.remove('nk-printing'), 500);
  };
})(window);
