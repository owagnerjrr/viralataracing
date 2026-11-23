// Static XZ collision with a three-circle chassis and a bounded movement step.
const radius = 0.92;
const chassisOffsets = [-1.25, 0, 1.25];

export function rectangle(x, z, width, length, angle, height) {
  return {
    x,
    z,
    halfWidth: width / 2,
    halfLength: length / 2,
    sin: Math.sin(angle),
    cos: Math.cos(angle),
    height,
    reach: Math.hypot(width, length) / 2 + 2.3,
  };
}

export function trunk(x, z, radius, height) {
  return { x, z, radius, height, reach: radius + 2.3 };
}

function contact(x, z, solid) {
  const dx = x - solid.x;
  const dz = z - solid.z;
  if (solid.radius !== undefined) {
    const distance = Math.hypot(dx, dz);
    const depth = radius + solid.radius - distance;
    return depth > 0
      ? [distance ? dx / distance : 1, distance ? dz / distance : 0, depth]
      : null;
  }

  const { cos, sin, halfWidth, halfLength } = solid;
  const u = dx * cos - dz * sin;
  const v = dx * sin + dz * cos;
  let nx = u - Math.max(-halfWidth, Math.min(u, halfWidth));
  let nz = v - Math.max(-halfLength, Math.min(v, halfLength));
  const distance = Math.hypot(nx, nz);
  if (distance >= radius) return null;
  let depth = radius - distance;
  if (distance > 0) {
    nx /= distance;
    nz /= distance;
  } else if (halfWidth - Math.abs(u) < halfLength - Math.abs(v)) {
    nx = Math.sign(u) || 1;
    depth += halfWidth - Math.abs(u);
  } else {
    nz = Math.sign(v) || 1;
    depth += halfLength - Math.abs(v);
  }
  return [nx * cos + nz * sin, -nx * sin + nz * cos, depth];
}

export function moveKart(position, motion, heading, y, dt, solids) {
  const stepCount = Math.max(
    1,
    Math.ceil((Math.hypot(motion.x, motion.z) * dt) / 0.22),
  );
  const stepTime = dt / stepCount;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  let impact = 0;
  for (let step = 0; step < stepCount; step++) {
    position.addScaledVector(motion, stepTime);
    const nearby = solids.filter(
      (solid) =>
        y + 0.12 < solid.height &&
        Math.abs(solid.x - position.x) < solid.reach &&
        Math.abs(solid.z - position.z) < solid.reach,
    );
    for (let pass = 0; pass < 4; pass++) {
      let corrected = false;
      for (const solid of nearby) {
        for (const offset of chassisOffsets) {
          const hit = contact(
            position.x + fx * offset,
            position.z + fz * offset,
            solid,
          );
          if (!hit) continue;
          const [nx, nz, depth] = hit;
          position.x += nx * (depth + 0.001);
          position.z += nz * (depth + 0.001);
          const inward = motion.x * nx + motion.z * nz;
          if (inward < 0) {
            impact = Math.max(impact, -inward);
            motion.x -= inward * nx * 1.12;
            motion.z -= inward * nz * 1.12;
            motion.multiplyScalar(0.91);
          }
          corrected = true;
        }
      }
      if (!corrected) break;
    }
  }
  return impact;
}
