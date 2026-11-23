const storageKey = "vira-lata-mobile-controls-v1";

export const defaultMobileSettings = Object.freeze({
  size: 100,
  opacity: 72,
  auto: true,
  inverted: false,
});

export function normalizeMobileSettings(value) {
  const bounded = (candidate, fallback, min, max) =>
    Number.isFinite(candidate)
      ? Math.round(Math.min(max, Math.max(min, candidate)))
      : fallback;
  return {
    size: bounded(value?.size, defaultMobileSettings.size, 80, 125),
    opacity: bounded(value?.opacity, defaultMobileSettings.opacity, 30, 100),
    auto:
      typeof value?.auto === "boolean"
        ? value.auto
        : defaultMobileSettings.auto,
    inverted: value?.inverted === true,
  };
}

export class PointerCommands {
  #byPointer = new Map();
  #counts = new Map();

  set(id, command) {
    if (this.#byPointer.get(id) === command) return;
    this.release(id);
    this.#byPointer.set(id, command);
    this.#counts.set(command, (this.#counts.get(command) ?? 0) + 1);
  }

  release(id) {
    const command = this.#byPointer.get(id);
    if (!command) return undefined;
    this.#byPointer.delete(id);
    const count = this.#counts.get(command);
    if (count === 1) this.#counts.delete(command);
    else this.#counts.set(command, count - 1);
    return command;
  }

  held(command) {
    return this.#counts.has(command);
  }

  clear() {
    this.#byPointer.clear();
    this.#counts.clear();
  }
}

export function createMobileControls(
  panel,
  settingsForm,
  { active, onCancelDrift, itemIcons },
) {
  const phone = matchMedia("(any-pointer: coarse)");
  const commands = new PointerCommands();
  const origins = new Map();
  const keys = [...panel.querySelectorAll("[data-key]")];
  const direction = panel.querySelector(".touch-direction");
  const itemButton = panel.querySelector("[data-action=item]");
  const itemIcon = itemButton.querySelector(".touch-item-icon");
  const driftButton = panel.querySelector("[data-key=Space]");
  const [size, opacity, auto, inverted] = [
    "size",
    "opacity",
    "auto",
    "inverted",
  ].map((name) => settingsForm.querySelector("[name=" + name + "]"));
  const readSettings = () => {
    try {
      return normalizeMobileSettings(
        JSON.parse(localStorage.getItem(storageKey)),
      );
    } catch {
      return normalizeMobileSettings(null);
    }
  };
  let preferences = readSettings();
  function applySettings() {
    panel.style.setProperty("--touch-scale", preferences.size / 100);
    panel.style.setProperty("--touch-opacity", preferences.opacity / 100);
    panel.classList.toggle("inverted", preferences.inverted);
    panel.classList.toggle("automatic", preferences.auto && phone.matches);
    size.value = preferences.size;
    opacity.value = preferences.opacity;
    auto.checked = preferences.auto;
    inverted.checked = preferences.inverted;
    for (const field of [size, opacity]) {
      settingsForm.querySelector("output[for=" + field.id + "]").value =
        field.value + "%";
    }
  }
  function save(value) {
    preferences = normalizeMobileSettings(value);
    applySettings();
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      /* Storage may be unavailable. */
    }
  }
  settingsForm.addEventListener("input", () =>
    save({
      size: size.valueAsNumber,
      opacity: opacity.valueAsNumber,
      auto: auto.checked,
      inverted: inverted.checked,
    }),
  );
  settingsForm
    .querySelector("[data-mobile-defaults]")
    .addEventListener("click", () => save(defaultMobileSettings));
  applySettings();
  phone.addEventListener("change", applySettings);

  function updatePressed() {
    for (const button of keys) {
      button.classList.toggle("is-held", commands.held(button.dataset.key));
    }
  }

  for (const button of keys) {
    button.addEventListener("pointerdown", (event) => {
      if (!active() || event.button !== 0) return;
      event.preventDefault();
      origins.set(event.pointerId, button);
      commands.set(event.pointerId, button.dataset.key);
      button.setPointerCapture(event.pointerId);
      updatePressed();
    });
    button.addEventListener("pointermove", (event) => {
      if (
        origins.get(event.pointerId) !== button ||
        !direction.contains(button)
      )
        return;
      const underFinger = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-key]");
      if (!underFinger || !direction.contains(underFinger)) return;
      commands.set(event.pointerId, underFinger.dataset.key);
      updatePressed();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      button.addEventListener(type, (event) => {
        if (origins.get(event.pointerId) !== button) return;
        origins.delete(event.pointerId);
        const release = commands.release(event.pointerId);
        updatePressed();
        if (
          release === "Space" &&
          type !== "pointerup" &&
          !commands.held("Space")
        ) {
          onCancelDrift();
        }
      });
    }
  }
  panel.addEventListener("contextmenu", (event) => event.preventDefault());

  let displayedItem;
  return {
    held: (command) => commands.held(command),
    autoAccelerate: () => preferences.auto && phone.matches,
    clear() {
      const captures = [...origins];
      origins.clear();
      commands.clear();
      updatePressed();
      for (const [id, button] of captures) {
        if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
      }
    },
    update({ item, tier, activeDrift, charge }) {
      if (driftButton.dataset.tier !== String(tier))
        driftButton.dataset.tier = tier;
      driftButton.classList.toggle("is-drifting", activeDrift);
      const meter = driftButton.querySelector("progress");
      meter.hidden = !activeDrift;
      if (activeDrift && meter.value !== charge) meter.value = charge;
      if (displayedItem === item) return;
      displayedItem = item;
      itemButton.disabled = !item;
      itemButton.setAttribute(
        "aria-label",
        item ? "Usar " + itemIcons[item].label : "Sem item disponível",
      );
      itemIcon.innerHTML = item ? itemIcons[item].html : "—";
    },
  };
}
