/* =========================================================
   SoccerElite — datos de la plataforma
   Edita este archivo para actualizar club, pagos, plantilla,
   noticias, tienda y boletos. Todo lo demás se calcula solo.
   ========================================================= */

const CONFIG = {
  club: "Soccer Elite FC",
  clubShort: "SEFC",
  league: "Liga Elite Regional",
  stadium: "Estadio Elite",
  city: "Mazatlán, Sinaloa",
  currency: "MXN",
  whatsapp: "526690000000", // número para enviar comprobantes (formato internacional, sin +)
  email: "pagos@soccerelite.mx",

  // Datos bancarios para transferencias / depósitos
  bank: {
    name: "Banco Azteca",
    holder: "CESAR GASTELUM CARVENTE",
    account: "98411322680490",
    clabe: "127437013226804905",
  },

  // Cuotas de la academia
  fees: {
    inscripcion: 800,
    colegiatura: 650, // mensual
    uniforme: 950,
  },

  social: [
    { id: "x", name: "X (Twitter)", handle: "@SoccerEliteFC", url: "https://x.com/" },
    { id: "instagram", name: "Instagram", handle: "@soccerelitefc", url: "https://instagram.com/" },
    { id: "tiktok", name: "TikTok", handle: "@soccerelitefc", url: "https://tiktok.com/" },
    { id: "youtube", name: "YouTube", handle: "Soccer Elite TV", url: "https://youtube.com/" },
    { id: "facebook", name: "Facebook", handle: "Soccer Elite FC", url: "https://facebook.com/" },
  ],
};

/* ---------- Generador pseudoaleatorio determinista ---------- */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Equipos de la liga ---------- */
const TEAMS = [
  { id: "sef", name: "Soccer Elite FC", short: "SEF", color: "#ff8a1f" },
  { id: "tib", name: "Tiburones del Pacífico", short: "TIB", color: "#1fa2ff" },
  { id: "hal", name: "Halcones Dorados", short: "HAL", color: "#e8c547" },
  { id: "toro", name: "Toros de la Sierra", short: "TOR", color: "#d64545" },
  { id: "ven", name: "Venados FC", short: "VEN", color: "#8a5a3c" },
  { id: "pum", name: "Pumas del Valle", short: "PUM", color: "#4a6fa5" },
  { id: "dep", name: "Deportivo Costa", short: "DEP", color: "#2eb872" },
  { id: "atl", name: "Atlético Norte", short: "ATL", color: "#9b59b6" },
];
const TEAM = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

/* ---------- Calendario de liga (round-robin, 14 jornadas) ---------- */
const CHANNELS = ["Elite TV", "TV Azteca Deportes", "Canal 7 Regional", "YouTube Elite TV", "Fox Sports"];

function buildFixtures() {
  const ids = TEAMS.map((t) => t.id);
  const n = ids.length;
  const rounds = [];
  const arr = ids.slice();
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()); // rotar dejando fijo el primero
  }
  // vuelta
  const second = rounds.map((pairs) => pairs.map(([a, b]) => [b, a]));
  const all = rounds.concat(second);

  const rnd = seeded(2026);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const PLAYED = 9; // jornadas ya disputadas
  const matches = [];
  all.forEach((pairs, j) => {
    // cada jornada es un sábado; la jornada PLAYED+1 es el próximo sábado
    const base = new Date(today);
    const toSat = (6 - base.getDay() + 7) % 7 || 7;
    base.setDate(base.getDate() + toSat + (j - PLAYED) * 7);
    pairs.forEach(([home, away], k) => {
      const d = new Date(base);
      d.setDate(d.getDate() + (k >= 2 ? 1 : 0)); // sábado y domingo
      d.setHours([17, 19, 12, 18][k], k === 3 ? 30 : 0, 0, 0);
      const played = j < PLAYED;
      const strength = (id) => ({ sef: 1.8, tib: 1.5, hal: 1.4, toro: 1.2, ven: 1.0, pum: 1.1, dep: 0.9, atl: 0.8 })[id];
      const goals = (id, h) => {
        const lambda = strength(id) * (h ? 1.15 : 0.9);
        let g = 0, p = Math.exp(-lambda), s = p, u = rnd();
        while (u > s && g < 6) { g++; p *= lambda / g; s += p; }
        return g;
      };
      const hg = goals(home, true);
      const ag = goals(away, false);
      matches.push({
        id: `j${j + 1}-${k}`,
        jornada: j + 1,
        home,
        away,
        date: d.toISOString(),
        channel: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
        venue: home === "sef" ? CONFIG.stadium : `Estadio ${TEAM[home].name.split(" ").pop()}`,
        played,
        hg: played ? hg : null,
        ag: played ? ag : null,
      });
    });
  });
  return matches;
}
const MATCHES = buildFixtures();

