/* ============================================================
   PayPal — Intégration paiement
   Remplace CLIENT_ID par ton ID client PayPal Developer
   (developer.paypal.com → Apps & Credentials → Live/Client ID)
   Système extensible : d'autres moyens de paiement pourront
   essere ajoutés ici (Stipe, Crypto, etc.)
   ============================================================ */

const Payments = {
  // ⚙️ CONFIGURATION — à modifier
  config: {
    clientId: "AUG_TEST_CLIENT_ID", // ← remplace par ton vrai Client ID PayPal
    currency: "USD",
    sandbox: true, // true = mode test, false = production
  },

  prices: { "gratuit": 0, "bot-brut": 1, "bot-perso": 2 },

  /**
   * Charge le SDK PayPal et affiche les boutons dans #containerId
   * amount : prix en USD
   * onApproved : callback appelé quand le paiement est réussi
   */
  renderButton(containerId, amount, onApproved) {
    if (amount <= 0) return; // offre gratuite = pas de paiement

    const loadSDK = () => {
      const old = document.getElementById("paypal-sdk");
      if (old) old.remove();
      const s = document.createElement("script");
      s.id = "paypal-sdk";
      s.src = `https://www.paypal.com/sdk/js?client-id=${this.config.clientId}&currency=${this.config.currency}`;
      s.onload = () => {
        if (!window.paypal) {
          document.getElementById(containerId).innerHTML =
            "<p class='pay-dim'>⚠️ Mode démonstration : connecte ton Client ID PayPal pour activer le paiement réel.</p>";
          return;
        }
        paypal.Buttons({
          style: { layout: "vertical", color: "blue", shape: "rect", label: "paypal" },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                description: "Création Expert | Studio",
                amount: { value: amount.toFixed(2), currency_code: this.config.currency }
              }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then(details => {
              onApproved(details);
            });
          }
        }).render("#" + containerId);
      };
      document.body.appendChild(s);
    };
    loadSDK();
  }
};
