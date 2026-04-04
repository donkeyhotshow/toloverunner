import { ObjectPool } from '../../core/utils/ObjectPool';
import { GameObject, ObjectType } from '../../types';
import { SAFETY_CONFIG } from '../../constants';

export const gameObjectPool = new ObjectPool<GameObject>(
    () => ({
        id: '',
        type: ObjectType.OBSTACLE,
        position: [0, 0, 0],
        active: false,
        scale: [1, 1, 1]
    }),
    (obj) => {
        obj.id = '';
        obj.active = false;
        obj.color = undefined;
        obj.points = undefined;
        obj.rotationSpeed = undefined;
        obj.height = undefined;
        obj.width = undefined;
    },
    SAFETY_CONFIG.MAX_OBJECTS
);
