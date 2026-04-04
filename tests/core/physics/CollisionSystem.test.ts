/**
 * Unit tests for CollisionSystem
 */
import { describe, it, expect } from 'vitest';
import { CollisionSystem } from '../../../core/physics/CollisionSystem';
import { GameObject, ObjectType } from '../../../types';

describe('CollisionSystem', () => {
  it('detects collision with obstacle', () => {
    const obstacle: GameObject = {
      id: 'test-obstacle',
      type: ObjectType.OBSTACLE,
      position: [0, 0, 0],
      active: true
    };
    
    const collisionSystem = new CollisionSystem();
    const result = collisionSystem.checkSimple(0, 0, [obstacle], 0);
    expect(result.hit).toBe(true);
    expect(result.object?.id).toBe('test-obstacle');
  });

  it('ignores inactive objects', () => {
    const inactiveObstacle: GameObject = {
      id: 'inactive',
      type: ObjectType.OBSTACLE,
      position: [0, 0, 0],
      active: false
    };

    const collisionSystem = new CollisionSystem();
    const result = collisionSystem.checkSimple(0, 0, [inactiveObstacle], 0);
    expect(result.hit).toBe(false);
    expect(result.object).toBe(null);
  });

  it('ignores objects outside Z range', () => {
    const farObstacle: GameObject = {
      id: 'far',
      type: ObjectType.OBSTACLE,
      position: [0, 0, 10],
      active: true
    };

    const collisionSystem = new CollisionSystem();
    const result = collisionSystem.checkSimple(0, 0, [farObstacle], 0);
    expect(result.hit).toBe(false);
  });

  it('allows jumping over obstacles', () => {
    const obstacle: GameObject = {
      id: 'jumpable',
      type: ObjectType.OBSTACLE,
      position: [0, 0, 0],
      active: true
    };

    const collisionSystem = new CollisionSystem();
    const result = collisionSystem.checkSimple(0, 1.5, [obstacle], 0);
    expect(result.hit).toBe(false);
  });

  it('detects pickup collisions', () => {
    const pickup: GameObject = {
      id: 'pickup',
      type: ObjectType.COIN,
      position: [0, 0, 0],
      active: true
    };

    const collisionSystem = new CollisionSystem();
    const result = collisionSystem.checkSimple(0, 0, [pickup], 0);
    expect(result.hit).toBe(true);
    expect(result.object?.id).toBe('pickup');
  });
});