/* ---------- Plantilla ---------- */
const PLAYERS = [
  { n: 1, name: "Diego Ramírez", pos: "Portero", age: 28, nat: "México", flag: "🇲🇽", h: 188, foot: "Derecho" },
  { n: 13, name: "Iván Castro", pos: "Portero", age: 22, nat: "México", flag: "🇲🇽", h: 185, foot: "Derecho" },
  { n: 2, name: "Luis Herrera", pos: "Defensa", age: 25, nat: "México", flag: "🇲🇽", h: 179, foot: "Derecho" },
  { n: 3, name: "Santiago Molina", pos: "Defensa", age: 30, nat: "Argentina", flag: "🇦🇷", h: 186, foot: "Izquierdo" },
  { n: 4, name: "Andrés Paredes", pos: "Defensa", age: 27, nat: "Colombia", flag: "🇨🇴", h: 184, foot: "Derecho" },
  { n: 5, name: "Jorge Valenzuela", pos: "Defensa", age: 24, nat: "México", flag: "🇲🇽", h: 182, foot: "Derecho" },
  { n: 15, name: "Ricardo Ochoa", pos: "Defensa", age: 21, nat: "México", flag: "🇲🇽", h: 177, foot: "Izquierdo" },
  { n: 6, name: "Emilio Rentería", pos: "Medio", age: 29, nat: "México", flag: "🇲🇽", h: 176, foot: "Derecho" },
  { n: 8, name: "Mateo Fuentes", pos: "Medio", age: 23, nat: "Uruguay", flag: "🇺🇾", h: 174, foot: "Derecho" },
  { n: 10, name: "Cristian Beltrán", pos: "Medio", age: 26, nat: "México", flag: "🇲🇽", h: 172, foot: "Izquierdo" },
  { n: 14, name: "Héctor Lugo", pos: "Medio", age: 31, nat: "México", flag: "🇲🇽", h: 178, foot: "Derecho" },
  { n: 16, name: "Kevin Soto", pos: "Medio", age: 20, nat: "Estados Unidos", flag: "🇺🇸", h: 175, foot: "Derecho" },
  { n: 20, name: "Alan Quintero", pos: "Medio", age: 22, nat: "México", flag: "🇲🇽", h: 170, foot: "Ambidiestro" },
  { n: 7, name: "Bryan Gastélum", pos: "Delantero", age: 24, nat: "México", flag: "🇲🇽", h: 173, foot: "Derecho" },
  { n: 9, name: "Facundo Ríos", pos: "Delantero", age: 27, nat: "Argentina", flag: "🇦🇷", h: 183, foot: "Derecho" },
  { n: 11, name: "Óscar Medina", pos: "Delantero", age: 25, nat: "México", flag: "🇲🇽", h: 176, foot: "Izquierdo" },
  { n: 17, name: "Jair Camacho", pos: "Delantero", age: 19, nat: "México", flag: "🇲🇽", h: 180, foot: "Derecho" },
  { n: 19, name: "Wilmer Angulo", pos: "Delantero", age: 28, nat: "Ecuador", flag: "🇪🇨", h: 181, foot: "Derecho" },
].map((p) => {
  const r = seeded(p.n * 97);
  const gk = p.pos === "Portero";
  const fw = p.pos === "Delantero";
  const mf = p.pos === "Medio";
  const pj = 4 + Math.floor(r() * 6);
  return {
    ...p,
    pj,
    min: pj * (60 + Math.floor(r() * 30)),
    goals: gk ? 0 : Math.floor(r() * (fw ? 8 : mf ? 4 : 2)),
    assists: gk ? 0 : Math.floor(r() * (mf ? 6 : fw ? 4 : 2)),
    yellow: Math.floor(r() * 4),
    red: r() > 0.9 ? 1 : 0,
    saves: gk ? 10 + Math.floor(r() * 25) : 0,
    rating: (6.2 + r() * 1.8).toFixed(1),
  };
});

