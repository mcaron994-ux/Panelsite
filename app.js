/* ============================================================
   Création Expert | Studio — Logique principale
   Auth (localStorage) • Formulaires • Soumissions • Accueil
   ============================================================ */

// ---------- STORE (localStorage) ----------
const Store = {
  users:   () => JSON.parse(localStorage.getItem("cx_users")   || "[]"),
  saveUsers: u => localStorage.setItem("cx_users", JSON.stringify(u)),

  orders:  () => JSON.parse(localStorage.getItem("cx_orders")  || "[]"),
  saveOrders: o => localStorage.setItem("cx_orders", JSON.stringify(o)),

  messages: () => JSON.parse(localStorage.getItem("cx_messages") || "[]"),
  saveMessages: m => localStorage.setItem("cx_messages", JSON.stringify(m)),

  adminCode: "admin45", // 🔑 code d'accès au panel dev
};
if (!localStorage.getItem("cx_adminUnlocked")) localStorage.setItem("cx_adminUnlocked", "{}");

// ---------- HELPERS ----------
const OFFERS = {
  "gratuit":   { label: "Serveur Discord gratuit",        price: 0 },
  "bot-brut":  { label: "Bot brut avec codes (standard)", price: 1 },
  "bot-perso": { label: "Bot avec codes personnalisés",   price: 2 },
};

const UI = {
  toast(msg, isErr = false) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast" + (isErr ? " err" : "");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.add("hidden"), 3200);
  },

  openModal(name) {
    const ov = document.getElementById("modalOverlay");
    if (!ov) { location.href = "index.html"; return; }
    ov.classList.remove("hidden");
    document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
    const m = document.getElementById("modal-" + name);
    if (m) m.classList.remove("hidden");
  },
  switchModal: n => UI.openModal(n),
  closeModal() {
    const ov = document.getElementById("modalOverlay");
    if (ov) ov.classList.add("hidden");
  },
  overlayClick(e) { if (e.target.id === "modalOverlay") UI.closeModal(); },
  logout() { sessionStorage.removeItem("cx_session"); location.href = "index.html"; },

  /* Affiche l'avatar : photo de profil si définie, sinon initiale */
  setAvatar(el, user) {
    if (!el || !user) return;
    if (user.avatar) {
      el.textContent = "";
      let img = el.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%";
        el.appendChild(img);
      }
      img.src = user.avatar;
    } else {
      el.textContent = user.username.charAt(0).toUpperCase();
      const img = el.querySelector("img");
      if (img) img.remove();
    }
  },

  refreshNav() {
    const user = Auth.current();
    const guest = document.getElementById("navGuest");
    const un = document.getElementById("navUser");
    if (guest) guest.classList.toggle("hidden", !!user);
    if (un) un.classList.toggle("hidden", !user);
    if (user) {
      const n = document.getElementById("navUsername"), a = document.getElementById("navAvatar");
      if (n) n.textContent = user.username;
      if (a) UI.setAvatar(a, user);
    }
  }
};

// ---------- AUTH ----------
const Auth = {
  current() {
    const id = sessionStorage.getItem("cx_session");
    return id ? Store.users().find(u => u.id === id) || null : null;
  },

  register() {
    const username = document.getElementById("reg-username").value.trim();
    const email    = document.getElementById("reg-email").value.trim();
    const discord  = document.getElementById("reg-discord").value.trim();
    const password = document.getElementById("reg-password").value;

    if (username.length < 3) return UI.toast("Nom d'utilisateur : min. 3 caractères.", true);
    if (!email.includes("@")) return UI.toast("Adresse e-mail invalide.", true);
    if (password.length < 4)  return UI.toast("Mot de passe : min. 4 caractères.", true);

    const users = Store.users();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase()))
      return UI.toast("Ce nom d'utilisateur est déjà pris.", true);

    users.push({ id: "u" + Date.now() + Math.random().toString(36).slice(2, 6),
      username, email, discord, password, avatar: null, isAdmin: false, createdAt: new Date().toISOString() });
    Store.saveUsers(users);
    sessionStorage.setItem("cx_session", users[users.length - 1].id);
    UI.closeModal();
    UI.toast("Compte créé, bienvenue !");
    location.href = "dashboard.html";
  },

  login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const u = Store.users().find(x => x.username.toLowerCase() === username.toLowerCase() && x.password === password);
    if (!u) return UI.toast("Identifiants incorrects.", true);
    sessionStorage.setItem("cx_session", u.id);
    UI.closeModal();
    location.href = "dashboard.html";
  },

  requireAccess(offer) {
    if (!Auth.current()) {
      UI.toast("🔒 Créez un compte et connectez-vous pour commander.", true);
      UI.openModal("register");
      const note = document.getElementById("lockedNote");
      if (note) note.classList.remove("hidden");
      return;
    }
    Order.open(offer);
  }
};

