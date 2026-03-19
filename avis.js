'use strict';

const CFG = {
  fbUrl:        'https://angelique-osteo-default-rtdb.europe-west1.firebasedatabase.app',
  ejPublicKey:  '0KXmYqcazzDfdOuiM',
  ejServiceId:  'service_ly7izea',
  ejTemplateId: 'template_7b2ibhd',
  ownerEmail:   'angeliqueheduin@gmail.com',
  siteUrl:      'https://angelique-osteo.fr',
  rateLimit:    2,
  pollMs:       30000,
  rcKey:        '6Ldup4osAAAAACCUSh7PHbTCISNPjY-ABHnM6h1H',
  tokenTTL:     172800000
};

const HAS_FB = Boolean(CFG.fbUrl && !CFG.fbUrl.startsWith('REMPLACEZ'));
const HAS_EJ = Boolean(CFG.ejPublicKey && !CFG.ejPublicKey.startsWith('REMPLACEZ'));
function initEmailJS() { if (HAS_EJ && typeof emailjs !== 'undefined') emailjs.init({ publicKey: CFG.ejPublicKey }); }

const VALID_SOURCES = new Set(['google', 'facebook', 'connaissances', 'direct']);
const VALID_MOODS   = new Set(['😌', '😊', '🤩', '💪', '🙏', '👶']);

const DEMOS = [
  { id: 'r1', firstname: 'Sophie',  lastname: 'M.', source: 'google',        mood: '😌', moodLabel: 'Soulagée',      rating: 5, text: "Angélique a résolu en une séance mon problème de cervicales que j'avais depuis des mois. Elle est à l'écoute, douce et vraiment professionnelle. Je recommande sans hésiter !", date: '2026-03-08', likes: 14, likedBy: {} },
  { id: 'r2', firstname: 'Laurent', lastname: 'B.', source: 'direct',        mood: '💪', moodLabel: 'Guéri',         rating: 5, text: "Après une blessure sportive persistante, deux séances ont suffi pour retrouver ma mobilité complète. Le suivi est personnalisé et les explications très claires.",      date: '2026-02-21', likes: 8,  likedBy: {} },
  { id: 'r3', firstname: 'Camille', lastname: 'R.', source: 'facebook',      mood: '👶', moodLabel: 'Pour bébé',     rating: 5, text: "J'y ai amené mon bébé de 3 semaines pour des coliques et un torticolis. Les gestes sont d'une douceur extrême, et dès le lendemain les pleurs avaient diminué de moitié.", date: '2026-02-14', likes: 21, likedBy: {} },
  { id: 'r4', firstname: 'Nathalie',lastname: 'G.', source: 'google',        mood: '🙏', moodLabel: 'Reconnaissante',rating: 5, text: "Suivi tout au long de ma grossesse avec une douceur et une bienveillance remarquables. Angélique adapte chaque séance à mes besoins. Je me sens vraiment prise en charge.", date: '2026-01-30', likes: 17, likedBy: {} },
  { id: 'r5', firstname: 'Pierre',  lastname: 'T.', source: 'connaissances', mood: '🤩', moodLabel: 'Excellent',     rating: 5, text: "Souffrant de migraines chroniques depuis des années, j'ai trouvé chez Angélique une approche globale qui fait vraiment la différence. Résultats durables et praticienne passionnée.", date: '2026-01-15', likes: 11, likedBy: {} },
  { id: 'r6', firstname: 'Julie',   lastname: 'D.', source: 'direct',        mood: '😊', moodLabel: 'Satisfaite',    rating: 5, text: "Venue pour un suivi post-partum, j'ai été impressionnée par la précision et la douceur des soins. Angélique explique chaque geste, ce qui rassure vraiment.",              date: '2025-12-20', likes: 9,  likedBy: {} }
];

let reviews = [], currentFilter = 'all', pollTimer = null;

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); }
function uid() { try { let u = localStorage.getItem('avis_uid'); if (!u) { u = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('avis_uid', u); } return u; } catch(e) { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); } }
function hasLiked(id) { try { return JSON.parse(localStorage.getItem('avis_liked') || '[]').includes(id); } catch { return false; } }
function setLiked(id, v) { try { let s = JSON.parse(localStorage.getItem('avis_liked') || '[]'); s = v ? [...new Set([...s, id])] : s.filter(x => x !== id); localStorage.setItem('avis_liked', JSON.stringify(s)); } catch {} }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; } }
function stars(n) { const v = Math.max(1, Math.min(5, Math.floor(Number(n)) || 1)); return '★'.repeat(v) + '☆'.repeat(5 - v); }
function safeSource(s) { return VALID_SOURCES.has(s) ? s : 'direct'; }
function safeMood(m) { return (m && VALID_MOODS.has(m)) ? m : null; }
function safeId(id) { return /^[a-zA-Z0-9_-]{1,40}$/.test(String(id || '')) ? String(id) : null; }
function genToken() { return Array.from(crypto.getRandomValues(new Uint8Array(18))).map(b => b.toString(16).padStart(2, '0')).join(''); }

