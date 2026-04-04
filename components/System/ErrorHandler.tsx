/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ErrorBoundary - Advanced error boundary with UI fallback
 */

import React, { ReactNode, ErrorInfo } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declare props to fix TS error: Property 'props' does not exist on type 'ErrorBoundary'
  declare props: Readonly<Props>;

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // Simple 3D fallback for Three.js context
      return (
        <group name="ErrorBoundaryFallback">
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#ff6666" />
          </mesh>
        </group>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