// ---------- COMMANDES ----------
const Order = {
  offer: null,

  open(offer) {
    Order.offer = offer;
    const info = OFFERS[offer];
    const title = document.getElementById("orderTitle");
    if (title) title.textContent = "Commande — " + info.label;
    const sum = document.getElementById("orderSummary");
    if (sum) sum.innerHTML =
      `Offre sélectionnée : <b>${info.label}</b> — Prix : <b>${info.price === 0 ? "Gratuit" : "$" + info.price + ".00 USD"}</b>`;
    UI.openModal("order");
    Payments.renderButton("paypal-order-container", info.price, d => Order.submit(d));
  },

  collect() {
    const u = Auth.current();
    return {
      id: "o" + Date.now(),
      offer: Order.offer,
      offerLabel: OFFERS[Order.offer].label,
      price: OFFERS[Order.offer].price,
      userId: u.id, username: u.username, email: u.email,
      discord:    document.getElementById("o-discord").value.trim(),
      server:     document.getElementById("o-server").value.trim(),
      members:    document.getElementById("o-members").value,
      lang:       document.getElementById("o-lang").value,
      theme:      document.getElementById("o-theme").value.trim(),
      features:   Array.from(document.querySelectorAll('input[name="o-feature"]:checked')).map(o => o.value).join(", "),
      desc:       document.getElementById("o-desc").value.trim(),
      refs:       document.getElementById("o-refs").value.trim(),
      delay:      document.getElementById("o-delay").value,
      budget:     document.getElementById("o-budget").value.trim(),
      extra:      document.getElementById("o-extra").value.trim(),
      date: new Date().toISOString(),
      status: "En attente",
      payment: null,
    };
  },

  submit(paymentDetails) {
    const need = [
      ["Numéro de contact Discord", document.getElementById("o-discord").value.trim()],
      ["Nom du serveur / projet",  document.getElementById("o-server").value.trim()],
      ["Description détaillée",    document.getElementById("o-desc").value.trim()],
    ];
    const missing = need.filter(x => !x[1]).map(x => x[0]);
    if (missing.length)
      return UI.toast("⚠️ Champs obligatoires manquants : " + missing.join(", "), true);

    const order = Order.collect();
    if (paymentDetails) {
      order.status = "Payé";
      order.payment = {
        method: "PayPal",
        amount: OFFERS[Order.offer].price.toFixed(2),
        currency: "USD",
        id: paymentDetails.id || "",
        payer: (paymentDetails.payer && paymentDetails.payer.email_address) || "",
        paidAt: new Date().toISOString()
      };
    }
    const orders = Store.orders();
    orders.push(order);
    Store.saveOrders(orders);
    UI.closeModal();
    UI.toast(paymentDetails ? "✅ Commande payée et soumise !" : "✅ Commande soumise !");
    setTimeout(() => location.href = "dashboard.html", 1200);
  }
};

