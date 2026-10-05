/* =========================================================
   SoccerElite — lógica de la plataforma (sin dependencias)
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- Utilidades ---------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d, opts) => new Date(d).toLocaleDateString("es-MX", opts || { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d) => new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const group = (s, n) => s.replace(new RegExp(`(.{${n}})`, "g"), "$1 ").trim();
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

  const store = {
    get(k, def) { try { const v = localStorage.getItem("se_" + k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) {
      try { localStorage.setItem("se_" + k, JSON.stringify(v)); return true; }
      catch { toast("No se pudo guardar: almacenamiento del navegador lleno o bloqueado.", "error"); return false; }
    },
  };

  function toast(msg, type = "ok") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.classList.add("out"), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  /* ---------------- Modal / drawer ---------------- */
  const modal = $("#modal"), backdrop = $("#backdrop"), drawer = $("#cartDrawer");
  function openModal(html) {
    $("#modalBody").innerHTML = html;
    modal.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("lock");
    $(".modal-close", modal).focus();
  }
  function closeAll() {
    modal.hidden = true;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    document.body.classList.remove("lock");
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]") || e.target === backdrop || e.target === modal) closeAll();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  /* ---------------- Escudos SVG ---------------- */
  function crest(id, size = 40) {
    const t = TEAM[id];
    const dark = ["#e8c547", "#ffffff", "#ffb35c"].includes(t.color);
    return `<svg class="crest-svg" width="${size}" height="${size}" viewBox="0 0 40 44" role="img" aria-label="${esc(t.name)}">
      <path d="M20 1 38 7v14c0 11-8 18-18 22C10 39 2 32 2 21V7Z" fill="${t.color}" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
      <path d="M20 5 34 9.5V21c0 8.5-6 14-14 17.5" fill="rgba(0,0,0,.12)"/>
      <text x="20" y="26" text-anchor="middle" font-family="Bebas Neue, Impact, sans-serif" font-size="13" fill="${dark ? "#111" : "#fff"}">${t.short}</text>
    </svg>`;
  }

  /* ---------------- Router por hash ---------------- */
  const views = $$(".view");
  const menuBtn = $("#menuBtn"), mainnav = $("#mainnav");
  function route() {
    const id = (location.hash || "#inicio").slice(1);
    const view = document.getElementById(id);
    const target = view && view.classList.contains("view") ? id : "inicio";
    views.forEach((v) => v.classList.toggle("active", v.id === target));
    $$(".mainnav a, .bottomnav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + target));
    document.title = `${$("#" + target).dataset.title} · ${CONFIG.club}`;
    mainnav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  menuBtn.addEventListener("click", () => {
    const open = mainnav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  window.addEventListener("hashchange", route);

  /* Pestañas genéricas: activa el botón pulsado y llama a cb(btn) */
  function tabs(container, cb) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", container).forEach((x) => x.classList.toggle("active", x === b));
      cb(b);
    });
  }

  /* ================= PATROCINADORES ================= */
  function renderSponsors() {
    const items = SPONSORS.map((s) => `<span class="sponsor"><b>${esc(s.name)}</b><small>${esc(s.tier)}</small></span>`).join("");
    $("#sponsorTrack").innerHTML = items + items; // duplicado para animación continua
    $("#adHome").innerHTML = `
      <div class="ad">
        <small>Patrocinado</small>
        <strong>${esc(CONFIG.bank.name)}</strong>
        <p>Banco oficial de ${esc(CONFIG.club)}. Paga tus boletos, tienda y colegiaturas por transferencia SPEI.</p>
        <a class="btn btn-ghost" href="#pagos">Ver datos de pago</a>
      </div>`;
  }

  /* ================= PARTIDOS ================= */
  const ourMatches = () => MATCHES.filter((m) => m.home === "sef" || m.away === "sef");
  const nextOurMatch = () => ourMatches().find((m) => !m.played);

  function matchRow(m, compact = false) {
    const h = TEAM[m.home], a = TEAM[m.away];
    let center;
    if (m.played) {
      const res = m.home === "sef" || m.away === "sef"
        ? (() => { const us = m.home === "sef" ? m.hg : m.ag, them = m.home === "sef" ? m.ag : m.hg; return us > them ? "W" : us < them ? "L" : "D"; })()
        : "";
      center = `<div class="score ${res ? "res-" + res : ""}">${m.hg}<i>-</i>${m.ag}</div><small>Final</small>`;
    } else {
      center = `<div class="kick">${fmtTime(m.date)}</div><small>${esc(m.channel)}</small>`;
    }
    return `<article class="match ${compact ? "compact" : ""}">
      <div class="match-meta"><span>Jornada ${m.jornada}</span><span>${fmtDate(m.date)}</span></div>
      <div class="match-body">
        <div class="mt home">${crest(m.home, 34)}<span>${esc(compact ? h.short : h.name)}</span></div>
        <div class="mc">${center}</div>
        <div class="mt away"><span>${esc(compact ? a.short : a.name)}</span>${crest(m.away, 34)}</div>
      </div>
      ${!compact ? `<div class="match-foot"><span>📍 ${esc(m.venue)}</span>${!m.played && m.home === "sef" ? `<a href="#boletos" data-buy="${m.id}">🎟 Boletos</a>` : ""}${!m.played ? `<button class="linkish" data-remind="${m.id}">🔔 Recordarme</button>` : ""}</div>` : ""}
    </article>`;
  }

  function renderNextMatch() {
    const m = nextOurMatch();
    const el = $("#nextMatch");
    if (!m) { el.innerHTML = "<p>Temporada finalizada.</p>"; return; }
    el.innerHTML = `
      <p class="eyebrow">Próximo partido · Jornada ${m.jornada}</p>
      <div class="nm-teams">
        <div>${crest(m.home, 56)}<span>${esc(TEAM[m.home].name)}</span></div>
        <b>VS</b>
        <div>${crest(m.away, 56)}<span>${esc(TEAM[m.away].name)}</span></div>
      </div>
      <p class="nm-info">${fmtDate(m.date, { weekday: "long", day: "numeric", month: "long" })} · ${fmtTime(m.date)}<br />📺 ${esc(m.channel)} · 📍 ${esc(m.venue)}</p>
      <div class="countdown" id="countdown"></div>`;
    const cd = $("#countdown");
    const tick = () => {
      const diff = new Date(m.date) - Date.now();
      if (diff <= 0) { cd.innerHTML = `<a class="btn btn-primary" href="#envivo">¡En juego! Ver en vivo</a>`; return; }
      const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, mi = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      cd.innerHTML = [[d, "días"], [h, "hrs"], [mi, "min"], [s, "seg"]].map(([v, l]) => `<span><b>${String(v).padStart(2, "0")}</b><small>${l}</small></span>`).join("");
    };
    tick();
    setInterval(tick, 1000);
  }

  function renderCalendar(filter = "upcoming") {
    let list;
    if (filter === "upcoming") list = ourMatches().filter((m) => !m.played);
    else if (filter === "past") list = ourMatches().filter((m) => m.played).reverse();
    else list = MATCHES.slice().sort((a, b) => a.jornada - b.jornada);

    if (filter === "league") {
      const byJ = {};
      list.forEach((m) => (byJ[m.jornada] ||= []).push(m));
      $("#calendarList").innerHTML = Object.entries(byJ).map(([j, ms]) =>
        `<h3 class="jornada">Jornada ${j}</h3>${ms.map((m) => matchRow(m, true)).join("")}`).join("");
    } else {
      $("#calendarList").innerHTML = list.map((m) => matchRow(m)).join("") || "<p class='empty'>Sin partidos.</p>";
    }
  }
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-remind]");
    if (r) {
      const m = MATCHES.find((x) => x.id === r.dataset.remind);
      enableNotifications().then((ok) => {
        if (!ok) return;
        const rem = store.get("reminders", []);
        if (!rem.includes(m.id)) rem.push(m.id);
        store.set("reminders", rem);
        toast(`Te avisaremos cuando empiece ${TEAM[m.home].short} vs ${TEAM[m.away].short}.`);
      });
    }
    const b = e.target.closest("[data-buy]");
    if (b) setTimeout(() => { $("#ticketMatch").value = b.dataset.buy; updateTicketTotal(); }, 0);
  });

  /* ================= TABLA ================= */
  function computeStandings() {
    const t = Object.fromEntries(TEAMS.map((x) => [x.id, { id: x.id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] }]));
    MATCHES.filter((m) => m.played).forEach((m) => {
      const H = t[m.home], A = t[m.away];
      H.pj++; A.pj++;
      H.gf += m.hg; H.gc += m.ag; A.gf += m.ag; A.gc += m.hg;
      if (m.hg > m.ag) { H.g++; A.p++; H.pts += 3; H.form.push("W"); A.form.push("L"); }
      else if (m.hg < m.ag) { A.g++; H.p++; A.pts += 3; A.form.push("W"); H.form.push("L"); }
      else { H.e++; A.e++; H.pts++; A.pts++; H.form.push("D"); A.form.push("D"); }
    });
    return Object.values(t).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  }
  function renderStandings() {
    const rows = computeStandings();
    const played = Math.max(...MATCHES.filter((m) => m.played).map((m) => m.jornada));
    $("#tablaSub").textContent = `${CONFIG.league} · Actualizada a la jornada ${played}`;
    $("#standings tbody").innerHTML = rows.map((r, i) => {
      const dg = r.gf - r.gc;
      const cls = [i < 4 ? "q" : i < 6 ? "p" : "", r.id === "sef" ? "us" : ""].join(" ");
      return `<tr class="${cls}">
        <td>${i + 1}</td>
        <td class="left team-cell">${crest(r.id, 24)}<span class="full">${esc(TEAM[r.id].name)}</span><span class="abbr">${TEAM[r.id].short}</span></td>
        <td>${r.pj}</td><td>${r.g}</td><td>${r.e}</td><td>${r.p}</td>
        <td class="hide-sm">${r.gf}</td><td class="hide-sm">${r.gc}</td><td>${dg > 0 ? "+" + dg : dg}</td>
        <td><b>${r.pts}</b></td>
        <td class="hide-sm form">${r.form.slice(-5).map((f) => `<i class="f-${f}">${{ W: "G", D: "E", L: "P" }[f]}</i>`).join("")}</td>
      </tr>`;
    }).join("");
    const pos = rows.findIndex((r) => r.id === "sef") + 1;
    $("#quickPos").textContent = `${pos}° lugar · ${rows[pos - 1].pts} pts`;
  }

  /* ================= PLANTILLA ================= */
  function avatar(p, size = 96) {
    const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
    return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Foto de ${esc(p.name)}">
      <defs><linearGradient id="g${p.n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#7a3600"/></linearGradient></defs>
      <rect width="100" height="100" fill="url(#g${p.n})"/>
      <circle cx="50" cy="40" r="18" fill="rgba(255,255,255,.85)"/>
      <path d="M16 100c4-22 18-32 34-32s30 10 34 32Z" fill="rgba(255,255,255,.85)"/>
      <text x="50" y="47" text-anchor="middle" font-family="Bebas Neue, Impact" font-size="20" fill="#7a3600">${initials}</text>
      <text x="92" y="22" text-anchor="end" font-family="Bebas Neue, Impact" font-size="22" fill="#fff">${p.n}</text>
    </svg>`;
  }
  function renderPlayers(pos = "all") {
    $("#playersGrid").innerHTML = PLAYERS.filter((p) => pos === "all" || p.pos === pos).map((p) => `
      <button class="player" data-player="${p.n}">
        ${avatar(p)}
        <div class="pl-info">
          <span class="pl-num">#${p.n}</span>
          <strong>${esc(p.name)}</strong>
          <small>${p.flag} ${esc(p.pos)} · ${p.age} años</small>
          <div class="pl-mini">${p.pos === "Portero" ? `<span>🧤 ${p.saves}</span>` : `<span>⚽ ${p.goals}</span><span>🅰 ${p.assists}</span>`}<span>🟨 ${p.yellow}</span></div>
        </div>
      </button>`).join("");
  }
  $("#playersGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-player]");
    if (!b) return;
    const p = PLAYERS.find((x) => x.n == b.dataset.player);
    const stat = (v, l) => `<div class="stat"><b>${v}</b><small>${l}</small></div>`;
    openModal(`
      <div class="pl-modal">
        ${avatar(p, 140)}
        <div>
          <p class="eyebrow">${esc(p.pos)} · #${p.n}</p>
          <h2>${esc(p.name)}</h2>
          <p>${p.flag} ${esc(p.nat)} · ${p.age} años · ${p.h} cm · Pie ${esc(p.foot.toLowerCase())}</p>
        </div>
      </div>
      <div class="stats-grid">
        ${stat(p.pj, "Partidos")}${stat(p.min, "Minutos")}
        ${p.pos === "Portero" ? stat(p.saves, "Atajadas") : stat(p.goals, "Goles")}
        ${p.pos === "Portero" ? stat("—", "Asist.") : stat(p.assists, "Asistencias")}
        ${stat(p.yellow, "Amarillas")}${stat(p.red, "Rojas")}
        ${stat(p.rating, "Calificación")}${stat(p.goals ? Math.round(p.min / p.goals) + "'" : "—", "Min/gol")}
      </div>`);
  });

  /* ================= NOTICIAS ================= */
  const NEWS_ART = {
    stadium: ["#ff8a1f", "#3a1a00", "⚽"], sign: ["#1fa2ff", "#082a44", "✍️"], medical: ["#2eb872", "#0b3321", "🩺"],
    press: ["#9b59b6", "#2a1236", "🎙️"], academy: ["#e8c547", "#3b3000", "🏫"], shop: ["#ff5f6d", "#3d0d12", "👕"],
  };
  function newsArt(key) {
    const [c1, c2, emoji] = NEWS_ART[key] || NEWS_ART.stadium;
    return `<div class="news-art" style="--c1:${c1};--c2:${c2}"><span>${emoji}</span></div>`;
  }
  function newsCard(n) {
    return `<button class="news-card" data-news="${n.id}">
      ${newsArt(n.img)}
      <div class="news-body">
        <span class="chip">${esc(n.cat)}</span>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.excerpt)}</p>
        <small>${fmtDate(daysAgo(n.date), { day: "numeric", month: "long" })}</small>
      </div>
    </button>`;
  }
  function renderNews(cat = "Todas") {
    $("#newsGrid").innerHTML = NEWS.filter((n) => cat === "Todas" || n.cat === cat).map(newsCard).join("");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-news]");
    if (!b) return;
    const n = NEWS.find((x) => x.id == b.dataset.news);
    const url = location.href.split("#")[0] + "#noticias";
    openModal(`${newsArt(n.img)}
      <span class="chip">${esc(n.cat)}</span>
      <h2>${esc(n.title)}</h2>
      <small class="muted">${fmtDate(daysAgo(n.date), { weekday: "long", day: "numeric", month: "long" })}</small>
      <p class="article">${esc(n.body)}</p>
      <div class="share">Compartir:
        <a target="_blank" rel="noopener" href="https://x.com/intent/tweet?text=${encodeURIComponent(n.title)}&url=${encodeURIComponent(url)}">X</a>
        <a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.title + " " + url)}">WhatsApp</a>
        <a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
      </div>`);
  });

  /* ================= MULTIMEDIA ================= */
  function mediaThumb(m, i) {
    const hue = (i * 47) % 360;
    return `<div class="media-thumb" style="--h:${hue}">
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="160" height="90" fill="hsl(${hue} 45% 22%)"/>
        <rect x="8" y="8" width="144" height="74" fill="none" stroke="rgba(255,255,255,.25)"/>
        <line x1="80" y1="8" x2="80" y2="82" stroke="rgba(255,255,255,.25)"/>
        <circle cx="80" cy="45" r="14" fill="none" stroke="rgba(255,255,255,.25)"/>
      </svg>
      ${m.type === "video" ? `<span class="play">▶</span><span class="dur">${m.dur}</span>` : `<span class="play cam">📷</span>`}
    </div>`;
  }
  function renderMedia(type = "all") {
    $("#mediaGrid").innerHTML = MEDIA.map((m, i) => ({ m, i })).filter(({ m }) => type === "all" || m.type === type).map(({ m, i }) => `
      <button class="media-item" data-media="${i}">
        ${mediaThumb(m, i)}
        <div><span class="chip">${esc(m.tag)}</span><strong>${esc(m.title)}</strong></div>
      </button>`).join("");
  }
  $("#mediaGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-media]");
    if (!b) return;
    const i = +b.dataset.media, m = MEDIA[i];
    openModal(`<div class="media-big">${mediaThumb(m, i)}</div>
      <h2>${esc(m.title)}</h2>
      <p class="muted">${m.type === "video" ? "Contenido de demostración. Sustituye este espacio por el video de tu canal de YouTube (iframe embed)." : "Fotografía de demostración. Sube tus imágenes en alta resolución a la carpeta assets/."}</p>`);
  });

  /* ================= ESTADÍSTICAS ================= */
  function renderStats() {
    const played = ourMatches().filter((m) => m.played);
    const rnd = seeded(77);
    const per = played.map((m) => {
      const home = m.home === "sef";
      const poss = 48 + Math.floor(rnd() * 18);
      return {
        m, gf: home ? m.hg : m.ag, gc: home ? m.ag : m.hg,
        poss, shots: 9 + Math.floor(rnd() * 9), onT: 3 + Math.floor(rnd() * 5), fouls: 8 + Math.floor(rnd() * 8), corners: 3 + Math.floor(rnd() * 6),
        oShots: 5 + Math.floor(rnd() * 8), oOnT: 1 + Math.floor(rnd() * 4), oFouls: 9 + Math.floor(rnd() * 8), oCorners: 1 + Math.floor(rnd() * 5),
      };
    });
    const sum = (k) => per.reduce((a, x) => a + x[k], 0);
    const avg = (k) => (sum(k) / per.length).toFixed(1);
    const kpi = (v, l) => `<div class="kpi"><b>${v}</b><small>${l}</small></div>`;
    $("#teamKpis").innerHTML = [
      kpi(sum("gf"), "Goles a favor"), kpi(sum("gc"), "Goles en contra"), kpi(avg("poss") + "%", "Posesión media"),
      kpi(avg("shots"), "Remates / partido"), kpi(Math.round((sum("onT") / sum("shots")) * 100) + "%", "Precisión al arco"),
      kpi(avg("fouls"), "Faltas / partido"),
    ].join("");

    const last = per[per.length - 1];
    const bar = (label, a, b, pct) => {
      const pa = pct ? a : Math.round((a / (a + b || 1)) * 100);
      return `<div class="cmp"><div class="cmp-top"><b>${a}${pct ? "%" : ""}</b><span>${label}</span><b>${b}${pct ? "%" : ""}</b></div>
        <div class="cmp-bar"><i style="width:${pa}%"></i><i style="width:${100 - pa}%"></i></div></div>`;
    };
    $("#lastMatchStats").innerHTML = `${matchRow(last.m, true)}
      ${bar("Posesión", last.poss, 100 - last.poss, true)}
      ${bar("Remates", last.m.home === "sef" ? last.shots : last.oShots, last.m.home === "sef" ? last.oShots : last.shots)}
      ${bar("Remates al arco", last.m.home === "sef" ? last.onT : last.oOnT, last.m.home === "sef" ? last.oOnT : last.onT)}
      ${bar("Faltas", last.m.home === "sef" ? last.fouls : last.oFouls, last.m.home === "sef" ? last.oFouls : last.fouls)}
      ${bar("Tiros de esquina", last.m.home === "sef" ? last.corners : last.oCorners, last.m.home === "sef" ? last.oCorners : last.corners)}`;

    const max = Math.max(...per.map((x) => Math.max(x.gf, x.gc)), 1);
    $("#goalsChart").innerHTML = per.map((x) => `
      <div class="bar-col" title="J${x.m.jornada}: ${x.gf} a favor, ${x.gc} en contra">
        <div class="bar-pair"><i class="gf" style="height:${(x.gf / max) * 100}%"></i><i class="gc" style="height:${(x.gc / max) * 100}%"></i></div>
        <small>J${x.m.jornada}</small>
      </div>`).join("") + `<p class="chart-legend"><span class="gf"></span>A favor <span class="gc"></span>En contra</p>`;

    const leaders = (k, icon) => PLAYERS.slice().sort((a, b) => b[k] - a[k]).slice(0, 5)
      .map((p) => `<li><span>${esc(p.name)}</span><small>${esc(p.pos)}</small><b>${icon} ${p[k]}</b></li>`).join("");
    $("#topScorers").innerHTML = leaders("goals", "⚽");
    $("#topAssists").innerHTML = leaders("assists", "🅰");
  }

  /* ================= EN VIVO ================= */
  const live = { timer: null, minute: 0, idx: 0, hg: 0, ag: 0, stats: null, running: false };
  const LIVE_HOME = "sef", LIVE_AWAY = "tib";
  const LIVE_ICONS = { start: "🟢", goal: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", save: "🧤", chance: "💥", half: "⏸️", end: "🏁", info: "📣" };

  function liveReset() {
    clearInterval(live.timer);
    Object.assign(live, { timer: null, minute: 0, idx: 0, hg: 0, ag: 0, running: false, stats: { poss: 50, shots: [0, 0], fouls: [0, 0], cards: [0, 0] } });
    $("#liveHomeCrest").innerHTML = crest(LIVE_HOME, 64);
    $("#liveAwayCrest").innerHTML = crest(LIVE_AWAY, 64);
    $("#liveHomeName").textContent = TEAM[LIVE_HOME].name;
    $("#liveAwayName").textContent = TEAM[LIVE_AWAY].name;
    $("#liveFeed").innerHTML = `<li class="ev ev-info"><span class="min">—</span><span class="ico">📣</span><p>Pulsa “Iniciar transmisión” para seguir el clásico minuto a minuto. Activa 🔔 para recibir alertas de gol.</p></li>`;
    $("#liveStart").textContent = "▶ Iniciar transmisión";
    $("#liveStart").disabled = false;
    liveRender("PREVIA");
  }
  function liveRender(tag) {
    $("#liveHG").textContent = live.hg;
    $("#liveAG").textContent = live.ag;
    $("#liveClock").textContent = `${Math.min(live.minute, 90)}'${live.minute > 90 ? "+" + (live.minute - 90) : ""}`;
    if (tag) {
      $("#liveTag").textContent = tag;
      $("#liveTag").classList.toggle("on", tag === "EN VIVO");
    }
    const s = live.stats;
    const row = (l, a, b) => `<div class="ls"><b>${a}</b><span>${l}</span><b>${b}</b></div>`;
    $("#liveStats").innerHTML = row("Posesión", s.poss + "%", 100 - s.poss + "%") + row("Remates", s.shots[0], s.shots[1]) + row("Faltas", s.fouls[0], s.fouls[1]) + row("Tarjetas", s.cards[0], s.cards[1]);
    const ball = $("#liveBall");
    ball.style.left = `${20 + Math.random() * 60}%`;
    ball.style.top = `${15 + Math.random() * 70}%`;
  }
  function liveStep() {
    live.minute++;
    const s = live.stats;
    s.poss = Math.max(38, Math.min(66, s.poss + Math.round((Math.random() - 0.4) * 3)));
    if (Math.random() < 0.12) s.fouls[Math.random() < 0.5 ? 0 : 1]++;
    let tag = "EN VIVO";
    while (live.idx < LIVE_SCRIPT.length && LIVE_SCRIPT[live.idx].m <= live.minute) {
      const ev = LIVE_SCRIPT[live.idx++];
      const side = ev.team === "home" ? 0 : 1;
      if (["goal", "chance", "save"].includes(ev.t)) s.shots[ev.t === "save" ? 1 - side : side]++;
      if (ev.t === "yellow" || ev.t === "red") { s.cards[side]++; s.fouls[side]++; }
      if (ev.t === "goal") {
        ev.team === "home" ? live.hg++ : live.ag++;
        const scorer = ev.team === "home" ? TEAM[LIVE_HOME].short : TEAM[LIVE_AWAY].short;
        notify(`⚽ ¡Gol de ${scorer}! ${ev.m}'`, `${ev.player} · ${TEAM[LIVE_HOME].short} ${live.hg}-${live.ag} ${TEAM[LIVE_AWAY].short}`);
        document.querySelector(".scoreboard").classList.remove("flash");
        void document.querySelector(".scoreboard").offsetWidth;
        document.querySelector(".scoreboard").classList.add("flash");
      }
      if (ev.t === "half") tag = "MEDIO TIEMPO";
      if (ev.t === "end") tag = "FINAL";
      const li = document.createElement("li");
      li.className = `ev ev-${ev.t}`;
      li.innerHTML = `<span class="min">${ev.m}'</span><span class="ico">${LIVE_ICONS[ev.t]}</span><p>${esc(ev.txt)}</p>`;
      const feed = $("#liveFeed");
      if (live.idx === 1) feed.innerHTML = "";
      feed.prepend(li);
      if (ev.t === "start") notify("🟢 ¡Comenzó el partido!", `${TEAM[LIVE_HOME].name} vs ${TEAM[LIVE_AWAY].name}`);
      if (ev.t === "end") {
        clearInterval(live.timer);
        live.running = false;
        $("#liveStart").textContent = "Partido finalizado";
        $("#liveStart").disabled = true;
        notify("🏁 Final del partido", `${TEAM[LIVE_HOME].short} ${live.hg}-${live.ag} ${TEAM[LIVE_AWAY].short}`);
      }
    }
    liveRender(tag);
  }
  $("#liveStart").addEventListener("click", () => {
    if (live.running) {
      clearInterval(live.timer);
      live.running = false;
      $("#liveStart").textContent = "▶ Reanudar";
      return;
    }
    live.running = true;
    $("#liveStart").textContent = "⏸ Pausar";
    if (live.minute === 0) { live.minute = -1; liveStep(); }
    live.timer = setInterval(liveStep, 700); // 1 minuto de juego ≈ 0.7 s
  });
  $("#liveReset").addEventListener("click", liveReset);

  /* ================= FORO ================= */
  const BAD_WORDS = ["idiota", "estupido", "estúpido", "pendejo", "imbecil", "imbécil", "mierda", "puto", "pinche", "cabron", "cabrón"];
  const censor = (txt) => BAD_WORDS.reduce((t, w) => t.replace(new RegExp(`\\b${w}\\b`, "gi"), "★".repeat(w.length)), txt);
  const SEED_COMMENTS = [
    { id: "s1", topic: "Alineaciones", author: "NaranjaDeCorazón", text: "Para el clásico pondría a Camacho de inicio, está en gran momento.", ts: Date.now() - 36e5 * 5, likes: 12 },
    { id: "s2", topic: "Alineaciones", author: "Toño_Elite", text: "Sin Molina la defensa sufre. Ojalá Ochoa aproveche la oportunidad.", ts: Date.now() - 36e5 * 9, likes: 7 },
    { id: "s3", topic: "Director técnico", author: "Lupita SEFC", text: "El cambio táctico al medio tiempo del último partido fue clave. ¡Bien profe!", ts: Date.now() - 36e5 * 20, likes: 21 },
    { id: "s4", topic: "Fichajes y rumores", author: "ElVisor", text: "Se dice que viene un 9 de Sudamérica para el próximo torneo 👀", ts: Date.now() - 36e5 * 30, likes: 15 },
    { id: "s5", topic: "General", author: "Familia Ruiz", text: "¡Excelente ambiente en el estadio! Llevamos a los niños de la Academia.", ts: Date.now() - 36e5 * 48, likes: 9 },
  ];
  let forumTopic = "Alineaciones";
  const allComments = () => store.get("comments", []).concat(SEED_COMMENTS);
  function timeAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 6e4);
    if (m < 1) return "ahora";
    if (m < 60) return `hace ${m} min`;
    if (m < 1440) return `hace ${Math.floor(m / 60)} h`;
    return `hace ${Math.floor(m / 1440)} d`;
  }
  function renderComments() {
    const liked = store.get("liked", []);
    const list = allComments().filter((c) => c.topic === forumTopic).sort((a, b) => b.ts - a.ts);
    $("#comments").innerHTML = list.map((c) => `
      <li class="comment">
        <div class="c-avatar">${esc(c.author[0].toUpperCase())}</div>
        <div class="c-body">
          <div class="c-head"><strong>${esc(c.author)}</strong><small>${timeAgo(c.ts)}</small></div>
          <p>${esc(c.text)}</p>
          <div class="c-actions">
            <button class="linkish ${liked.includes(c.id) ? "liked" : ""}" data-like="${c.id}">👍 ${c.likes + (liked.includes(c.id) ? 1 : 0)}</button>
            <button class="linkish" data-report="${c.id}">🚩 Reportar</button>
          </div>
        </div>
      </li>`).join("") || "<li class='empty'>Sé el primero en comentar.</li>";
  }
  $("#forumForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const raw = f.get("text").trim();
    if (raw.length < 3) return toast("El comentario es muy corto.", "error");
    const list = store.get("comments", []);
    list.push({ id: uid(), topic: forumTopic, author: censor(f.get("author").trim()), text: censor(raw), ts: Date.now(), likes: 0 });
    store.set("comments", list);
    e.target.text.value = "";
    renderComments();
    toast("Comentario publicado.");
  });
  $("#comments").addEventListener("click", (e) => {
    const l = e.target.closest("[data-like]");
    if (l) {
      const liked = store.get("liked", []);
      const i = liked.indexOf(l.dataset.like);
      i >= 0 ? liked.splice(i, 1) : liked.push(l.dataset.like);
      store.set("liked", liked);
      renderComments();
    }
    if (e.target.closest("[data-report]")) toast("Gracias. Un moderador revisará el comentario.");
  });
  $("#rulesLink").addEventListener("click", (e) => {
    e.preventDefault();
    openModal(`<h2>Reglas de la comunidad</h2><ol class="steps">
      <li>Respeta a jugadores, cuerpo técnico, árbitros y otros aficionados.</li>
      <li>Sin insultos, discriminación ni lenguaje violento (se filtran automáticamente).</li>
      <li>Sin spam ni publicidad no autorizada.</li>
      <li>No compartas datos personales de terceros.</li>
      <li>Los moderadores pueden ocultar mensajes que incumplan estas reglas.</li></ol>`);
  });

  /* ================= PAGOS (núcleo compartido) ================= */
  const CONCEPT_LABEL = { tienda: "Tienda", boletos: "Boletos", abono: "Abono", academia: "Academia" };
  const STATUS = { pendiente: "Pendiente de pago", revision: "Comprobante en revisión", pagado: "Pagado" };

  function bankBlock(compact) {
    const b = CONFIG.bank;
    const row = (l, v, raw) => `<div class="bk-row"><small>${l}</small><span class="mono">${v}</span>${raw ? `<button class="copy" data-copy="${raw}" aria-label="Copiar ${l}">Copiar</button>` : ""}</div>`;
    return `<div class="bank ${compact ? "compact" : ""}">
      <div class="bk-logo"><svg viewBox="0 0 48 32" width="44" height="30" aria-hidden="true"><ellipse cx="24" cy="18" rx="20" ry="12" fill="none" stroke="#fff" stroke-width="4"/><ellipse cx="24" cy="18" rx="9" ry="6" fill="#fff"/><path d="M14 8c4-6 16-6 20 0" fill="none" stroke="#fff" stroke-width="4"/></svg><b>${esc(b.name)}</b></div>
      ${row("CUENTA", group(b.account, 4), b.account)}
      ${row("CLABE", group(b.clabe.slice(0, 12), 4) + " " + b.clabe.slice(12), b.clabe)}
      ${row("BENEFICIARIO", esc(b.holder), b.holder)}
    </div>`;
  }
  document.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-copy]");
    if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copy); }
    catch {
      const ta = Object.assign(document.createElement("textarea"), { value: c.dataset.copy });
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    c.textContent = "¡Copiado!";
    setTimeout(() => (c.textContent = "Copiar"), 1500);
  });

  function createOrder(type, title, amount, details = {}) {
    const prefix = { tienda: "TD", boletos: "BO", abono: "AB", academia: "AC" }[type];
    const order = { ref: `SE-${prefix}-${uid()}`, type, title, amount, details, status: "pendiente", ts: Date.now() };
    const list = store.get("orders", []);
    list.unshift(order);
    store.set("orders", list);
    renderPayments();
    showPayment(order);
    return order;
  }
  function updateOrder(ref, patch) {
    const list = store.get("orders", []);
    const o = list.find((x) => x.ref === ref);
    if (!o) return;
    Object.assign(o, patch);
    store.set("orders", list);
    renderPayments();
    renderRoster();
    renderMyTickets();
  }
  function showPayment(o) {
    const msg = `Hola, envío comprobante de pago.\nReferencia: ${o.ref}\nConcepto: ${o.title}\nMonto: ${money(o.amount)}`;
    openModal(`
      <p class="eyebrow">${CONCEPT_LABEL[o.type]} · ${STATUS[o.status]}</p>
      <h2>Completa tu pago</h2>
      <p>${esc(o.title)}</p>
      <div class="pay-amount"><small>Total a pagar</small><b>${money(o.amount)}</b></div>
      <div class="pay-ref"><small>Referencia (escríbela en el concepto)</small><span class="mono">${o.ref}</span><button class="copy" data-copy="${o.ref}">Copiar</button></div>
      ${bankBlock(true)}
      <div class="pay-actions">
        <a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}">Enviar comprobante por WhatsApp</a>
        <label class="btn btn-ghost file-btn">Subir comprobante<input type="file" accept="image/*,application/pdf" data-proof="${o.ref}" hidden /></label>
      </div>
      <p class="hint">Tu pedido queda reservado 48 h. Al validar el depósito el estado cambiará a <b>Pagado</b>.</p>`);
  }
  document.addEventListener("change", (e) => {
    const inp = e.target.closest("[data-proof]");
    if (!inp || !inp.files[0]) return;
    const file = inp.files[0];
    if (file.size > 4 * 1024 * 1024) return toast("El archivo supera 4 MB.", "error");
    updateOrder(inp.dataset.proof, { status: "revision", proofName: file.name, proofTs: Date.now() });
    toast("Comprobante recibido. Lo revisaremos en breve.");
    closeAll();
  });

  function renderPayments() {
    const list = store.get("orders", []);
    $("#paymentsList").innerHTML = list.map((o) => `
      <li>
        <div><strong>${esc(o.title)}</strong><small class="mono">${o.ref} · ${fmtDate(o.ts, { day: "numeric", month: "short" })}</small></div>
        <div class="pay-right"><b>${money(o.amount)}</b><button class="status st-${o.status}" data-order="${o.ref}">${STATUS[o.status]}</button></div>
      </li>`).join("") || "<li class='empty'>Aún no tienes pagos registrados.</li>";
  }
  $("#paymentsList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-order]");
    if (b) showPayment(store.get("orders", []).find((o) => o.ref === b.dataset.order));
  });

  /* ================= TIENDA ================= */
  const PRODUCT_ICON = {
    shirt: "M30 10 18 16l5 12 7-3v35h40V25l7 3 5-12-12-6c-2 6-8 10-15 10s-13-4-15-10Z",
    hoodie: "M30 10 16 18l5 14 9-4v32h40V28l9 4 5-14-14-8c0 8-9 14-20 14S30 18 30 10Zm8 4c3 6 7 8 12 8s9-2 12-8",
    pants: "M30 10h40l4 60H56L50 34l-6 36H26Z",
    ball: "M50 12a38 38 0 1 0 0 76 38 38 0 0 0 0-76Zm0 18 14 10-5 17H41l-5-17Z",
    scarf: "M14 30h72v16H14Zm8 16v30l8-4 8 4V46m24 0v30l8-4 8 4V46",
    cap: "M18 60c0-22 14-36 32-36s32 14 32 36Zm-6 0h80v8H12Z",
    bottle: "M42 10h16v10l6 8v60H36V28l6-8Z",
  };
  const productSvg = (p) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${PRODUCT_ICON[p.icon]}" fill="${p.color}" stroke="${p.color === "#ffffff" ? "#222" : "rgba(255,255,255,.35)"}" stroke-width="2" fill-rule="evenodd"/></svg>`;
  function renderShop(cat = "Todo") {
    $("#products").innerHTML = PRODUCTS.filter((p) => cat === "Todo" || p.cat === cat).map((p) => `
      <article class="product card">
        <div class="product-img">${productSvg(p)}</div>
        <small class="muted">${esc(p.cat)}</small>
        <h3>${esc(p.name)}</h3>
        <b class="price">${money(p.price)}</b>
        <div class="product-actions">
          <select aria-label="Talla" data-size="${p.id}">${p.sizes.map((s) => `<option>${s}</option>`).join("")}</select>
          <button class="btn btn-primary" data-add="${p.id}">Agregar</button>
        </div>
      </article>`).join("");
  }
  let cart = store.get("cart", []);
  function saveCart() { store.set("cart", cart); renderCart(); }
  function renderCart() {
    const count = cart.reduce((a, i) => a + i.qty, 0);
    $("#cartCount").textContent = count;
    $("#cartCount").hidden = count === 0;
    const total = cart.reduce((a, i) => a + i.qty * PRODUCTS.find((p) => p.id === i.id).price, 0);
    $("#cartItems").innerHTML = cart.map((i, idx) => {
      const p = PRODUCTS.find((x) => x.id === i.id);
      return `<li>
        <div class="ci-img">${productSvg(p)}</div>
        <div class="ci-info"><strong>${esc(p.name)}</strong><small>Talla ${esc(i.size)} · ${money(p.price)}</small></div>
        <div class="qty"><button data-q="${idx}" data-d="-1" aria-label="Menos">−</button><span>${i.qty}</span><button data-q="${idx}" data-d="1" aria-label="Más">+</button></div>
      </li>`;
    }).join("") || "<li class='empty'>Tu carrito está vacío.</li>";
    $("#cartTotal").textContent = money(total);
    $("#checkoutBtn").disabled = !cart.length;
    return total;
  }
  $("#products").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const size = $(`[data-size="${b.dataset.add}"]`).value;
    const found = cart.find((i) => i.id === b.dataset.add && i.size === size);
    found ? found.qty++ : cart.push({ id: b.dataset.add, size, qty: 1 });
    saveCart();
    toast("Producto agregado al carrito.");
  });
  $("#cartItems").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (!b) return;
    const i = cart[+b.dataset.q];
    i.qty += +b.dataset.d;
    if (i.qty <= 0) cart.splice(+b.dataset.q, 1);
    saveCart();
  });
  $("#cartBtn").addEventListener("click", () => {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    document.body.classList.add("lock");
  });
  $("#checkoutBtn").addEventListener("click", () => {
    const total = renderCart();
    const items = cart.map((i) => `${i.qty}× ${PRODUCTS.find((p) => p.id === i.id).name} (${i.size})`);
    closeAll();
    createOrder("tienda", `Pedido tienda: ${items.join(", ")}`, total, { items: cart.slice() });
    cart = [];
    saveCart();
  });

  /* ================= BOLETOS ================= */
  const homeUpcoming = () => ourMatches().filter((m) => !m.played && m.home === "sef");
  function renderTickets() {
    $("#ticketMatch").innerHTML = homeUpcoming().map((m) =>
      `<option value="${m.id}">J${m.jornada} · vs ${esc(TEAM[m.away].name)} — ${fmtDate(m.date)} ${fmtTime(m.date)}</option>`).join("");
    $("#ticketZones").innerHTML = TICKET_ZONES.map((z, i) => `
      <label class="zone"><input type="radio" name="zone" value="${z.id}" ${i === 1 ? "checked" : ""} />
        <span><b>${esc(z.name)}</b><small>${esc(z.desc)}</small><em>${money(z.price)}</em></span></label>`).join("");
    $("#seasonPasses").innerHTML = SEASON_PASSES.map((s) => `
      <div class="card pass"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><b class="price">${money(s.price)}</b>
      <button class="btn btn-primary" data-pass="${s.id}">Comprar abono</button></div>`).join("");
    updateTicketTotal();
  }
  function updateTicketTotal() {
    const f = $("#ticketForm");
    const z = TICKET_ZONES.find((x) => x.id === f.zone.value);
    const qty = Math.max(1, Math.min(10, +f.qty.value || 1));
    $("#ticketTotal").textContent = `${qty} × ${money(z.price)} = ${money(qty * z.price)}`;
    return { z, qty };
  }
  $("#ticketForm").addEventListener("input", updateTicketTotal);
  $("#ticketForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const { z, qty } = updateTicketTotal();
    const m = MATCHES.find((x) => x.id === f.match.value);
    createOrder("boletos", `${qty} boleto(s) ${z.name} · vs ${TEAM[m.away].name} (J${m.jornada})`, qty * z.price,
      { match: m.id, zone: z.id, qty, name: f.name.value, email: f.email.value, phone: f.phone.value });
    renderMyTickets();
  });
  $("#seasonPasses").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pass]");
    if (!b) return;
    const s = SEASON_PASSES.find((x) => x.id === b.dataset.pass);
    createOrder("abono", `${s.name} · Temporada ${new Date().getFullYear()}`, s.price, { pass: s.id });
    renderMyTickets();
  });
  function renderMyTickets() {
    const list = store.get("orders", []).filter((o) => o.type === "boletos" || o.type === "abono");
    $("#myTickets").innerHTML = list.map((o) => `
      <div class="ticket ${o.status === "pagado" ? "valid" : ""}">
        <div><strong>${esc(o.title)}</strong><small class="mono">${o.ref}</small></div>
        ${o.status === "pagado"
          ? `<div class="qr" aria-label="Código de acceso">${qrSvg(o.ref)}</div>`
          : `<button class="status st-${o.status}" data-order="${o.ref}">${STATUS[o.status]}</button>`}
      </div>`).join("") || "<p class='empty'>Aún no has comprado boletos.</p>";
  }
  $("#myTickets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-order]");
    if (b) showPayment(store.get("orders", []).find((o) => o.ref === b.dataset.order));
  });
  // Código visual de acceso (patrón determinista a partir de la referencia)
  function qrSvg(text) {
    const r = seeded([...text].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    let cells = "";
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
      const bx = x > 7 ? x - 8 : x, by = y > 7 ? y - 8 : y;
      const finder = bx < 5 && by < 5 && !(x > 7 && y > 7);
      const on = finder ? bx === 0 || bx === 4 || by === 0 || by === 4 || (bx === 2 && by === 2) : r() > 0.5;
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
    return `<svg viewBox="-1 -1 15 15" width="72" height="72"><rect x="-1" y="-1" width="15" height="15" fill="#fff"/><g fill="#111">${cells}</g></svg>`;
  }

  /* ================= ACADEMIA ================= */
  const CATEGORIES = [
    { id: "Sub-8", min: 5, max: 7 }, { id: "Sub-10", min: 8, max: 9 }, { id: "Sub-12", min: 10, max: 11 },
    { id: "Sub-14", min: 12, max: 13 }, { id: "Sub-17", min: 14, max: 17 }, { id: "Femenil", min: 8, max: 17 },
  ];
  const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = (k) => { const [y, m] = k.split("-"); return `${MONTHS[+m - 1]} ${y}`; };
  const ageFrom = (dob) => { const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  let enrollPhoto = null;

  function renderAcademy() {
    const f = CONFIG.fees;
    const kpi = (v, l) => `<div class="kpi"><b>${money(v)}</b><small>${l}</small></div>`;
    $("#feeCards").innerHTML = kpi(f.inscripcion, "Inscripción (pago único)") + kpi(f.colegiatura, "Colegiatura mensual") + kpi(f.uniforme, "Uniforme oficial");
    $("#enrollCat").innerHTML = CATEGORIES.map((c) => `<option>${c.id}</option>`).join("");
    $("#uniformPrice").textContent = money(f.uniforme);
    // meses: 2 anteriores, actual y 3 siguientes
    const now = new Date();
    $("#tuitionMonth").innerHTML = [-2, -1, 0, 1, 2, 3].map((o) => {
      const k = monthKey(new Date(now.getFullYear(), now.getMonth() + o, 1));
      return `<option value="${k}" ${o === 0 ? "selected" : ""}>${monthLabel(k)}</option>`;
    }).join("");
    updateEnrollTotal();
    renderTuitionPlayers();
    renderRoster();
  }
  function updateEnrollTotal() {
    const f = CONFIG.fees;
    const t = f.inscripcion + f.colegiatura + ($("#enrollForm").uniform.checked ? f.uniforme : 0);
    $("#enrollTotal").textContent = `Total: ${money(t)}`;
    return t;
  }
  tabs($("#acadTabs"), (b) => $$("#academia .pane").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.pane)));

  $("#enrollForm").addEventListener("input", (e) => {
    if (e.target.name === "dob" && e.target.value) {
      const a = ageFrom(e.target.value);
      const c = CATEGORIES.find((x) => a >= x.min && a <= x.max);
      if (c) $("#enrollCat").value = c.id;
    }
    updateEnrollTotal();
  });
  $("#enrollPhoto").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      // recortar a cuadrado 240px para ahorrar espacio
      const S = 240, c = document.createElement("canvas");
      c.width = c.height = S;
      const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, S, S);
      enrollPhoto = c.toDataURL("image/jpeg", 0.8);
      $("#enrollPreview").src = enrollPhoto;
      $("#enrollPreview").hidden = false;
      $("#enrollPhotoTxt").hidden = true;
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => toast("No se pudo leer la imagen.", "error");
    img.src = URL.createObjectURL(file);
  });
  $("#enrollForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (!enrollPhoto) return toast("Agrega la fotografía del jugador.", "error");
    const age = ageFrom(f.dob.value);
    if (age < 4 || age > 18) return toast("La Academia recibe jugadores de 5 a 17 años.", "error");
    const st = {
      id: uid(), name: f.name.value.trim(), dob: f.dob.value, cat: f.cat.value, pos: f.pos.value,
      curp: f.curp.value.trim().toUpperCase(), tutor: f.tutor.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), medical: f.medical.value.trim(), photo: enrollPhoto, ts: Date.now(),
    };
    const students = store.get("students", []);
    students.push(st);
    if (!store.set("students", students)) return;
    const parts = [`Inscripción`, `Colegiatura ${monthLabel(monthKey())}`].concat(f.uniform.checked ? ["Uniforme"] : []);
    createOrder("academia", `${st.name} (${st.cat}): ${parts.join(" + ")}`, updateEnrollTotal(), {
      student: st.id, concepts: ["inscripcion", "colegiatura:" + monthKey()].concat(f.uniform.checked ? ["uniforme"] : []),
    });
    f.reset();
    enrollPhoto = null;
    $("#enrollPreview").hidden = true;
    $("#enrollPhotoTxt").hidden = false;
    updateEnrollTotal();
    renderTuitionPlayers();
    renderRoster();
  });

  function renderTuitionPlayers() {
    const students = store.get("students", []);
    $("#tuitionPlayer").innerHTML = students.map((s) => `<option value="${s.id}">${esc(s.name)} · ${esc(s.cat)}</option>`).join("");
    $("#tuitionEmpty").hidden = students.length > 0;
    $("#tuitionForm button").disabled = !students.length;
    updateTuitionTotal();
  }
  function updateTuitionTotal() {
    const concept = $("#tuitionConcept").value;
    $("#tuitionMonth").closest("label").hidden = concept !== "colegiatura";
    $("#tuitionTotal").textContent = money(CONFIG.fees[concept]);
  }
  $("#tuitionForm").addEventListener("input", updateTuitionTotal);
  $("#tuitionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const st = store.get("students", []).find((s) => s.id === f.player.value);
    if (!st) return;
    const concept = f.concept.value;
    const key = concept === "colegiatura" ? `colegiatura:${f.month.value}` : concept;
    const dup = store.get("orders", []).find((o) => o.details.student === st.id && o.details.concepts?.includes(key));
    if (dup) { toast(`Ya existe una referencia para ese concepto (${STATUS[dup.status]}).`, "error"); return showPayment(dup); }
    const label = concept === "colegiatura" ? `Colegiatura ${monthLabel(f.month.value)}` : concept === "inscripcion" ? "Inscripción" : "Uniforme";
    createOrder("academia", `${st.name} (${st.cat}): ${label}`, CONFIG.fees[concept], { student: st.id, concepts: [key] });
  });

  // Estado de pagos de un alumno a partir de sus órdenes
  function studentStatus(st) {
    const orders = store.get("orders", []).filter((o) => o.details.student === st.id);
    const has = (key) => orders.find((o) => o.details.concepts?.includes(key));
    const ins = has("inscripcion");
    const col = has("colegiatura:" + monthKey());
    const ok = ins?.status === "pagado" && col?.status === "pagado";
    return { orders, ins, col, ok };
  }
  function renderRoster() {
    const q = ($("#dbSearch").value || "").toLowerCase();
    const filter = $("#dbFilter").value;
    const students = store.get("students", []);
    const rows = students.map((s) => ({ s, st: studentStatus(s) }))
      .filter(({ s }) => !q || [s.name, s.tutor, s.cat, s.pos].join(" ").toLowerCase().includes(q))
      .filter(({ st }) => filter === "all" || (filter === "aldia" ? st.ok : !st.ok));
    $("#roster").innerHTML = rows.map(({ s, st }) => `
      <button class="student card" data-student="${s.id}">
        <img src="${s.photo}" alt="Foto de ${esc(s.name)}" width="64" height="64" />
        <div class="grow">
          <strong>${esc(s.name)}</strong>
          <small>${esc(s.cat)} · ${esc(s.pos)} · ${ageFrom(s.dob)} años</small>
          <small>Tutor: ${esc(s.tutor)} · ${esc(s.phone)}</small>
        </div>
        <span class="status ${st.ok ? "st-pagado" : "st-pendiente"}">${st.ok ? "Al corriente" : "Con adeudo"}</span>
      </button>`).join("") || `<p class="empty">${students.length ? "Sin resultados." : "Aún no hay jugadores inscritos. Usa la pestaña Inscripción."}</p>`;
  }
  $("#dbSearch").addEventListener("input", renderRoster);
  $("#dbFilter").addEventListener("change", renderRoster);
  $("#roster").addEventListener("click", (e) => {
    const b = e.target.closest("[data-student]");
    if (b) showStudent(b.dataset.student);
  });
  function showStudent(id) {
    const s = store.get("students", []).find((x) => x.id === id);
    if (!s) return;
    const st = studentStatus(s);
    openModal(`
      <div class="pl-modal">
        <img src="${s.photo}" alt="" width="120" height="120" class="round" />
        <div>
          <p class="eyebrow">${esc(s.cat)} · ${esc(s.pos)}</p>
          <h2>${esc(s.name)}</h2>
          <p>${ageFrom(s.dob)} años · Nac. ${fmtDate(s.dob + "T12:00", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
      <dl class="dl">
        <dt>Tutor</dt><dd>${esc(s.tutor)}</dd>
        <dt>Teléfono</dt><dd>${esc(s.phone)}</dd>
        <dt>Correo</dt><dd>${esc(s.email)}</dd>
        ${s.curp ? `<dt>CURP</dt><dd class="mono">${esc(s.curp)}</dd>` : ""}
        <dt>Datos médicos</dt><dd>${esc(s.medical || "—")}</dd>
        <dt>ID</dt><dd class="mono">${s.id}</dd>
      </dl>
      <h3>Pagos</h3>
      <ul class="payments">${st.orders.map((o) => `
        <li><div><strong>${esc(o.title.split(": ").pop())}</strong><small class="mono">${o.ref}${o.proofName ? " · 📎 " + esc(o.proofName) : ""}</small></div>
        <div class="pay-right"><b>${money(o.amount)}</b>
          ${o.status === "pagado" ? `<span class="status st-pagado">Pagado</span>` : `<button class="status st-${o.status}" data-mark="${o.ref}" data-sid="${s.id}" title="Validar depósito">✔ Validar pago</button>`}
        </div></li>`).join("") || "<li class='empty'>Sin pagos.</li>"}</ul>
      <div class="pay-actions"><button class="btn btn-ghost danger" data-del="${s.id}">Eliminar registro</button></div>`);
  }
  document.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mark]");
    if (m) {
      updateOrder(m.dataset.mark, { status: "pagado", paidTs: Date.now() });
      toast("Pago validado.");
      showStudent(m.dataset.sid);
    }
    const d = e.target.closest("[data-del]");
    if (d && confirm("¿Eliminar este jugador de la base de datos? Esta acción no se puede deshacer.")) {
      store.set("students", store.get("students", []).filter((s) => s.id !== d.dataset.del));
      closeAll();
      renderTuitionPlayers();
      renderRoster();
      toast("Registro eliminado.");
    }
  });
  $("#dbExport").addEventListener("click", () => {
    const students = store.get("students", []);
    if (!students.length) return toast("No hay registros para exportar.", "error");
    const head = ["ID", "Nombre", "Nacimiento", "Edad", "Categoría", "Posición", "CURP", "Tutor", "Teléfono", "Correo", "Médico", "Inscripción", `Colegiatura ${monthLabel(monthKey())}`];
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = students.map((s) => {
      const st = studentStatus(s);
      return [s.id, s.name, s.dob, ageFrom(s.dob), s.cat, s.pos, s.curp, s.tutor, s.phone, s.email, s.medical, st.ins?.status || "sin referencia", st.col?.status || "sin referencia"].map(cell).join(",");
    });
    const blob = new Blob(["﻿" + [head.map(cell).join(",")].concat(lines).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `academia-elite-${monthKey()}.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ================= NOTIFICACIONES PUSH ================= */
  let swReg = null;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then((r) => (swReg = r)).catch(() => {});
  }
  function refreshNotifBtn() {
    const on = "Notification" in window && Notification.permission === "granted";
    $("#notifBtn").classList.toggle("on", on);
    $("#notifDot").hidden = !on;
    $("#notifBtn").title = on ? "Notificaciones activadas" : "Activar notificaciones";
  }
  async function enableNotifications() {
    if (!("Notification" in window)) { toast("Tu navegador no soporta notificaciones.", "error"); return false; }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") { toast("Las notificaciones están bloqueadas en la configuración del navegador.", "error"); return false; }
    const p = await Notification.requestPermission();
    refreshNotifBtn();
    if (p === "granted") { notify("🔔 Notificaciones activadas", "Te avisaremos al inicio de cada partido y en cada gol."); return true; }
    return false;
  }
  function notify(title, body) {
    toast(`${title} — ${body}`, "live");
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opts = { body, icon: "assets/icon.svg", badge: "assets/icon.svg", tag: title, vibrate: [120, 60, 120] };
    if (swReg) swReg.showNotification(title, opts).catch(() => new Notification(title, opts));
    else new Notification(title, opts);
  }
  $("#notifBtn").addEventListener("click", () => {
    if ("Notification" in window && Notification.permission === "granted") toast("Las notificaciones ya están activadas.");
    else enableNotifications();
  });
  // Recordatorios de partidos: revisa cada 30 s si algún partido marcado ya comenzó
  function checkReminders() {
    const rem = store.get("reminders", []);
    const due = rem.filter((id) => { const m = MATCHES.find((x) => x.id === id); return m && new Date(m.date) <= Date.now(); });
    due.forEach((id) => { const m = MATCHES.find((x) => x.id === id); notify("🟢 ¡Comienza el partido!", `${TEAM[m.home].name} vs ${TEAM[m.away].name} · ${m.channel}`); });
    if (due.length) store.set("reminders", rem.filter((id) => !due.includes(id)));
  }
  setInterval(checkReminders, 30000);

  /* ================= REDES / PIE ================= */
  const SOCIAL_ICON = {
    x: "M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.5 3h6.4l4.4 5.9ZM16.4 19.2h1.7L7 4.7H5.2Z",
    instagram: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2c-2.7 0-3.1 0-4.1.1C4.3 2.3 2.3 4.3 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.2 3.6 2.2 5.6 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.6-.2 5.6-2.2 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.2-3.6-2.2-5.6-5.8-5.8C15.1 2 14.7 2 12 2Z",
    tiktok: "M16.6 2h-3.3v13.3a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .8.1V9.1a6.2 6.2 0 1 0 5.4 6.2V8.6a7.6 7.6 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.7Z",
    youtube: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15V9l5.8 3Z",
    facebook: "M14 8V6.2c0-.8.2-1.2 1.4-1.2H17V2h-2.6C11.3 2 10 3.5 10 6v2H8v3h2v11h4V11h2.7l.3-3Z",
  };
  function renderSocial() {
    $("#socialLinks").innerHTML = CONFIG.social.map((s) => `
      <a class="soc soc-${s.id}" href="${s.url}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">
        <svg viewBox="0 0 24 24"><path d="${SOCIAL_ICON[s.id]}"/></svg><span><b>${esc(s.name)}</b><small>${esc(s.handle)}</small></span>
      </a>`).join("");
    $("#footerInfo").textContent = `${CONFIG.league} · ${CONFIG.stadium}, ${CONFIG.city} · ${CONFIG.email}`;
    $("#year").textContent = new Date().getFullYear();
  }

  /* ================= INICIO ================= */
  function renderHome() {
    $("#heroLeague").textContent = `${CONFIG.league} · Temporada ${new Date().getFullYear()}`;
    $("#homeNews").innerHTML = NEWS.slice(0, 3).map(newsCard).join("");
    $("#homeResults").innerHTML = ourMatches().filter((m) => m.played).slice(-3).reverse().map((m) => matchRow(m)).join("");
    $("#bankCard").innerHTML = bankBlock(false);
  }

  /* ================= ARRANQUE ================= */
  const cats = ["Todas", ...new Set(NEWS.map((n) => n.cat))];
  $("#newsTabs").innerHTML = cats.map((c, i) => `<button class="${i ? "" : "active"}">${esc(c)}</button>`).join("");
  const shopCats = ["Todo", ...new Set(PRODUCTS.map((p) => p.cat))];
  $("#shopTabs").innerHTML = shopCats.map((c, i) => `<button class="${i ? "" : "active"}">${esc(c)}</button>`).join("");

  tabs($("#calTabs"), (b) => renderCalendar(b.dataset.filter));
  tabs($("#posTabs"), (b) => renderPlayers(b.dataset.pos));
  tabs($("#newsTabs"), (b) => renderNews(b.textContent));
  tabs($("#mediaTabs"), (b) => renderMedia(b.dataset.type));
  tabs($("#forumTabs"), (b) => { forumTopic = b.dataset.topic; renderComments(); });
  tabs($("#shopTabs"), (b) => renderShop(b.textContent));

  renderSponsors();
  renderHome();
  renderNextMatch();
  renderCalendar();
  renderStandings();
  renderPlayers();
  renderNews();
  renderMedia();
  renderStats();
  liveReset();
  renderComments();
  renderShop();
  renderCart();
  renderTickets();
  renderMyTickets();
  renderAcademy();
  renderPayments();
  renderSocial();
  refreshNotifBtn();
  checkReminders();
  route();
})();
