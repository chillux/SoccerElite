# SoccerElite

Plataforma web oficial de **Soccer Elite FC**. Pensada primero para el celular, se puede instalar como app (PWA) y no necesita compilación: solo HTML, CSS y JavaScript.

## Secciones

| Pilar | Qué incluye |
|---|---|
| **Torneo / equipo** | Calendario y resultados (fecha, hora, canal, sede), tabla de posiciones que se calcula sola (PJ, G, E, P, GF, GC, DG, PTS, forma) y plantilla con fichas de cada jugador |
| **Multimedia** | Noticias por categoría (crónicas, fichajes, reportes médicos, declaraciones), galería de videos y fotos, y un centro de estadísticas (posesión, remates, faltas, goleadores, histórico) |
| **Comunidad** | Minuto a minuto en vivo con marcador, mini cancha y estadísticas; foro moderado con filtro de groserías; enlaces a X, Instagram, TikTok, YouTube y Facebook |
| **Monetización** | Tienda con carrito, boletería (zonas y abonos, con código de acceso cuando el pago ya está validado), patrocinadores y espacio publicitario |
| **Academia** | Inscripción con foto del jugador, categoría asignada según la edad, referencias de pago para inscripción, colegiatura mensual y uniforme; base de datos con búsqueda, filtro de adeudos, validación de pagos y exportación a CSV |
| **Pagos** | Transferencia o depósito en **Banco Azteca** (cuenta, CLABE y beneficiario con botón de copiar), referencia única por pedido y envío del comprobante por WhatsApp o subiéndolo |
| **Técnico** | Diseño responsivo pensado primero para móvil, barra de navegación inferior, funciona sin conexión (service worker) y notificaciones push (inicio de partido, goles y recordatorios) |

## Cómo ejecutarla

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

También se puede publicar tal cual en GitHub Pages, Netlify o Vercel. Las notificaciones y el modo sin conexión requieren HTTPS (o `localhost`).

## Personalización

Todo el contenido está en **`js/data.js`**:

- `CONFIG`: nombre del club, liga, estadio, **datos bancarios**, cuotas de la Academia, WhatsApp, correo y redes sociales.
- `TEAMS`, `PLAYERS`, `NEWS`, `MEDIA`, `PRODUCTS`, `TICKET_ZONES`, `SEASON_PASSES`, `SPONSORS`, `LIVE_SCRIPT`.

## Importante para producción

Esta versión guarda los datos (inscripciones, pedidos, comentarios) en el `localStorage` **del navegador de cada usuario**. Sirve como demostración funcional completa, pero para operar de verdad hace falta:

1. **Un backend y una base de datos** (Firebase/Supabase, por ejemplo) para que la base de jugadores, los pagos y el foro se compartan entre dispositivos.
2. **Un panel de administración con inicio de sesión.** Hoy cualquiera que abra la página puede "validar" un pago en la base de datos de la Academia.
3. **Conciliación de pagos**: validar los depósitos contra el estado de cuenta, o integrar una pasarela (Mercado Pago, Stripe, Conekta) si se quieren pagos con tarjeta.
4. **Un proveedor de datos en vivo** (o captura manual) para el minuto a minuto. Ahora es una simulación acelerada.
5. **Web Push desde un servidor** (Firebase Cloud Messaging) para avisar aunque la página esté cerrada. `sw.js` ya maneja el evento `push`.
6. **Aviso de privacidad (LFPDPPP)**, porque se guardan datos y fotos de menores de edad.
