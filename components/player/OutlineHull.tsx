import { BufferGeometry, MeshBasicMaterial, BackSide } from 'three';
import { useMemo } from 'react';

/**
 * OutlineHull - Мультяшный outline эффект
 * Улучшенная версия с настраиваемым цветом и толщиной
 */
export function OutlineHull({ 
    geometry, 
    thickness = 1.03,
    color = '#000000' // Мультяшный черный outline по умолчанию
}: { 
    geometry: BufferGeometry, 
    thickness?: number,
    color?: string 
}) {
  const outlineMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: color,
        side: BackSide,
        toneMapped: false, // Для ярких цветов
      }),
    [color]
  );

  return <mesh geometry={geometry} material={outlineMaterial} scale={[thickness, thickness, thickness]} />;
}
