/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * ResourceManager - Система управления ресурсами и предотвращения утечек памяти
 *
 * Управляет жизненным циклом Three.js объектов, текстур, геометрии и материалов.
 * Реализует object pooling для часто создаваемых/удаляемых объектов.
 */

import * as THREE from 'three';
import { debugLog } from '../../utils/debug';

export interface ResourceTracker {
    id: string;
    type: 'geometry' | 'material' | 'texture' | 'mesh';
    resource: THREE.Object3D | THREE.Material | THREE.BufferGeometry | THREE.Texture;
    createdAt: number;
    lastUsed: number;
}

export class ResourceManager {
    private resources = new Map<string, ResourceTracker>();
    // Пул объектов отложен: при необходимости см. docs/WEAK_SPOTS (п. 5.1) и docs/IMPROVEMENTS_BACKLOG.md

    constructor() {
        debugLog('🔧 ResourceManager initialized');
    }

    trackResource(id: string, resource: ResourceTracker['resource'], type: ResourceTracker['type']): void {
        this.resources.set(id, {
            id,
            type,
            resource,
            createdAt: Date.now(),
            lastUsed: Date.now()
        });
    }

    disposeResource(id: string): void {
        const tracker = this.resources.get(id);
        if (tracker) {
            // Type-safe disposal for different resource types
            const resource = tracker.resource as { dispose?: () => void };
            if (resource && typeof resource.dispose === 'function') {
                resource.dispose();
            }
            this.resources.delete(id);
            debugLog(`🗑️ Disposed resource: ${id}`);
        }
    }

    disposeAll(): void {
        for (const [id] of this.resources) {
            this.disposeResource(id);
        }
        debugLog('🧹 All resources disposed');
    }
}
