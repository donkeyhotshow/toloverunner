/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Утилиты для создания и объединения геометрий
 * Централизованные функции для избежания дублирования кода
 */

import { BufferGeometry, IcosahedronGeometry, ConeGeometry, Object3D, Vector3, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry } from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

/**
 * Создает геометрию вируса с шипами и МУЛЬТЯШНЫМ ЛИЦОМ
 *
 * Использует Icosahedron для основного тела и Cone для шипов.
 * Добавляет глаза и рот для комикс-эффекта.
 */
export function createVirusGeometry(
  spikeCount: number = 12,
  icosaRadius: number = 0.6,
  spikeRadius: number = 0.15,
  spikeHeight: number = 0.6
): BufferGeometry {
  const icosaGeo = new IcosahedronGeometry(icosaRadius, 1);
  const coneGeo = new ConeGeometry(spikeRadius, spikeHeight, 8);
  const eyeGeo = new SphereGeometry(icosaRadius * 0.25, 8, 8);
  const pupilGeo = new SphereGeometry(icosaRadius * 0.1, 8, 8);
  const mouthGeo = new TorusGeometry(icosaRadius * 0.3, icosaRadius * 0.05, 8, 16, Math.PI); // Half circle

  // Pivot the cone
  const sink = 0.1;
  coneGeo.translate(0, spikeHeight / 2 - sink, 0);

  const icosaNonIndexed = icosaGeo.index ? icosaGeo.toNonIndexed() : icosaGeo;
  const coneNonIndexed = coneGeo.index ? coneGeo.toNonIndexed() : coneGeo;
  const eyeNonIndexed = eyeGeo.index ? eyeGeo.toNonIndexed() : eyeGeo;
  const pupilNonIndexed = pupilGeo.index ? pupilGeo.toNonIndexed() : pupilGeo;
  const mouthNonIndexed = mouthGeo.index ? mouthGeo.toNonIndexed() : mouthGeo;

  const geometries: BufferGeometry[] = [icosaNonIndexed];
  const dummy = new Object3D();

  // 1. Spikes
  for (let i = 0; i < spikeCount; i++) {
    const g = coneNonIndexed.clone();
    const phi = Math.acos(-1 + (2 * i) / spikeCount);
    const theta = Math.sqrt(spikeCount * Math.PI) * phi;
    const vector = new Vector3(Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi));
    const posOnSurface = vector.clone().multiplyScalar(icosaRadius);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(vector);
    dummy.rotateX(Math.PI / 2);
    dummy.updateMatrix();
    g.applyMatrix4(dummy.matrix);
    g.translate(posOnSurface.x, posOnSurface.y, posOnSurface.z);
    geometries.push(g);
  }

  // 2. Eyes (Slightly varied for "evil" look)
  for (const side of [-1, 1]) {
    // White eye
    const e = eyeNonIndexed.clone();
    e.translate(side * icosaRadius * 0.4, icosaRadius * 0.3, icosaRadius * 0.7);
    geometries.push(e);
    // Pupil (Evil dot)
    const p = pupilNonIndexed.clone();
    p.translate(side * icosaRadius * 0.4, icosaRadius * 0.3, icosaRadius * 0.9);
    geometries.push(p);
  }

  // 3. Angry Mouth
  const mouth = mouthNonIndexed.clone();
  mouth.rotateX(Math.PI); // Flip for frown
  mouth.translate(0, -icosaRadius * 0.2, icosaRadius * 0.82);
  geometries.push(mouth);

  const merged = mergeBufferGeometries(geometries);
  if (!merged) return icosaNonIndexed;
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Кэш для геометрий вирусов (избегаем пересоздания)
 */
const virusGeometryCache = new Map<string, BufferGeometry>();

/**
 * LOD конфигурация для геометрий вирусов
 */
export const VIRUS_LOD_CONFIG = {
  HIGH: { spikeCount: 12, icosaDetail: 1 },    // < 30 units
  MEDIUM: { spikeCount: 8, icosaDetail: 0 },   // 30-60 units
  LOW: { spikeCount: 4, icosaDetail: 0 },      // > 60 units
  DISTANCE_THRESHOLDS: { MEDIUM: 30, LOW: 60 }
};

/**
 * Создает упрощённую геометрию вируса для LOD
 */