/* ---------- Noticias ---------- */
const NEWS = [
  { id: 1, cat: "Crónica", title: "Victoria de carácter en casa: Elite remonta y se afianza en la cima", date: -2, img: "stadium",
    excerpt: "Con doblete de Facundo Ríos, el equipo dio la vuelta al marcador en el segundo tiempo ante un estadio lleno.",
    body: "El Estadio Elite vivió una tarde de emociones. Tras irse al descanso abajo en el marcador, el equipo salió con otra actitud en la segunda mitad. Facundo Ríos firmó un doblete y Cristian Beltrán selló el triunfo con un tiro libre magistral al 88'. El director técnico destacó la intensidad y la lectura del partido de sus jugadores." },
  { id: 2, cat: "Fichajes", title: "Wilmer Angulo renueva hasta 2028", date: -4, img: "sign",
    excerpt: "El delantero ecuatoriano extiende su vínculo con el club por dos temporadas más.",
    body: "La directiva confirmó la renovación del atacante, que suma 5 goles en lo que va del torneo. \"Aquí me siento en casa, quiero levantar el título con esta afición\", declaró en conferencia de prensa." },
  { id: 3, cat: "Reporte médico", title: "Parte médico: Santiago Molina, baja de 2 semanas", date: -5, img: "medical",
    excerpt: "El central sufrió una distensión en el aductor y será baja para los próximos dos compromisos.",
    body: "Los estudios practicados al defensor argentino confirmaron una distensión de grado 1 en el aductor izquierdo. El cuerpo médico estima un periodo de recuperación de 10 a 14 días." },
  { id: 4, cat: "Declaraciones", title: "\"Vamos partido a partido\": el DT antes del clásico", date: -6, img: "press",
    excerpt: "El estratega pidió calma y concentración rumbo al duelo ante Tiburones del Pacífico.",
    body: "En conferencia, el director técnico evitó hablar de favoritismos: \"El clásico se juega distinto. Tenemos que ser inteligentes, cuidar la pelota y aprovechar nuestras oportunidades\"." },
  { id: 5, cat: "Academia", title: "Abiertas las inscripciones para visorias de la Academia Elite", date: -8, img: "academy",
    excerpt: "Niños y jóvenes de 5 a 17 años pueden inscribirse en línea. Cupo limitado por categoría.",
    body: "La Academia Elite abre sus puertas para la nueva generación. Las inscripciones se realizan desde la sección Academia de esta plataforma; el pago puede hacerse por transferencia o depósito en Banco Azteca." },
  { id: 6, cat: "Afición", title: "Nueva camiseta de visitante ya disponible en la tienda", date: -10, img: "shop",
    excerpt: "Diseño inspirado en los atardeceres del Pacífico. Disponible en tallas infantiles y adulto.",
    body: "La nueva indumentaria ya está a la venta en nuestra tienda en línea y en el estadio en día de partido. Socios con abono tienen 10% de descuento." },
];

/* ---------- Multimedia ---------- */
const MEDIA = [
  { type: "video", title: "Resumen: Elite 3-1 Halcones", dur: "4:12", tag: "Highlights" },
  { type: "video", title: "Zona mixta: Facundo Ríos tras su doblete", dur: "2:48", tag: "Entrevista" },
  { type: "photo", title: "Entrenamiento a puerta abierta", tag: "Entrenamiento" },
  { type: "video", title: "Top 5 goles de la jornada", dur: "3:05", tag: "Highlights" },
  { type: "photo", title: "La afición pintó de naranja el estadio", tag: "Partido" },
  { type: "video", title: "Rueda de prensa del DT", dur: "12:30", tag: "Entrevista" },
  { type: "photo", title: "Presentación de la nueva camiseta", tag: "Club" },
  { type: "photo", title: "Academia Elite: categoría Sub-12", tag: "Academia" },
];

/* ---------- Tienda ---------- */
const PRODUCTS = [
  { id: "p1", name: "Camiseta Local 2026", price: 1299, cat: "Camisetas", sizes: ["CH", "M", "G", "XG"], icon: "shirt", color: "#ff8a1f" },
  { id: "p2", name: "Camiseta Visitante 2026", price: 1299, cat: "Camisetas", sizes: ["CH", "M", "G", "XG"], icon: "shirt", color: "#1d2433" },
  { id: "p3", name: "Camiseta Infantil", price: 899, cat: "Camisetas", sizes: ["6", "8", "10", "12", "14"], icon: "shirt", color: "#ffb35c" },
  { id: "p4", name: "Pants de entrenamiento", price: 1099, cat: "Entrenamiento", sizes: ["CH", "M", "G", "XG"], icon: "pants", color: "#2a3142" },
  { id: "p5", name: "Sudadera Elite", price: 949, cat: "Entrenamiento", sizes: ["CH", "M", "G", "XG"], icon: "hoodie", color: "#3b4458" },
  { id: "p6", name: "Balón oficial", price: 699, cat: "Accesorios", sizes: ["5"], icon: "ball", color: "#ffffff" },
  { id: "p7", name: "Bufanda de la afición", price: 349, cat: "Souvenirs", sizes: ["Única"], icon: "scarf", color: "#ff8a1f" },
  { id: "p8", name: "Gorra bordada", price: 399, cat: "Accesorios", sizes: ["Única"], icon: "cap", color: "#1d2433" },
  { id: "p9", name: "Termo 750 ml", price: 299, cat: "Souvenirs", sizes: ["Única"], icon: "bottle", color: "#ff8a1f" },
];

