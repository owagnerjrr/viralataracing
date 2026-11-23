import { Vector3, MathUtils } from "three";

export const PHYSICS_STEP = 1 / 120;

const surfaces = {
  road: { grip: 12, speed: 27, drag: 6.8 },
  dirt: { grip: 7.4, speed: 23, drag: 8.2 },
  grass: { grip: 4.8, speed: 13, drag: 12 },
};

export class ArcadeVehicle {
  constructor() {
    this.motion = new Vector3();
    this.forward = new Vector3();
    this.side = new Vector3();
    this.reset();
  }

  reset() {
    this.motion.set(0, 0, 0);
    this.steer = this.lateral = this.pitch = this.roll = this.heave = 0;
    this.pitchRate = this.rollRate = this.heaveRate = 0;
  }

  step(
    dt,
    {
      heading,
      speed,
      turn,
      throttle,
      brake,
      surface,
      drifting,
      driftSide,
      air,
      boostedSpeed,
      stunned,
    },
  ) {
    const ground = surfaces[surface];
    const before = speed;
    const direction = Math.sign(speed || 1);
    const traction = air ? 0.22 : 1;
    this.steer = MathUtils.damp(this.steer, turn, turn ? 31 : 36, dt);

    let force = -direction * ground.drag;
    if (throttle && !brake) {
      force = 26 - 10 * MathUtils.clamp(speed / ground.speed, 0, 1);
    } else if (brake) {
      force = speed > 0 ? -33 : -17;
    }
    const boosting =
      boostedSpeed > 0 && surface !== "grass" && !brake && !stunned;
    if (boosting) force += 29;
    if (stunned) force = -speed * 3.4;
    const limit =
      surface === "grass"
        ? ground.speed
        : Math.max(boostedSpeed, drifting ? 21 : ground.speed);
    if (
      !throttle &&
      !brake &&
      !boosting &&
      !stunned &&
      Math.abs(speed) < Math.abs(force * dt)
    )
      speed = 0;
    else speed += force * traction * dt;
    // Speed caps bleed with drag so a surface transition preserves momentum.
    if (speed > limit) {
      speed =
        boosting || before <= limit
          ? limit
          : MathUtils.damp(before, limit, 8, dt);
    }
    if (speed < -9) speed = -9;

    const steerStrength = Math.min(1, Math.abs(speed) / 8.5);
    const yaw = drifting
      ? driftSide * (0.61 + 0.26 * this.steer * driftSide)
      : this.steer * 1.29;
    const oldHeading = heading;
    heading -= yaw * dt * steerStrength * direction * (air ? 0.38 : 1);
    this.forward.set(Math.sin(heading), 0, Math.cos(heading));
    this.side.set(Math.cos(heading), 0, -Math.sin(heading));

    // Express retained momentum in the rotated chassis frame, then apply tire grip.
    const yawDelta = oldHeading - heading;
    const retained =
      this.lateral * Math.cos(yawDelta) + before * Math.sin(yawDelta);
    const intent = drifting ? speed * driftSide * 0.24 : 0;
    const grip = ground.grip * (air ? 0.08 : drifting ? 0.46 : 1);
    this.lateral = MathUtils.damp(retained, intent, grip, dt);
    this.motion
      .copy(this.forward)
      .multiplyScalar(speed)
      .addScaledVector(this.side, this.lateral);

    const longitudinalLoad = MathUtils.clamp((speed - before) / dt / 31, -1, 1);
    const lateralLoad = MathUtils.clamp(
      (-yaw * steerStrength * speed) / 19,
      -1,
      1,
    );
    this.pitchRate +=
      ((longitudinalLoad * 0.11 - this.pitch) * 96 - this.pitchRate * 14) * dt;
    this.rollRate +=
      ((lateralLoad * 0.18 - this.roll) * 105 - this.rollRate * 15) * dt;
    this.heaveRate += (-this.heave * 145 - this.heaveRate * 16) * dt;
    this.pitch += this.pitchRate * dt;
    this.roll += this.rollRate * dt;
    this.heave += this.heaveRate * dt;
    return { heading, speed };
  }

  resolveContact(strength) {
    this.lateral = this.motion.dot(this.side);
    const speed = this.motion.dot(this.forward);
    if (strength > 3) {
      this.pitchRate -= Math.min(1.5, strength * 0.075);
      this.heaveRate -= Math.min(1.8, strength * 0.075);
    }
    return speed;
  }

  touchDown(verticalSpeed) {
    this.heaveRate -= Math.min(3, Math.abs(verticalSpeed) * 0.28);
    this.pitchRate -= Math.min(1.3, Math.abs(verticalSpeed) * 0.12);
  }
}
