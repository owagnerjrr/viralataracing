const status = document.getElementById("race-status");

import("./main.js").catch((error) => {
  console.error("Falha ao inicializar Dupla Kart", error);
  status.textContent = error.message.includes("WebGL")
    ? "WebGL 2 indisponível. Confira a aceleração gráfica ou tente outro navegador."
    : "Não foi possível carregar o circuito. Recarregue a página.";
});