/* ---------- Boletos ---------- */
const TICKET_ZONES = [
  { id: "gen", name: "General", price: 150, desc: "Cabeceras" },
  { id: "pref", name: "Preferente", price: 280, desc: "Laterales" },
  { id: "plat", name: "Platea", price: 420, desc: "Central, techada" },
  { id: "palco", name: "Palco VIP", price: 950, desc: "Incluye alimentos" },
];
const SEASON_PASSES = [
  { id: "ab-gen", name: "Abono General", price: 1500, desc: "7 partidos de local" },
  { id: "ab-plat", name: "Abono Platea", price: 2600, desc: "7 partidos + 10% en tienda" },
];

/* ---------- Patrocinadores ---------- */
const SPONSORS = [
  { name: "Banco Azteca", tier: "Patrocinador oficial" },
  { name: "Pacífico Motors", tier: "Patrocinador principal" },
  { name: "AquaSport", tier: "Bebida oficial" },
  { name: "Elite Sportswear", tier: "Proveedor técnico" },
  { name: "Mar Azul Hotel", tier: "Hotel oficial" },
  { name: "FarmaSalud", tier: "Servicios médicos" },
];

/* ---------- Partido en vivo (guion de la simulación) ---------- */
const LIVE_SCRIPT = [
  { m: 0, t: "start", txt: "¡Rueda el balón! Comienza el partido en el Estadio Elite." },
  { m: 4, t: "info", txt: "Primer acercamiento de Elite: centro de Gastélum que despeja la defensa." },
  { m: 9, t: "chance", team: "away", txt: "¡Uff! Disparo de Tiburones que se va por encima del travesaño." },
  { m: 14, t: "yellow", team: "away", txt: "Tarjeta amarilla para el #5 de Tiburones por falta táctica." },
  { m: 18, t: "goal", team: "home", player: "Facundo Ríos", txt: "¡GOOOL DE ELITE! Facundo Ríos define de cabeza tras centro de Beltrán." },
  { m: 23, t: "info", txt: "Elite domina la posesión y toca con paciencia en mitad de cancha." },
  { m: 29, t: "save", team: "home", txt: "¡Atajadón de Diego Ramírez! Vuela al ángulo para evitar el empate." },
  { m: 35, t: "chance", team: "home", txt: "Tiro de Medina que pega en el poste. ¡Cerca del segundo!" },
  { m: 41, t: "goal", team: "away", player: "M. Torres", txt: "Gol de Tiburones. Contragolpe letal que termina en empate." },
  { m: 45, t: "half", txt: "Final del primer tiempo. Todo igualado." },
  { m: 46, t: "info", txt: "Arranca la segunda mitad. Sin cambios en ambos equipos." },
  { m: 53, t: "sub", team: "home", txt: "Cambio en Elite: entra Jair Camacho por Óscar Medina." },
  { m: 58, t: "yellow", team: "home", txt: "Amarilla para Emilio Rentería por protestar." },
  { m: 64, t: "goal", team: "home", player: "Cristian Beltrán", txt: "¡GOOOL! Cristian Beltrán con un tiro libre al ángulo. ¡Golazo!" },
  { m: 71, t: "chance", team: "away", txt: "Tiburones presiona; remate desviado por poco." },
  { m: 78, t: "sub", team: "away", txt: "Doble cambio en Tiburones buscando el empate." },
  { m: 84, t: "goal", team: "home", player: "Jair Camacho", txt: "¡GOOOL! El canterano Jair Camacho sentencia el partido." },
  { m: 90, t: "info", txt: "Se agregan 4 minutos de compensación." },
  { m: 94, t: "end", txt: "¡Final del partido! Triunfo de Elite en el clásico." },
];
