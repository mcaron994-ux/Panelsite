/* ============================================================
   Création Expert | Studio — Dashboard (utilisateur + panel dev)
   ============================================================ */

// ---------- SESSION / GARDE D'ACCÈS ----------
const user = Auth.current();
if (!user) location.href = "index.html";  // pas connecté → retour accueil

const isAdmin = () => !!JSON.parse(localStorage.getItem("cx_adminUnlocked") || "{}")[user.id];

// ---------- DASH (navigation + données utilisateur) ----------
const Dash = {
  tab(name, link) {
    document.querySelectorAll(".tab").forEach(t => t.classList.add("hidden"));
    const tab = document.getElementById("tab-" + name);
    if (tab) tab.classList.remove("hidden");
    document.querySelectorAll(".side-link").forEach(s => s.classList.remove("active"));
    if (link) link.classList.add("active");
    window.scrollTo({ top: 0 });
    if (name === "orders")   Dash.renderOrders();
    if (name === "messages") Dash.renderMsgs();
    if (name === "overview") Dash.renderOverview();
    if (name === "admin")    Admin.render();
    if (name === "settings") Dash.fillSettings();
  },

  /* ----- Vue d'ensemble ----- */
  renderOverview() {
    const myOrders = Store.orders().filter(o => o.userId === user.id);
    const paid = myOrders.filter(o => o.status === "Payé" || o.status === "Livré");

    const stats = [
      ["📦", myOrders.length, "Commandes totales"],
      ["✅", paid.length, "Payées / livrées"],
      ["⏳", myOrders.filter(o => o.status === "En attente").length, "En attente"],
      ["📨", Store.messages().filter(m => m.userId === user.id).length, "Messages envoyés"],
    ];
    const el = document.getElementById("userStats");
    if (el) el.innerHTML = stats.map(s =>
      `<div class="panel stat-card"><div style="font-size:1.6rem">${s[0]}</div><strong>${s[1]}</strong><span>${s[2]}</span></div>`).join("");

    const recent = document.getElementById("ovRecent");
    if (recent) {
      const last = myOrders.slice(-4).reverse();
      recent.innerHTML = last.length ? last.map(o => Dash.orderRow(o)).join("")
        : `<p class="dim">Aucune commande pour le moment. <a href="index.html#services">Voir les offres →</a></p>`;
    }

    const tip = document.getElementById("ovTip");
    if (tip) tip.textContent = "Astuce : utilisez la recherche dans « Mes commandes » pour retrouver une commande rapidement.";

    Dash.drawUserChart(myOrders);
  },

  drawUserChart(orders) {
    const c = document.getElementById("userChart");
    if (!c) return;
    const ctx = c.getContext("2d");
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const counts = days.map(d =>
      orders.filter(o => new Date(o.date).toDateString() === d.toDateString()).length);
    const max = Math.max(1, ...counts);
    const W = c.width, H = c.height, pad = 20;
    const bw = (W - pad * 2) / days.length;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(pad, H - 30); ctx.lineTo(W - pad, H - 30); ctx.stroke();

    counts.forEach((v, i) => {
      const h = (v / max) * (H - 60);
      const x = pad + i * bw + bw * .2;
        const g = ctx.createLinearGradient(0, H - 30 - h, 0, H - 30);
        g.addColorStop(0, "#9B5CFF"); g.addColorStop(1, "#5865F2");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, H - 30 - h, bw * .6, h, 4); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(days[i].toLocaleDateString("fr-FR", { weekday: "short" }), pad + i * bw + bw * .5, H - 12);
    });
  },

  /* ----- Mes commandes ----- */
  statusPill(st) {
    const cls = { "En attente": "attente", "Payé": "payé", "En cours": "en cours", "Livré": "livré", "Annulé": "annulé" }[st] || "attente";
    return `<span class="status-pill status-${cls}">${st}</span>`;
  },

  orderRow(o) {
    return `<div class="order-item">
      <div><b>${o.offerLabel}</b><br><small>${new Date(o.date).toLocaleString("fr-FR")}</small></div>
      <div>${Dash.statusPill(o.status)}</div>
    </div>`;
  },

  renderOrders() {
    const q = (document.getElementById("ordFilter")?.value || "").toLowerCase();
    const st = document.getElementById("ordStatus")?.value || "";
    let list = Store.orders().filter(o => o.userId === user.id);
    if (st) list = list.filter(o => o.status === st);
    if (q) list = list.filter(o =>
      (o.offerLabel + " " + (o.server || "") + " " + (o.discord || "")).toLowerCase().includes(q));

    const box = document.getElementById("myOrders");
    if (!box) return;
    box.innerHTML = list.length ? list.map(o => Dash.orderRow(o)).join("")
      : `<p class="dim">Aucune commande trouvée.</p>`;
  },

  /* ----- Messages ----- */
  sendMsg() {
    const sujet = document.getElementById("u-msg-sujet").value.trim();
    const msg = document.getElementById("u-msg").value.trim();
    if (!msg) return UI.toast("Écrivez un message avant d'envoyer.", true);
    const msgs = Store.messages();
    msgs.push({ id: "m" + Date.now(), sujet, name: user.username, reply: user.discord || user.email,
      msg, userId: user.id, date: new Date().toISOString(), read: false });
    Store.saveMessages(msgs);
    document.getElementById("u-msg-sujet").value = "";
    document.getElementById("u-msg").value = "";
    UI.toast("📨 Message envoyé !");
    Dash.renderMsgs();
  },

  renderMsgs() {
    const box = document.getElementById("userMsgs");
    if (!box) return;
    const msgs = Store.messages().filter(m => m.userId === user.id).reverse();
    box.innerHTML = msgs.length ? msgs.map(m => `<div class="order-item">
      <div><b>${m.sujet || "(sans sujet)"}</b><br><small>${new Date(m.date).toLocaleString("fr-FR")}</small></div>
      <p style="max-width:60%">${m.msg}</p>
    </div>`).join("") : `<p class="dim">Aucun message envoyé.</p>`;
  },

  /* ----- Paramètres ----- */
  fillSettings() {
    document.getElementById("s-username").value = user.username || "";
    document.getElementById("s-email").value = user.email || "";
    document.getElementById("s-discord").value = user.discord || "";
    UI.setAvatar(document.getElementById("avatarPreview"), user);
    UI.setAvatar(document.getElementById("navAvatar"), user);
  },

  changeAvatar(input) {
    const f = input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // redimensionne en 256x256
        const cv = document.createElement("canvas"); cv.width = cv.height = 256;
        cv.getContext("2d").drawImage(img, 0, 0, 256, 256);
        Dash._avatarData = cv.toDataURL("image/jpeg", .85);
        UI.setAvatar(document.getElementById("avatarPreview"), { ...user, avatar: Dash._avatarData });
        UI.toast("Aperçu chargé — cliquez sur « Enregistrer le profil ».");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  },

  removeAvatar() {
    Dash._avatarData = null;
    UI.setAvatar(document.getElementById("avatarPreview"), { ...user, avatar: null });
    UI.toast("Photo retirée — pensez à enregistrer.");
  },

  saveProfile() {
    const users = Store.users();
    const me = users.find(u => u.id === user.id);
    if (!me) return;

    const un = document.getElementById("s-username").value.trim();
    const em = document.getElementById("s-email").value.trim();
    const dc = document.getElementById("s-discord").value.trim();
    if (un.length < 3) return UI.toast("Nom d'utilisateur : min. 3 caractères.", true);
    if (!em.includes("@")) return UI.toast("Adresse e-mail invalide.", true);
    if (users.some(u => u.id !== me.id && u.username.toLowerCase() === un.toLowerCase()))
      return UI.toast("Ce nom d'utilisateur est déjà pris.", true);

    me.username = un; me.email = em; me.discord = dc;
    if (Dash._avatarData !== undefined) me.avatar = Dash._avatarData;

    // gestion mot de passe (si les champs sont remplis)
    const oldP = document.getElementById("s-oldpass").value;
    const newP = document.getElementById("s-newpass").value;
    if (oldP || newP) {
      if (oldP !== me.password) { Store.saveUsers(users); return UI.toast("Ancien mot de passe incorrect.", true); }
      if (newP.length < 4)      { Store.saveUsers(users); return UI.toast("Nouveau mot de passe : min. 4 caractères.", true); }
      me.password = newP;
      document.getElementById("s-oldpass").value = "";
      document.getElementById("s-newpass").value = "";
    }

    Store.saveUsers(users);
    Object.assign(user, { username: me.username, email: me.email, discord: me.discord, avatar: me.avatar });
    document.getElementById("navUsername").textContent = me.username;
    UI.setAvatar(document.getElementById("navAvatar"), me);
    UI.toast("💾 Profil enregistré !");
  },

  deleteAccount() {
    if (!confirm("Supprimer définitivement votre compte ? Cette action est irréversible.")) return;
    Store.saveUsers(Store.users().filter(u => u.id !== user.id));
    Store.saveOrders(Store.orders().filter(o => o.userId !== user.id));
    sessionStorage.removeItem("cx_session");
    location.href = "index.html";
  },

  /* ----- Déblocage panel dev ----- */
  unlockAdmin() {
    const code = document.getElementById("devCode").value.trim();
    const msg = document.getElementById("unlockMsg");
    if (code !== Store.adminCode) {
      if (msg) { msg.textContent = "❌ Code incorrect."; }
      return UI.toast("Code incorrect.", true);
    }
    const unlocked = JSON.parse(localStorage.getItem("cx_adminUnlocked") || "{}");
    unlocked[user.id] = true;
    localStorage.setItem("cx_adminUnlocked", JSON.stringify(unlocked));
    UI.toast("🔓 Panel dev débloqué !");
    Dash.showAdminLink(true);
    const link = document.getElementById("adminLink");
    if (link) link.click();
  },

  showAdminLink(show) {
    const link = document.getElementById("adminLink");
    if (link) link.classList.toggle("hidden", !show);
  }
};

