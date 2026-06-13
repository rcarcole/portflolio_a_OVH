console.log("[APP] running JS from:", document.currentScript?.src);
console.log("[APP] location:", window.location.pathname);

document.addEventListener("DOMContentLoaded", function () {
  console.log("[APP] DOMContentLoaded");

  // ====== Frases ======
  const FRASES = [
    "Desde aquel 2023 entendí que quiero quedarme contigo.",
    "El 1 de noviembre no fue solo un beso: fue una decisión.",
    "Hemos tenido días torcidos y días redondos; quiero que pesen más los buenos porque los cuidamos juntos.",
    "A veces mi carácter te apaga. No quiero eso. Me comprometo a cuidar tu alegría.",
    "Quiero hablarte con la misma claridad con la que te amo cuando actúo.",
    "Respeto es también escuchar y corregirme. Estoy en ello, día a día.",
    "No quiero que te vayas: quiero que te quedes porque te sientes bien conmigo.",
    "Eres luz y risa; yo pondré el abrigo y el lugar seguro.",
    "Me propongo merecerte cada día: con paciencia, detalles y presencia.",
    "Lo digo y lo haré más a menudo: te quiero, y elijo construir contigo.",
  ];
  console.log("[APP] FRASES length:", FRASES.length);

  function renderFrases() {
    console.log("[FRAS] renderFrases() start");
    const cont = document.getElementById("frasesContainer");
    if (!cont) {
      console.warn("[FRAS] #frasesContainer NOT FOUND");
      return;
    }
    const btn = cont.querySelector("button");
    if (!btn) console.warn("[FRAS] Button inside #frasesContainer NOT FOUND");

    const frag = document.createDocumentFragment();
    FRASES.forEach((t, i) => {
      const p = document.createElement("p");
      p.style.textAlign = i <= 1 ? "center" : "left";
      p.textContent = t;
      frag.appendChild(p);
    });
    cont.insertBefore(frag, btn || null);
    console.log("[FRAS] renderFrases() done");
  }
  renderFrases();

  // ====== Sobre / Carta ======
  const envelope = document.querySelector(".envelope");
  const letter = document.getElementById("letter");
  const dearZhara = document.getElementById("dearZhara");
  console.log(
    "[ENV] envelope:",
    !!envelope,
    "letter:",
    !!letter,
    "dearZhara:",
    !!dearZhara
  );

  function openEnvelope(src = "unknown") {
    console.log(`[ENV] openEnvelope() called by: ${src}`);
    if (!envelope || !letter) {
      console.error("[ENV] envelope or letter missing");
      return;
    }
    console.log(
      "[ENV] before => envelope-open:",
      envelope.classList.contains("envelope-open"),
      "letter-visible:",
      letter.classList.contains("letter-visible")
    );
    if (!envelope.classList.contains("envelope-open")) {
      envelope.classList.add("envelope-open");
    }
    letter.classList.add("letter-visible");
    console.log(
      "[ENV] after  => envelope-open:",
      envelope.classList.contains("envelope-open"),
      "letter-visible:",
      letter.classList.contains("letter-visible")
    );
  }

  // Click / mantener pulsado sobre el sobre o el texto
  if (envelope) {
    envelope.addEventListener("click", () => {
      console.log("[EVT] envelope click");
      openEnvelope("envelope:click");
    });
    envelope.addEventListener("mousedown", () => {
      console.log("[EVT] envelope mousedown");
      openEnvelope("envelope:mousedown");
    });
    envelope.addEventListener(
      "touchstart",
      () => {
        console.log("[EVT] envelope touchstart");
        openEnvelope("envelope:touchstart");
      },
      { passive: true }
    );
  } else {
    console.warn("[ENV] .envelope NOT FOUND");
  }

  if (dearZhara) {
    dearZhara.addEventListener("click", () => {
      console.log("[EVT] dearZhara click");
      openEnvelope("dearZhara:click");
    });
    dearZhara.addEventListener("mousedown", () => {
      console.log("[EVT] dearZhara mousedown");
      openEnvelope("dearZhara:mousedown");
    });
    dearZhara.addEventListener(
      "touchstart",
      () => {
        console.log("[EVT] dearZhara touchstart");
        openEnvelope("dearZhara:touchstart");
      },
      { passive: true }
    );
  } else {
    console.warn("[ENV] #dearZhara NOT FOUND");
  }

  // ====== Modal ======
  const btnSi = document.getElementById("btnSi");
  const btnNo = document.getElementById("btnNo");
  const miModalEl = document.getElementById("miModal");
  console.log(
    "[MODAL] btnSi:",
    !!btnSi,
    "btnNo:",
    !!btnNo,
    "miModalEl:",
    !!miModalEl
  );

  // Escucha eventos de Bootstrap para ver si el modal se cierra
  if (miModalEl) {
    [
      "show.bs.modal",
      "shown.bs.modal",
      "hide.bs.modal",
      "hidden.bs.modal",
    ].forEach((evt) => {
      miModalEl.addEventListener(evt, () => console.log(`[MODAL EVT] ${evt}`));
    });
  }

  let miModal = null;
  try {
    if (miModalEl) {
      miModal = bootstrap.Modal.getOrCreateInstance(miModalEl, {
        backdrop: "static",
        keyboard: false,
      });
      console.log("[MODAL] instance created:", !!miModal);
    }
  } catch (err) {
    console.error("[MODAL] error creating bootstrap modal instance:", err);
  }

  if (miModalEl) {
    miModalEl.addEventListener("click", (e) => {
      console.log("[EVT] modal click stopPropagation target:", e.target);
      e.stopPropagation();
    });
    miModalEl.addEventListener("mousedown", (e) => {
      console.log("[EVT] modal mousedown stopPropagation target:", e.target);
      e.stopPropagation();
    });
    miModalEl.addEventListener(
      "touchstart",
      (e) => {
        console.log("[EVT] modal touchstart stopPropagation target:", e.target);
        e.stopPropagation();
      },
      { passive: true }
    );
  }

  // Listener global para ver clicks “raros”
  document.addEventListener(
    "click",
    (e) => {
      const tag = e.target?.tagName;
      const id = e.target?.id ? `#${e.target.id}` : "";
      const cls = e.target?.className ? `.${e.target.className}` : "";
      console.log("[DOC CLICK]", tag, id, cls);
    },
    true
  ); // capture para verlo antes de bubbling

  // ====== Alert helpers ======
  function showAlert(type, html) {
    console.log("[ALERT] showAlert type:", type);
    const alertPlaceholder = document.getElementById("liveAlertPlaceholder");
    if (!alertPlaceholder) {
      console.error("[ALERT] #liveAlertPlaceholder NOT FOUND");
      return;
    }
    alertPlaceholder.innerHTML = `
      <div id="inlineAlert" class="alert alert-${type} alert-dismissible show" role="alert">
        ${html}
        <button type="button" class="btn-close" aria-label="Close" id="inlineAlertClose"></button>
      </div>
    `;
    console.log("[ALERT] injected into #liveAlertPlaceholder");
    const closeBtn = document.getElementById("inlineAlertClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        console.log("[ALERT] inlineAlertClose clicked -> removing");
        const a = document.getElementById("inlineAlert");
        if (a) a.remove();
      });
    }
  }

  function showFixedAlert(type, html) {
    console.log("[ALERT] showFixedAlert type:", type);
    const fixed = document.getElementById("fixedAlert");
    if (!fixed) {
      console.warn("[ALERT] #fixedAlert NOT FOUND (opcional)");
      return;
    }
    fixed.innerHTML = `
      <div id="fixedAlertBox" class="alert alert-${type} alert-dismissible show shadow" role="alert" style="margin:0;">
        ${html}
        <button type="button" class="btn-close" aria-label="Close" id="fixedAlertClose"></button>
      </div>
    `;
    fixed.style.display = "block";
    console.log("[ALERT] fixed alert visible");
    const closer = document.getElementById("fixedAlertClose");
    if (closer) {
      closer.onclick = () => {
        console.log("[ALERT] fixedAlertClose clicked -> hide");
        fixed.style.display = "none";
        fixed.innerHTML = "";
      };
    }
  }

  // Botón "Sí"
  if (btnSi) {
    btnSi.addEventListener("click", function (e) {
      console.log("[BTN] SI click");
      e.stopPropagation();
      // Usa UNO de los dos:
      showAlert(
        "success",
        "<strong>Entonces sigamos: con respeto, alegría y muchos besos.</strong>"
      );
      // showFixedAlert("success", "<strong>Entonces sigamos: con respeto, alegría y muchos besos.</strong>");
      launchFireworks();
    });
  } else {
    console.warn("[BTN] #btnSi NOT FOUND");
  }

  // Botón "No"
  if (btnNo) {
    btnNo.addEventListener("click", function (e) {
      console.log("[BTN] NO click");
      e.stopPropagation();
      showAlert(
        "danger",
        "<strong>Vale, lo hablamos con calma. Yo estoy aquí para mejorar.</strong>"
      );
    });
  } else {
    console.warn("[BTN] #btnNo NOT FOUND");
  }

  // ====== Fuegos artificiales ======
  function launchFireworks() {
    console.log("[FW] launchFireworks()");
    const canvas = document.getElementById("fireworks");
    if (!canvas) {
      console.error("[FW] #fireworks NOT FOUND");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[FW] cannot getContext('2d')");
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log("[FW] canvas size:", canvas.width, canvas.height);

    let particles = [];

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createFirework(x, y) {
      console.log("[FW] createFirework at:", x, y);
      const count = 50;
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          angle: random(0, 2 * Math.PI),
          speed: random(2, 6),
          radius: random(2, 4),
          life: random(50, 100),
          color: `hsl(${random(0, 360)}, 100%, 60%)`,
        });
      }
      console.log("[FW] particles now:", particles.length);
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.life--;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (p.life <= 0) particles.splice(i, 1);
      }

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log("[FW] animation end (no particles)");
      }
    }

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (!canvas) return;
        createFirework(
          random(100, canvas.width - 100),
          random(100, canvas.height / 2)
        );
        animate();
      }, i * 600);
    }
  }

  // Redimensionar canvas si cambia la ventana
  window.addEventListener("resize", () => {
    const canvas = document.getElementById("fireworks");
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log("[FW] resize canvas to:", canvas.width, canvas.height);
    }
  });

  // ====== Sanity checks finales ======
  console.log(
    "[CHK] envelope-open?",
    envelope?.classList.contains("envelope-open")
  );
  console.log(
    "[CHK] letter-visible?",
    letter?.classList.contains("letter-visible")
  );
});