export function createSimplifiedVirusGeometry(
  spikeCount: number = 6,
  icosaRadius: number = 0.6
): BufferGeometry {
  const icosaGeo = new IcosahedronGeometry(icosaRadius, 0);

  if (spikeCount <= 0) {
    icosaGeo.computeBoundingSphere();
    return icosaGeo.index ? icosaGeo.toNonIndexed() : icosaGeo;
  }

  // Упрощённые шипы - меньше полигонов
  const coneGeo = new ConeGeometry(0.12, 0.4, 4); // 4 сегмента вместо 8
  coneGeo.translate(0, 0.4, 0);

  const icosaNonIndexed = icosaGeo.index ? icosaGeo.toNonIndexed() : icosaGeo;
  const coneNonIndexed = coneGeo.index ? coneGeo.toNonIndexed() : coneGeo;

  const geometries: BufferGeometry[] = [icosaNonIndexed];
  const dummy = new Object3D();

  for (let i = 0; i < spikeCount; i++) {
    const g = coneNonIndexed.clone();
    const phi = Math.acos(-1 + (2 * i) / spikeCount);
    const theta = Math.sqrt(spikeCount * Math.PI) * phi;
    const vector = new Vector3(
      icosaRadius * Math.cos(theta) * Math.sin(phi),
      icosaRadius * Math.sin(theta) * Math.sin(phi),
      icosaRadius * Math.cos(phi)
    );

    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.lookAt(vector);
    dummy.rotateX(Math.PI / 2);
    dummy.updateMatrix();

    g.applyMatrix4(dummy.matrix);
    g.translate(vector.x, vector.y, vector.z);
    geometries.push(g);
  }

  const merged = mergeBufferGeometries(geometries);
  if (!merged) {
    icosaNonIndexed.computeBoundingSphere();
    return icosaNonIndexed;
  }

  merged.computeBoundingSphere();
  return merged;
}

/**
 * Получить или создать геометрию вируса с кэшированием
 *
 * @param key Ключ кэша (например, "default" или "small")
 * @param spikeCount Количество шипов
 * @returns Геометрия вируса
 */
export function getVirusGeometry(
  key: string = 'default',
  spikeCount: number = 12
): BufferGeometry {
  const cacheKey = `${key}-${spikeCount}`;

  if (!virusGeometryCache.has(cacheKey)) {
    const geometry = createVirusGeometry(spikeCount);
    virusGeometryCache.set(cacheKey, geometry);
  }

  return virusGeometryCache.get(cacheKey)!;
}

/**
 * Получить LOD геометрию вируса по дистанции
 */
export function getVirusGeometryLOD(distance: number): BufferGeometry {
  const { DISTANCE_THRESHOLDS } = VIRUS_LOD_CONFIG;

  if (distance > DISTANCE_THRESHOLDS.LOW) {
    return getVirusGeometry('lod-low', VIRUS_LOD_CONFIG.LOW.spikeCount);
  }
  if (distance > DISTANCE_THRESHOLDS.MEDIUM) {
    return getVirusGeometry('lod-medium', VIRUS_LOD_CONFIG.MEDIUM.spikeCount);
  }
  return getVirusGeometry('lod-high', VIRUS_LOD_CONFIG.HIGH.spikeCount);
}

/**
 * Предзагрузить все LOD геометрии
 */
export function preloadVirusLODGeometries(): void {
  getVirusGeometry('lod-high', VIRUS_LOD_CONFIG.HIGH.spikeCount);
  getVirusGeometry('lod-medium', VIRUS_LOD_CONFIG.MEDIUM.spikeCount);
  getVirusGeometry('lod-low', VIRUS_LOD_CONFIG.LOW.spikeCount);
}

/**
 * Создает геометрию "шипастого цилиндра" (преграда типа "валик")
 */
