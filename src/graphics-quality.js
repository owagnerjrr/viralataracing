const key = "vira-lata-graphics-v1";
export const graphicsPresets = {
  low: {
    ratio: 0.78,
    shadow: 0,
    interval: Infinity,
    particles: 8,
    emission: 0.105,
    detail: 28,
    light: 0.39,
  },
  medium: {
    ratio: 1,
    shadow: 768,
    interval: 0.145,
    particles: 16,
    emission: 0.07,
    detail: 45,
    light: 0.46,
  },
  high: {
    ratio: 1.6,
    shadow: 1536,
    interval: 0.05,
    particles: 32,
    emission: 0.035,
    detail: 83,
    light: 0.53,
  },
};
const names = Object.keys(graphicsPresets);

export class AdaptiveQuality {
  constructor(initial = "medium", max = "high") {
    this.level = names.indexOf(initial);
    this.max = names.indexOf(max);
    this.reset();
  }

  reset() {
    this.slow = this.fast = 0;
    this.average = 1 / 45;
  }

  sample(seconds) {
    if (!(seconds > 0 && seconds < 1.5)) {
      this.reset();
      return;
    }
    seconds = Math.min(seconds, 0.25);
    this.average += (seconds - this.average) * (1 - Math.exp(-seconds * 3));
    this.slow = this.average > 1 / 28 ? this.slow + seconds : 0;
    this.fast = this.average < 1 / 54 ? this.fast + seconds : 0;
    if (this.slow >= 2.6 && this.level > 0) {
      this.level--;
    } else if (this.fast >= 8 && this.level < this.max) {
      this.level++;
    } else {
      return;
    }
    this.reset();
    return names[this.level];
  }
}

export function createGraphicsQuality(select, { mobile, apply }) {
  const initial = mobile ? "medium" : "high";
  const monitor = new AdaptiveQuality(initial, mobile ? "medium" : "high");
  let choice = "auto";
  try {
    const saved = localStorage.getItem(key);
    if (names.includes(saved)) choice = saved;
  } catch {
    /* Storage may be blocked. */
  }
  let current;
  let level;
  function setQuality(name) {
    if (level === name) return;
    level = name;
    current = graphicsPresets[name];
    select.dataset.active = name;
    apply(current);
  }
  select.value = choice;
  select.addEventListener("change", () => {
    choice = select.value;
    monitor.level = names.indexOf(initial);
    monitor.reset();
    setQuality(choice === "auto" ? initial : choice);
    try {
      localStorage.setItem(key, choice);
    } catch {
      /* Storage may be blocked. */
    }
  });
  setQuality(choice === "auto" ? initial : choice);
  return {
    get current() {
      return current;
    },
    sample(seconds) {
      if (choice !== "auto") return;
      const next = monitor.sample(seconds);
      if (next) setQuality(next);
    },
    resetTiming: () => monitor.reset(),
  };
}