// ---------- ACCUEIL ----------
const Home = {
  quotes: [
    { t: "\"Serveur livré en 30 h, tout était déjà configuré. Franchement impressionné.\"", a: "— Luna_M, fondatrice de La Forteresse", i: "🦊" },
    { t: "\"Le bot est ultra stable et le code est propre. Support réactif en plus !\"", a: "— Kovacs, admin de CryptoCentral", i: "🐲" },
    { t: "\"Excellent rapport qualité-prix. J'ai commandé 3 fois déjà.\"", a: "— Piksel, community manager", i: "🐱" }
  ],
  qi: 0,

  counters() {
    document.querySelectorAll(".counter").forEach(el => {
      const to = +el.dataset.to;
      let cur = 0;
      const step = Math.max(1, Math.round(to / 60));
      const h = setInterval(() => {
        cur = Math.min(to, cur + step);
        el.textContent = cur.toLocaleString("fr-FR") + "+";
        if (cur >= to) clearInterval(h);
      }, 20);
    });
  },

  liveStats() {
    const orders = Store.orders();
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set("liveClients", new Set(orders.map(o => o.userId)).size + 214);
    set("liveOrders", orders.length);
    set("liveBots", 7);
    set("liveTickets", orders.filter(o => o.status === "Payé").length + 48);
  },

  filterPF(cat, btn) {
    document.querySelectorAll(".pf-filters .btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    document.querySelectorAll(".pf-item").forEach(it => {
      it.style.display = (cat === "all" || it.dataset.cat === cat) ? "" : "none";
    });
  },

  renderQuote() {
    const q = Home.quotes[Home.qi];
    const box = document.getElementById("quoteBox");
    if (!box) return;
    document.getElementById("quoteText").textContent = q.t;
    document.getElementById("quoteAuthor").textContent = q.a;
    const av = box.querySelector(".quote-avatar");
    if (av) av.textContent = q.i;
    document.getElementById("quoteDots").innerHTML = Home.quotes.map((_, i) =>
      `<span class="dot ${i === Home.qi ? "on" : ""}" onclick="Home.goQuote(${i})"></span>`).join("");
  },
  goQuote(i)  { Home.qi = i; Home.renderQuote(); },
  nextQuote() { Home.qi = (Home.qi + 1) % Home.quotes.length; Home.renderQuote(); },

  filterFAQ(v) {
    v = (v || "").toLowerCase();
    let any = false;
    document.querySelectorAll("#faqList details").forEach(d => {
      const ok = !v || (d.textContent + " " + (d.dataset.q || "")).toLowerCase().includes(v);
      d.style.display = ok ? "" : "none";
      if (ok) any = true;
    });
    const empty = document.getElementById("faqEmpty");
    if (empty) empty.classList.toggle("hidden", any);
  },

  submitContact() {
    const name  = document.getElementById("c-name").value.trim();
    const reply = document.getElementById("c-reply").value.trim();
    const msg   = document.getElementById("c-msg").value.trim();
    if (!name || !msg) return UI.toast("Remplissez au moins votre nom et le message.", true);
    const msgs = Store.messages();
    msgs.push({ id: "m" + Date.now(), name, reply, msg,
      userId: (Auth.current() || {}).id || null,
      date: new Date().toISOString(), read: false });
    Store.saveMessages(msgs);
    document.getElementById("c-name").value = "";
    document.getElementById("c-reply").value = "";
    document.getElementById("c-msg").value = "";
    UI.toast("📨 Message envoyé ! Réponse sous 6 h.");
  },

  subscribe() {
    const mail = document.getElementById("newsMail").value.trim();
    if (!mail.includes("@")) return UI.toast("E-mail invalide.", true);
    const subs = JSON.parse(localStorage.getItem("cx_newsletter") || "[]");
    if (!subs.includes(mail)) subs.push(mail);
    localStorage.setItem("cx_newsletter", JSON.stringify(subs));
    document.getElementById("newsMail").value = "";
    UI.toast("📬 Inscrit à la newsletter !");
  },

  toggleTheme() {
    document.body.classList.toggle("light");
    localStorage.setItem("cx_theme", document.body.classList.contains("light") ? "light" : "dark");
    const b = document.getElementById("themeToggle");
    if (b) b.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
  },
  initTheme() {
    if (localStorage.getItem("cx_theme") === "light") {
      document.body.classList.add("light");
      const b = document.getElementById("themeToggle");
      if (b) b.textContent = "☀️";
    }
  },

  initCookies() {
    const bar = document.getElementById("cookieBar");
    if (bar && !localStorage.getItem("cx_cookies"))
      bar.classList.remove("hidden");
  },
  acceptCookies() { localStorage.setItem("cx_cookies", "ok"); const b = document.getElementById("cookieBar"); if (b) b.classList.add("hidden"); },
  refuseCookies() { localStorage.setItem("cx_cookies", "no"); const b = document.getElementById("cookieBar"); if (b) b.classList.add("hidden"); },

  revealInit() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(e => e.classList.add("vis"));
      return;
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("vis"); io.unobserve(e.target); }
    }), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
  }
};

// ---------- INIT ACCUEIL ----------
document.addEventListener("DOMContentLoaded", () => {
  const note = document.getElementById("lockedNote");
  if (note && Auth.current()) note.classList.add("hidden");
  UI.refreshNav();
  Home.revealInit();
  Home.counters();
  Home.liveStats();
  Home.renderQuote();
  Home.initTheme();
  Home.initCookies();
  setInterval(() => Home.nextQuote(), 5000);
});
