import React from 'react';

// Safe Outlines shim: dynamically imports Outlines from @react-three/drei if available.
// If import fails, renders nothing (noop) to avoid crashing the app.
type OutlinesProps = Record<string, unknown>;

export const Outlines: React.FC<OutlinesProps> = (props) => {
  const [Comp, setComp] = React.useState<React.ComponentType<OutlinesProps> | null>(null);

  React.useEffect(() => {
    let mounted = true;
    import('@react-three/drei')
      .then(mod => {
        const C = (mod as { Outlines?: React.ComponentType<OutlinesProps> }).Outlines;
        if (mounted && C) setComp(() => C);
      })
      .catch(() => {
        if (mounted) setComp(() => null);
      });
    return () => { mounted = false; };
  }, []);

  if (!Comp) return null;
  return React.createElement(Comp, props);
};

export default Outlines;