const SRC_LABELS = { google: 'Google', facebook: 'Facebook', connaissances: 'Connaissances', direct: 'Direct' };
const SRC_CLASS  = { google: 'google', facebook: 'facebook', connaissances: 'direct', direct: 'direct' };
const COLORS = ['#7d9d85', '#bf7ad0', '#e07b55', '#5b8db8', '#c4956a', '#7b9abf', '#b07db0'];
function avatarColor(n) { let h = 0; for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }
function initials(f, l) { return (f[0] || '?').toUpperCase() + (l ? l[0].toUpperCase() : ''); }

function showToast(msg, type = 'success', ms = 3500) {
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.className = 'toast ' + type + ' show';
  setTimeout(() => el.classList.remove('show'), ms);
}
function setSyncDot(live) { const d = document.getElementById('sync-dot'); if (d) d.classList.toggle('live', live); }

function checkRate() {
  try {
    const now = Date.now(), key = 'avis_rate';
    const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(t => now - t < 3600000);
    if (arr.length >= CFG.rateLimit) {
      const oldest = Math.min(...arr);
      const resetIn = Math.ceil((3600000 - (now - oldest)) / 60000);
      return { ok: false, resetIn };
    }
    return { ok: true };
  } catch { return { ok: true }; }
}
function bumpRate() {
  try {
    const now = Date.now(), key = 'avis_rate';
    const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(t => now - t < 3600000);
    arr.push(now); localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

function renderCard(r) {
  const src = safeSource(r.source);
  const mood = safeMood(r.mood);
  const liked = hasLiked(r.id);
  const card = document.createElement('article');
  card.className = 'review-card';
  card.setAttribute('itemscope', '');
  card.setAttribute('itemtype', 'https://schema.org/Review');
  card.innerHTML = `
    <div class="review-header">
      <div class="avatar" style="background:${avatarColor(r.firstname)}" aria-hidden="true">${initials(r.firstname, r.lastname || '')}</div>
      <div class="review-meta">
        <div class="review-name" itemprop="author" itemscope itemtype="https://schema.org/Person"><span itemprop="name">${esc(r.firstname)}${r.lastname ? ' ' + esc(r.lastname) : ''}</span></div>
        <div class="review-info">
          <time class="review-date" itemprop="datePublished" datetime="${esc(r.date || '')}">${fmtDate(r.date)}</time>
          <span class="source-badge ${SRC_CLASS[src]}">${SRC_LABELS[src]}</span>
          ${r.moodLabel ? `<span class="mood-tag" aria-label="Ressenti : ${esc(r.moodLabel)}">${mood} ${esc(r.moodLabel)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="review-stars" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating" aria-label="${r.rating} étoiles sur 5">
      <meta itemprop="ratingValue" content="${r.rating}">
      <meta itemprop="bestRating" content="5">
      ${stars(r.rating)}
    </div>
    <p class="review-text" itemprop="reviewBody">${esc(r.text)}</p>
    <div class="review-footer">
      <button class="like-btn${liked ? ' liked' : ''}" data-id="${esc(r.id)}" aria-label="${liked ? 'Retirer le like' : 'Liker cet avis'}" aria-pressed="${liked}">
        <span class="like-icon" aria-hidden="true">${liked ? '❤️' : '🤍'}</span>
        <span class="like-count">${Math.max(0, r.likes || 0)}</span>
      </button>
    </div>`;
  card.querySelector('.like-btn').addEventListener('click', async function () {
    const id = this.dataset.id;
    const nowLiked = !hasLiked(id);
    setLiked(id, nowLiked);
    this.classList.toggle('liked', nowLiked);
    this.setAttribute('aria-pressed', nowLiked);
    this.querySelector('.like-icon').textContent = nowLiked ? '❤️' : '🤍';
    this.setAttribute('aria-label', nowLiked ? 'Retirer le like' : 'Liker cet avis');
    const idx = reviews.findIndex(r => r.id === id);
    if (idx !== -1) { reviews[idx].likes = (reviews[idx].likes || 0) + (nowLiked ? 1 : -1); this.querySelector('.like-count').textContent = Math.max(0, reviews[idx].likes); }
    if (HAS_FB) await fbLike(id, nowLiked);
  });
  return card;
}

function renderList() {
  const list = document.getElementById('reviews-list');
  const meta = document.getElementById('reviews-meta-text');
  const counter = document.getElementById('stat-count');
  if (!list) return;
  const filtered = currentFilter === 'all' ? reviews : reviews.filter(r => safeSource(r.source) === currentFilter);
  if (counter) counter.textContent = reviews.length;
  if (meta) meta.textContent = reviews.length ? `${reviews.length} témoignage${reviews.length > 1 ? 's' : ''} — Note moyenne : 5/5` : 'Aucun avis pour le moment.';
  document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === currentFilter));
  list.innerHTML = '';
  if (!filtered.length) { list.innerHTML = `<div class="empty-state"><p style="font-size:1.5rem" aria-hidden="true">💬</p><p>Aucun avis dans cette catégorie.</p></div>`; return; }
  filtered.forEach(r => list.appendChild(renderCard(r)));
  updateSchema();
}

function fbBase() { return CFG.fbUrl; }
async function fbGet(p) { try { const r = await fetch(`${fbBase()}/${p}.json`); return r.ok ? r.json() : null; } catch { return null; } }
async function fbSet(p, d) { try { const r = await fetch(`${fbBase()}/${p}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.ok; } catch { return false; } }
async function fbPatch(p, d) { try { const r = await fetch(`${fbBase()}/${p}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); return r.ok; } catch { return false; } }
async function fbDel(p) { try { const r = await fetch(`${fbBase()}/${p}.json`, { method: 'DELETE' }); return r.ok; } catch { return false; } }

async function fbLoadReviews() {
  const data = await fbGet('reviews');
  if (!data) {
    return [];
  }
  return Object.values(data).filter(r => r && r.approved !== false).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

async function fbSyncLikes() {
  const data = await fbGet('reviews'); if (!data) return;
  let changed = false;
  reviews.forEach((r, i) => { const fb = data[r.id]; if (fb && typeof fb.likes === 'number' && fb.likes !== r.likes) { reviews[i].likes = fb.likes; changed = true; } });
  if (changed) document.querySelectorAll('.like-btn').forEach(btn => {
    const rv = reviews.find(r => r.id === btn.dataset.id); if (!rv) return;
    const liked = hasLiked(rv.id);
    btn.classList.toggle('liked', liked); btn.setAttribute('aria-pressed', liked);
    btn.querySelector('.like-count').textContent = Math.max(0, rv.likes || 0);
    btn.querySelector('.like-icon').textContent = liked ? '❤️' : '🤍';
  });
}

async function fbLike(reviewId, liked) {
  /* Les règles Firebase bloquent l'écriture anonyme sur reviews/.
     Les likes sont conservés localement (localStorage) et reflétés
     visuellement immédiatement. Aucune tentative d'écriture Firebase. */
  const idx = reviews.findIndex(r => r.id === reviewId);
  if (idx !== -1) {
    reviews[idx].likes = Math.max(0, (reviews[idx].likes || 0) + (liked ? 1 : -1));
  }
}

async function fbSubmitPending(r) { return fbSet(`pending/${r.id}`, r); }

async function fbApprove(id, token) {
  const p = await fbGet(`pending/${id}`);
  if (!p || !token || p.approvalToken !== token) return false;
  if (p.timestamp && Date.now() - p.timestamp > CFG.tokenTTL) { await fbDel(`pending/${id}`); return false; }
  const ok = await fbSet(`reviews/${id}`, { ...p, approved: true, approvalToken: null, timestamp: Date.now() });
  if (ok) await fbDel(`pending/${id}`);
  return ok;
}
async function fbReject(id, token) {
  const p = await fbGet(`pending/${id}`);
  if (!p || !token || p.approvalToken !== token) return false;
  return fbDel(`pending/${id}`);
}
async function fbLoadPending() { const d = await fbGet('pending'); return d ? Object.values(d).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : []; }

function startPolling() { if (!HAS_FB) return; setSyncDot(true); pollTimer = setInterval(fbSyncLikes, CFG.pollMs); }
function loadLocal() { try { return JSON.parse(localStorage.getItem('avis_reviews')) || DEMOS.map(r => ({ ...r })); } catch { return DEMOS.map(r => ({ ...r })); } }
function saveLocal() { try { localStorage.setItem('avis_reviews', JSON.stringify(reviews)); } catch {} }

async function sendEmail(review, approvalToken) {
  if (!HAS_EJ) return;
  initEmailJS();
  if (typeof emailjs === 'undefined') return;
  const base = `${CFG.siteUrl}/avis.html`;
  try {
    await emailjs.send(CFG.ejServiceId, CFG.ejTemplateId, {
      to_email:     CFG.ownerEmail,
      patient_name: `${review.firstname} ${review.lastname || ''}`.trim(),
      source:       SRC_LABELS[safeSource(review.source)],
      rating:       `${review.rating}/5`,
      mood:         review.mood ? `${review.mood} ${review.moodLabel || ''}` : 'Non renseigné',
      review_text:  review.text,
      date:         fmtDate(review.date),
      approve_url:  `${base}?action=approve&id=${review.id}&token=${encodeURIComponent(approvalToken)}`,
      reject_url:   `${base}?action=reject&id=${review.id}&token=${encodeURIComponent(approvalToken)}`
    });
  } catch (e) { console.warn('EmailJS:', e); }
}

async function showAdmin() {
  const panel = document.getElementById('admin-panel'), sub = document.getElementById('admin-subtitle'), plist = document.getElementById('pending-list');
  if (!panel) return;
  panel.style.display = 'block';
  if (!HAS_FB) { sub.textContent = 'Firebase requis pour le panel admin.'; return; }
  const pending = await fbLoadPending();
  sub.textContent = pending.length ? `${pending.length} avis en attente` : 'Aucun avis en attente.';
  if (!pending.length) { plist.innerHTML = `<div class="empty-state"><p style="font-size:1.5rem">✅</p><p>Aucun avis en attente.</p></div>`; return; }
  plist.innerHTML = '';
  pending.forEach(r => {
    const src = safeSource(r.source);
    const mood = safeMood(r.mood);
    const card = document.createElement('div');
    card.className = 'pending-card'; card.dataset.id = r.id;
    card.innerHTML = `
      <div class="pending-label">En attente de validation</div>
      <div class="review-header">
        <div class="avatar" style="background:${avatarColor(r.firstname)}">${initials(r.firstname, r.lastname || '')}</div>
        <div class="review-meta">
          <div class="review-name">${esc(r.firstname)} ${r.lastname ? esc(r.lastname) : ''}</div>
          <div class="review-info"><time datetime="${esc(r.date || '')}">${fmtDate(r.date)}</time><span class="source-badge ${SRC_CLASS[src]}">${SRC_LABELS[src]}</span></div>
        </div>
        ${mood ? `<div class="review-mood" aria-hidden="true">${mood}</div>` : ''}
      </div>
      <div class="review-stars" aria-label="${r.rating} étoiles sur 5">${stars(r.rating)}</div>
      <p class="review-text">${esc(r.text)}</p>
      <div class="admin-actions">
        <button class="btn-approve" data-id="${esc(r.id)}" data-token="${esc(r.approvalToken || '')}" aria-label="Approuver cet avis">✓ Approuver</button>
        <button class="btn-reject" data-id="${esc(r.id)}" data-token="${esc(r.approvalToken || '')}" aria-label="Rejeter cet avis">✕ Rejeter</button>
      </div>`;
    card.querySelector('.btn-approve').addEventListener('click', async function () {
      const ok = await fbApprove(this.dataset.id, this.dataset.token);
      showToast(ok ? '✓ Avis approuvé et publié !' : 'Erreur ou token invalide.', ok ? 'success' : 'error');
      if (ok) { await init(); await showAdmin(); }
    });
    card.querySelector('.btn-reject').addEventListener('click', async function () {
      const ok = await fbReject(this.dataset.id, this.dataset.token);
      showToast(ok ? 'Avis rejeté.' : 'Erreur ou token invalide.', ok ? 'success' : 'error');
      if (ok) await showAdmin();
    });
    plist.appendChild(card);
  });
}

async function handleUrl() {
  const p = new URLSearchParams(window.location.search);
  const action = p.get('action'), id = p.get('id'), token = p.get('token'), admin = p.get('admin');

  if (admin) {
    // Protection brute-force : 3 tentatives max, blocage 30 min
    const ADMIN_KEY = 'admin_attempts';
    const ADMIN_LOCK_MS = 30 * 60 * 1000;
    const MAX_ATTEMPTS = 3;
    function getAdminAttempts() { try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || '{"count":0,"ts":0}'); } catch { return { count: 0, ts: 0 }; } }
    function setAdminAttempts(d) { try { localStorage.setItem(ADMIN_KEY, JSON.stringify(d)); } catch {} }
    function resetAdminAttempts() { setAdminAttempts({ count: 0, ts: 0 }); }

    const attempts = getAdminAttempts();
    const now = Date.now();
    if (attempts.count >= MAX_ATTEMPTS && (now - attempts.ts) < ADMIN_LOCK_MS) {
      const remainMin = Math.ceil((ADMIN_LOCK_MS - (now - attempts.ts)) / 60000);
      showToast(`Accès bloqué. Réessayez dans ${remainMin} min.`, 'error', 6000);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if ((now - attempts.ts) >= ADMIN_LOCK_MS) resetAdminAttempts();

    if (!window._auth || !window._signIn) {
      showToast('SDK Firebase Auth non chargé — vérifie la console.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const email = prompt('Email admin :');
    if (!email) { window.history.replaceState({}, '', window.location.pathname); return; }
    const pwd = prompt('Mot de passe :');
    if (!pwd) { window.history.replaceState({}, '', window.location.pathname); return; }
    try {
      await window._signIn(window._auth, email, pwd);
      resetAdminAttempts();
      showToast('✓ Connecté', 'success');
      await showAdmin();
      document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      const cur = getAdminAttempts();
      const newCount = (cur.count || 0) + 1;
      setAdminAttempts({ count: newCount, ts: Date.now() });
      const remaining = MAX_ATTEMPTS - newCount;
      const msg =
        err.code === 'auth/invalid-credential'    ? `Email ou mot de passe incorrect.${remaining > 0 ? ' ' + remaining + ' tentative(s) restante(s).' : ' Accès bloqué 30 min.'}` :
        err.code === 'auth/invalid-email'          ? 'Adresse email invalide.'                            :
        err.code === 'auth/too-many-requests'      ? 'Trop de tentatives. Réessaie dans quelques minutes.' :
        err.code === 'auth/network-request-failed' ? 'Erreur réseau. Vérifie ta connexion.'               :
        'Accès refusé.';
      showToast(msg, 'error', 5000);
    }
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if ((action === 'approve' || action === 'reject') && id && token) {
    const safeIdVal = safeId(id);
    if (!safeIdVal) { showToast('Identifiant invalide.', 'error'); return; }
    if (!HAS_FB) { showToast('Firebase requis.', 'error'); return; }
    const safeToken = String(token).replace(/[^a-f0-9]/gi, '').slice(0, 64);
    if (!safeToken) { showToast('Token invalide.', 'error'); return; }
    const ok = action === 'approve' ? await fbApprove(safeIdVal, safeToken) : await fbReject(safeIdVal, safeToken);
    showToast(ok ? (action === 'approve' ? '✓ Avis approuvé !' : 'Avis rejeté.') : 'Avis introuvable ou token invalide.', ok ? 'success' : 'error', 6000);
    if (ok && action === 'approve') await init();
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function updateSchema() {
  const approved = reviews.filter(r => r.approved !== false);
  if (!approved.length) return;
  const avg = (approved.reduce((s, r) => s + (Number(r.rating) || 5), 0) / approved.length).toFixed(1);
  const count = String(approved.length);
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const d = JSON.parse(s.textContent);
      if (d.aggregateRating) {
        d.aggregateRating.ratingValue = avg;
        d.aggregateRating.reviewCount = count;
        s.textContent = JSON.stringify(d);
      }
    } catch {}
  });
}

async function init() {
  reviews = HAS_FB ? await fbLoadReviews() : loadLocal();
  setSyncDot(HAS_FB); renderList();
  if (HAS_FB) startPolling();
}

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const already = btn.classList.contains('selected');
      document.querySelectorAll('.emoji-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
      if (!already) { btn.classList.add('selected'); btn.setAttribute('aria-pressed', 'true'); document.getElementById('mood-value').value = btn.dataset.mood; }
      else document.getElementById('mood-value').value = '';
    });
  });

  document.querySelectorAll('.source-opt').forEach(opt => {
    opt.querySelector('input').addEventListener('change', () => {
      document.querySelectorAll('.source-opt').forEach(o => o.classList.remove('selected')); opt.classList.add('selected');
    });
  });

  const ta = document.getElementById('review-text'), cn = document.getElementById('char-num');
  if (ta && cn) ta.addEventListener('input', () => { const n = ta.value.length; cn.textContent = n; cn.parentElement.classList.toggle('warn', n > 550); });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.filter; renderList();
    });
  });

  const form = document.getElementById('review-form');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const fOk = document.getElementById('flash-success'), fErr = document.getElementById('flash-error');
    fOk.style.display = fErr.style.display = 'none';
    const fn = (document.getElementById('first-name').value || '').trim();
    const ln = (document.getElementById('last-name').value || '').trim();
    const tx = (document.getElementById('review-text').value || '').trim();
    const re = form.querySelector('input[name="rating"]:checked');
    const se = form.querySelector('input[name="source"]:checked');
    const mood = document.getElementById('mood-value').value;
    if (!fn || !tx || !re || !se) { fErr.style.display = 'block'; fErr.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if (fn.length > 40 || ln.length > 40 || tx.length > 600) { fErr.textContent = 'Champs trop longs.'; fErr.style.display = 'block'; return; }
    if (!VALID_SOURCES.has(se.value)) { fErr.textContent = 'Source invalide.'; fErr.style.display = 'block'; return; }
    if (mood && !VALID_MOODS.has(mood)) { fErr.textContent = 'Ressenti invalide.'; fErr.style.display = 'block'; return; }
    if (!/^[a-zA-ZÀ-ÿ\s'\-]{1,40}$/.test(fn)) { fErr.textContent = 'Prénom invalide (lettres, espaces, tirets et apostrophes uniquement).'; fErr.style.display = 'block'; return; }
    const rate = checkRate();
    if (!rate.ok) {
      fErr.textContent = `Limite atteinte : maximum ${CFG.rateLimit} avis par heure. Réessayez dans ${rate.resetIn} min.`;
      fErr.style.display = 'block';
      return;
    }
    const btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.textContent = 'Vérification…';
    let rcToken = '';
    try {
      rcToken = await new Promise((resolve, reject) => {
        if (typeof grecaptcha === 'undefined') { resolve(''); return; }
        grecaptcha.ready(() => grecaptcha.execute(CFG.rcKey, { action: 'submit_review' }).then(resolve).catch(reject));
      });
    } catch (rcErr) { console.warn('reCAPTCHA indisponible:', rcErr); }
    if (!rcToken) {
      fErr.textContent = 'Vérification anti-robot échouée. Réessayez.';
      fErr.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Envoyer mon témoignage';
      return;
    }
    btn.textContent = 'Envoi…';
    const mBtn = mood ? document.querySelector(`.emoji-btn[data-mood="${mood}"]`) : null;
    const approvalToken = genToken();
    const review = {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      firstname: fn, lastname: ln ? ln[0].toUpperCase() + '.' : '',
      source: se.value, mood: mood || null, moodLabel: mBtn ? mBtn.dataset.moodLabel : null,
      rating: Math.max(1, Math.min(5, parseInt(re.value, 10))), text: tx,
      date: new Date().toISOString().split('T')[0],
      likes: 0, likedBy: {}, approved: false, approvalToken: approvalToken, timestamp: Date.now()
    };
    try {
      if (HAS_FB) {
        await fbSubmitPending(review); await sendEmail(review, approvalToken);
        fOk.textContent = '✓ Merci ! Votre témoignage sera publié après validation (< 24h).';
        fOk.style.display = 'block';
      } else {
        review.approved = true; reviews.unshift(review); saveLocal();
        fOk.textContent = '✓ Merci pour votre témoignage !'; fOk.style.display = 'block';
        currentFilter = 'all'; document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        renderList();
      }
      bumpRate();
    } catch (err) {
      console.error(err);
      fErr.textContent = "Erreur lors de l'envoi. Réessayez."; fErr.style.display = 'block';
    } finally {
      fOk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      form.reset();
      document.querySelectorAll('.emoji-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false')})
      document.querySelectorAll('.source-opt').forEach(o => { o.classList.remove('selected'); });
      document.getElementById('mood-value').value = '';
      document.querySelectorAll('.stars-input input').forEach(i => { i.checked = false; });
      btn.disabled = false; btn.textContent = 'Envoyer mon témoignage';
    }
  });

  init();
  handleUrl();
});