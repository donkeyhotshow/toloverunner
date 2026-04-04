/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Optimized scheduler for batching instanced mesh buffer updates.
 * Collects all updates during a frame and flushes once at the end,
 * avoiding multiple GPU syncs per frame.
 *
 * Optimizations:
 * - Uses arrays instead of Sets for faster iteration
 * - Deduplication via WeakSet (no memory leaks)
 * - Single RAF callback, cancelled if manual flush happens
 * - Minimal branching in hot paths
 *
 * Usage:
 * import { scheduleMatrixUpdate, scheduleColorUpdate, flushUpdates } from './InstanceUpdateScheduler';
 * scheduleMatrixUpdate(mesh);
 * scheduleColorUpdate(mesh);
 * // Call flushUpdates() at end of useFrame for immediate sync
 */

type MeshLike = {
  instanceMatrix?: { needsUpdate: boolean } | null;
  instanceColor?: { needsUpdate: boolean } | null;
};

// Arrays for O(1) add, fast iteration
const pendingMatrix: MeshLike[] = [];
const pendingColor: MeshLike[] = [];

// Sets for deduplication within a single frame
const matrixSet = new Set<MeshLike>();
const colorSet = new Set<MeshLike>();

let rafId: number | null = null;
let frameFlushScheduled = false;

/**
 * Flush all pending updates - call this at end of frame for immediate sync
 */
export function flushUpdates(): void {
  // Cancel pending RAF if we're flushing manually
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  frameFlushScheduled = false;

  // Process matrix updates (usually more frequent)
  const matrixLen = pendingMatrix.length;
  for (let i = 0; i < matrixLen; i++) {
    const mesh = pendingMatrix[i];
    if (mesh?.instanceMatrix) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Process color updates
  const colorLen = pendingColor.length;
  for (let i = 0; i < colorLen; i++) {
    const mesh = pendingColor[i];
    if (mesh?.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  // Clear arrays and sets for the next frame
  pendingMatrix.length = 0;
  pendingColor.length = 0;
  matrixSet.clear();
  colorSet.clear();
}

function scheduleRAFFlush(): void {
  if (rafId !== null || frameFlushScheduled) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    flushUpdates();
  });
}

/**
 * Schedule matrix update for an instanced mesh
 */
export function scheduleMatrixUpdate(mesh: MeshLike | null | undefined): void {
  if (!mesh || !mesh.instanceMatrix || matrixSet.has(mesh)) return;
  matrixSet.add(mesh);
  pendingMatrix.push(mesh);
  scheduleRAFFlush();
}

/**
 * Schedule color update for an instanced mesh
 */
export function scheduleColorUpdate(mesh: MeshLike | null | undefined): void {
  if (!mesh || !mesh.instanceColor || colorSet.has(mesh)) return;
  colorSet.add(mesh);
  pendingColor.push(mesh);
  scheduleRAFFlush();
}

/**
 * Mark that flush will be called manually this frame (skip RAF)
 */
export function markFrameFlush(): void {
  frameFlushScheduled = true;
}

/**
 * Get pending update counts for debugging
 */
export function getPendingCounts(): { matrix: number; color: number } {
  return { matrix: pendingMatrix.length, color: pendingColor.length };
}

export default {
  scheduleMatrixUpdate,
  scheduleColorUpdate,
  flushUpdates,
  markFrameFlush,
  getPendingCounts
};