// ---------- ADMIN (panel dev) ----------
const Admin = {
  render() {
    if (!isAdmin()) { Dash.tab("overview"); return; }

    const qs = (document.getElementById("devSearch")?.value || "").toLowerCase();
    const sf = document.getElementById("devStatusFilter")?.value || "";
    const of_ = document.getElementById("devOfferFilter")?.value || "";

    let orders = Store.orders();
    if (sf) orders = orders.filter(o => o.status === sf);
    if (of_) orders = orders.filter(o => o.offer === of_);
    if (qs) orders = orders.filter(o =>
      (o.username + " " + (o.discord || "") + " " + o.offerLabel + " " + (o.server || "")).toLowerCase().includes(qs));

    const stats = [
      ["💰", "$" + orders.reduce((s, o) => s + (o.price || 0), 0).toFixed(2), "Revenus cumulés"],
      ["🧾", orders.length, "Commandes"],
      ["👥", Store.users().length, "Utilisateurs"],
      ["✉️", Store.messages().filter(m => !m.read).length, "Messages non lus"],
    ];
    const stEl = document.getElementById("devStats");
    if (stEl) stEl.innerHTML = stats.map(s =>
      `<div class="panel stat-card"><div style="font-size:1.6rem">${s[0]}</div><strong>${s[1]}</strong><span>${s[2]}</span></div>`).join("");

    const body = document.getElementById("devOrdersBody");
    if (body) body.innerHTML = orders.length ? orders.map((o, i) => `<tr>
      <td>${i + 1}</td><td><b>${o.username}</b></td><td>${o.discord || "—"}</td>
      <td>${o.offerLabel}</td><td>${o.price === 0 ? "Gratuit" : "$" + o.price}</td>
      <td>${o.server || "—"}</td><td>${new Date(o.date).toLocaleDateString("fr-FR")}</td>
      <td>${new Date(o.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</td>
      <td>${Dash.statusPill(o.status)}</td>
      <td class="d-actions">
        <select onchange="Admin.setStatus('${o.id}', this.value)">
          <option ${o.status === "En attente" ? "selected" : ""}>En attente</option>
          <option ${o.status === "Payé" ? "selected" : ""}>Payé</option>
          <option ${o.status === "En cours" ? "selected" : ""}>En cours</option>
          <option ${o.status === "Livré" ? "selected" : ""}>Livré</option>
          <option ${o.status === "Annulé" ? "selected" : ""}>Annulé</option>
        </select>
        <button class="btn btn-ghost" onclick="Admin.detail('${o.id}')">👁️</button>
      </td>
    </tr>`).join("") : `<tr><td colspan="10" style="text-align:center;padding:30px" class="dim">Aucune commande.</td></tr>`;

    Admin.drawChart(orders);
    Admin.renderUsers();
    Admin.renderMsgs();
  },

  setStatus(id, status) {
    const orders = Store.orders();
    const o = orders.find(x => x.id === id);
    if (!o) return;
    o.status = status;
    Store.saveOrders(orders);
    UI.toast("Statut mis à jour : " + status);
    Admin.render();
  },

  detail(id) {
    const o = Store.orders().find(x => x.id === id);
    if (!o) return;
    const ov = document.getElementById("adminDetailOverlay");
    if (!ov) return;
    ov.innerHTML = `<div class="modal modal-wide" onclick="event.stopPropagation()">
      <h2>Détail de la commande</h2>
      <p class="modal-sub">${o.offerLabel} — ${o.price === 0 ? "Gratuit" : "$" + o.price}</p>
      <div class="order-summary">
        <p><b>Client :</b> ${o.username} (${o.email})</p>
        <p><b>Discord :</b> ${o.discord || "—"}</p>
        <p><b>Serveur :</b> ${o.server || "—"}</p>
        <p><b>Membres :</b> ${o.members || "—"}</p>
        <p><b>Langue :</b> ${o.lang || "—"}</p>
        <p><b>Thème :</b> ${o.theme || "—"}</p>
        <p><b>Fonctions :</b> ${o.features || "—"}</p>
        <p><b>Description :</b> ${o.desc || "—"}</p>
        <p><b>Références :</b> ${o.refs || "—"}</p>
        <p><b>Délai :</b> ${o.delay || "—"}</p>
        <p><b>Budget :</b> ${o.budget || "—"}</p>
        <p><b>Extra :</b> ${o.extra || "—"}</p>
      </div>
      <button class="btn btn-blurple" onclick="Admin.closeDetail()">Fermer</button>
    </div>`;
    ov.classList.remove("hidden");
  },
  closeDetail() {
    const ov = document.getElementById("adminDetailOverlay");
    if (ov) ov.classList.add("hidden");
  },

  drawChart(orders) {
    const c = document.getElementById("devChart");
    if (!c) return;
    const ctx = c.getContext("2d");
    const days = [...Array(14)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d;
    });
    const sums = days.map(d =>
      orders.filter(o => new Date(o.date).toDateString() === d.toDateString())
            .reduce((s, o) => s + (o.price || 0), 0));
    const max = Math.max(1, ...sums);
    const W = c.width, H = c.height, pad = 20;
    const bw = (W - pad * 2) / days.length;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(pad, H - 30); ctx.lineTo(W - pad, H - 30); ctx.stroke();

    sums.forEach((v, i) => {
      const h = (v / max) * (H - 60);
      const x = pad + i * bw + bw * .2;
      const g = ctx.createLinearGradient(0, H - 30 - h, 0, H - 30);
      g.addColorStop(0, "#3BA55D"); g.addColorStop(1, "#5865F2");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, H - 30 - h, bw * .6, h, 4); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.font = "9px sans-serif"; ctx.textAlign = "center";
      if (i % 2 === 0) ctx.fillText(days[i].getDate() + "/" + (days[i].getMonth() + 1),
        pad + i * bw + bw * .5, H - 12);
    });
  },

  renderUsers() {
    const qs = (document.getElementById("devUserSearch")?.value || "").toLowerCase();
    let users = Store.users();
    if (qs) users = users.filter(u =>
      (u.username + " " + u.email + " " + (u.discord || "")).toLowerCase().includes(qs));

    const body = document.getElementById("devUsersBody");
    if (!body) return;
    body.innerHTML = users.map((u, i) => {
      const nOrders = Store.orders().filter(o => o.userId === u.id).length;
      return `<tr>
        <td>${i + 1}</td><td><b>${u.username}</b></td><td>${u.email}</td><td>${u.discord || "—"}</td>
        <td>${new Date(u.createdAt).toLocaleDateString("fr-FR")}</td><td>${nOrders}</td>
        <td>${isAdmin(u) ? "Dev" : "Membre"}</td>
        <td><button class="btn btn-danger" onclick="Admin.deleteUser('${u.id}')">🗑️</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="8" style="text-align:center;padding:24px" class="dim">Aucun utilisateur.</td></tr>`;
  },

  deleteUser(id) {
    if (id === user.id) return UI.toast("Impossible de supprimer votre propre compte ici.", true);
    if (!confirm("Supprimer cet utilisateur ?")) return;
    Store.saveUsers(Store.users().filter(u => u.id !== id));
    UI.toast("Utilisateur supprimé.");
    Admin.render();
  },

  renderMsgs() {
    const box = document.getElementById("devMsgs");
    if (!box) return;
    const msgs = [...Store.messages()].reverse();
    box.innerHTML = msgs.length ? msgs.map(m => `<div class="order-item">
      <div><b>${m.name} — ${m.sujet || "(sans sujet)"}</b><br>
      <small>${new Date(m.date).toLocaleString("fr-FR")} • ${m.reply || "—"}</small></div>
      <p style="max-width:50%">${m.msg}</p>
      <div class="d-actions">
        <button class="btn btn-ghost" onclick="Admin.markRead('${m.id}')">${m.read ? "✓ Lu" : "Marquer lu"}</button>
      </div>
    </div>`).join("") : `<p class="dim">Aucun message reçu.</p>`;
  },

  markRead(id) {
    const msgs = Store.messages();
    const m = msgs.find(x => x.id === id);
    if (m) { m.read = !m.read; Store.saveMessages(msgs); Admin.render(); }
  },

  exportCSV() {
    const rows = [["id", "utilisateur", "email", "discord", "offre", "prix", "serveur", "date", "statut"]];
    Store.orders().forEach(o => rows.push([o.id, o.username, o.email, o.discord || "", o.offerLabel,
      o.price, o.server || "", o.date, o.status]));
    Admin.download("commandes.csv",
      rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n"), "text/csv");
  },

  exportJSON() {
    Admin.download("backup.json", JSON.stringify({
      users: Store.users(), orders: Store.orders(), messages: Store.messages()
    }, null, 2), "application/json");
  },

  download(name, content, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    UI.toast("⬇️ " + name + " téléchargé.");
  },

  clearAll() {
    if (prompt("⚠️ TOUT effacer (commandes, messages, utilisateurs) ? Tapez OUI pour confirmer.") !== "OUI") return;
    localStorage.removeItem("cx_orders");
    localStorage.removeItem("cx_messages");
    localStorage.removeItem("cx_users");
    localStorage.removeItem("cx_adminUnlocked");
    sessionStorage.removeItem("cx_session");
    location.href = "index.html";
  }
};

// ---------- INIT DASHBOARD ----------
document.addEventListener("DOMContentLoaded", () => {
  Home.initTheme();
  UI.refreshNav();
  document.getElementById("ovHello").textContent = user.username;
  Dash.fillSettings();
  Dash.showAdminLink(isAdmin());
  const guard = document.createElement("div");
  // Accueil → vue d'ensemble active par défaut
  const first = document.querySelector(".side-link[data-tab='overview']");
  const orders = Store.orders().filter(o => o.userId === user.id);
  Dash.drawUserChart(orders);

  // si admin au chargement, prépare le rendu
  if (isAdmin()) Admin.render();
});
