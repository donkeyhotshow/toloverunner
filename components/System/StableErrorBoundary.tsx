/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stable Error Boundary - Production Safe Error Handling
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import { debugError } from '../../utils/debug';
import * as Sentry from '@sentry/browser';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class StableErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        debugError('StableErrorBoundary caught an error:', error, errorInfo);

        // Report to Sentry in production
        if (import.meta.env.PROD) {
            Sentry.captureException(error, {
                tags: {
                    component: 'StableErrorBoundary',
                    errorBoundary: 'stable',
                    errorInfo: errorInfo.componentStack,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: '#1a0b2e',
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <h1>🎮 ToLOVERunner</h1>
                    <p>Something went wrong, but we're fixing it!</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginTop: '20px'
                        }}
                    >
                        Restart Game
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