export function createCylinderObstacleGeometry(
  spikeCount: number = 10,
  radius: number = 0.5,
  height: number = 1.2
): BufferGeometry {
  const coreGeo = new CylinderGeometry(radius, radius, height, 12);
  const coreNonIndexed = coreGeo.index ? coreGeo.toNonIndexed() : coreGeo;

  const spikeRadius = 0.15;
  const spikeHeight = 0.5;
  const coneGeo = new ConeGeometry(spikeRadius, spikeHeight, 6);
  const sink = 0.1;
  coneGeo.translate(0, spikeHeight / 2 - sink, 0);
  const coneNonIndexed = coneGeo.index ? coneGeo.toNonIndexed() : coneGeo;

  const geometries: BufferGeometry[] = [coreNonIndexed];
  const dummy = new Object3D();

  for (let i = 0; i < spikeCount; i++) {
    const g = coneNonIndexed.clone();

    // Random placement along cylinder surface
    const angle = (i / spikeCount) * Math.PI * 2;
    const h = (Math.random() - 0.5) * height;

    dummy.position.set(0, h, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.rotateY(angle);
    dummy.rotateZ(-Math.PI / 2); // Point outward from cylinder side
    dummy.updateMatrix();

    g.applyMatrix4(dummy.matrix);
    // Position on cylinder radius
    g.translate(Math.cos(angle) * radius, h, Math.sin(angle) * radius);
    geometries.push(g);
  }

  const merged = mergeBufferGeometries(geometries);
  merged?.computeBoundingSphere();
  return merged || coreNonIndexed;
}

/**
 * Создает геометрию "шипастого куба"
 */
export function createBoxObstacleGeometry(
  size: number = 1.0,
  spikesPerFace: number = 2
): BufferGeometry {
  const coreGeo = new BoxGeometry(size, size, size);
  const coreNonIndexed = coreGeo.index ? coreGeo.toNonIndexed() : coreGeo;

  const spikeRadius = 0.15;
  const spikeHeight = 0.4;
  const coneGeo = new ConeGeometry(spikeRadius, spikeHeight, 6);
  coneGeo.translate(0, spikeHeight / 2 - 0.05, 0);
  const coneNonIndexed = coneGeo.index ? coneGeo.toNonIndexed() : coneGeo;

  const geometries: BufferGeometry[] = [coreNonIndexed];
  const half = size / 2;

  // Directions for 6 faces
  const faces = [
    { pos: [half, 0, 0], rot: [0, 0, -Math.PI / 2] }, // Right
    { pos: [-half, 0, 0], rot: [0, 0, Math.PI / 2] },  // Left
    { pos: [0, half, 0], rot: [0, 0, 0] },           // Top
    { pos: [0, -half, 0], rot: [Math.PI, 0, 0] },    // Bottom
    { pos: [0, 0, half], rot: [Math.PI / 2, 0, 0] },   // Front
    { pos: [0, 0, -half], rot: [-Math.PI / 2, 0, 0] }  // Back
  ];

  faces.forEach(face => {
    for (let i = 0; i < spikesPerFace; i++) {
      const g = coneNonIndexed.clone();
      const dummy = new Object3D();
      // Ensure rotation values exist before setting
      const rotX = face.rot[0] ?? 0;
      const rotY = face.rot[1] ?? 0;
      const rotZ = face.rot[2] ?? 0;
      dummy.rotation.set(rotX, rotY, rotZ);

      // Random offset on face
      const off1 = (Math.random() - 0.5) * size * 0.7;
      const off2 = (Math.random() - 0.5) * size * 0.7;

      let x = face.pos[0] ?? 0;
      let y = face.pos[1] ?? 0;
      let z = face.pos[2] ?? 0;

      if (Math.abs(x) > 0.1) { y += off1; z += off2; }
      else if (Math.abs(y) > 0.1) { x += off1; z += off2; }
      else { x += off1; y += off2; }

      dummy.updateMatrix();
      g.applyMatrix4(dummy.matrix);
      g.translate(x, y, z);
      geometries.push(g);
    }
  });

  const merged = mergeBufferGeometries(geometries);
  merged?.computeBoundingSphere();
  return merged || coreNonIndexed;
}

const cylinderCache = new Map<string, BufferGeometry>();
const boxCache = new Map<string, BufferGeometry>();

export function getCylinderObstacle(key: string): BufferGeometry {
  if (!cylinderCache.has(key)) cylinderCache.set(key, createCylinderObstacleGeometry());
  return cylinderCache.get(key)!;
}

export function getBoxObstacle(key: string): BufferGeometry {
  if (!boxCache.has(key)) boxCache.set(key, createBoxObstacleGeometry());
  return boxCache.get(key)!;
}

/**
 * Очистить кэш геометрий (для освобождения памяти)
 */
export function clearGeometryCache(): void {
  virusGeometryCache.forEach(geo => geo.dispose());
  virusGeometryCache.clear();
  cylinderCache.forEach(geo => geo.dispose());
  cylinderCache.clear();
  boxCache.forEach(geo => geo.dispose());
  boxCache.clear();
}
