/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UIErrorBoundary - Error boundary for HTML/UI context
 */

import React, { ReactNode, ErrorInfo } from 'react';
import { ShieldAlert, RotateCcw, Download, FileJson } from 'lucide-react';
import { downloadDebugData, downloadRawDebugData } from '../../infrastructure/debug/DebugRecorder';
import * as Sentry from '@sentry/browser';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class UIErrorBoundary extends React.Component<Props, State> {
    declare props: Readonly<Props>;

    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Treat missing optional visual components (like Outlines) as non-fatal:
        try {
            const msg = error && (error as Error).message ? (error as Error).message : '';
            if (typeof msg === 'string' && msg.includes('Outlines')) {
                // Do not trigger full UI crash for optional visual component missing.
                // Log as warning and continue rendering children.
                // Returning null prevents updating error state.
                // The error will still be reported in componentDidCatch.
                 
                console.warn('[UIErrorBoundary] Non-fatal visual error:', msg);
                return { hasError: false, error: null };
            }
        } catch {
            // ignore and fallback to fatal
        }

        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("UI Error:", error, errorInfo);

        // Report to Sentry
        if (import.meta.env.PROD) {
            Sentry.captureException(error, {
                tags: {
                    component: 'UIErrorBoundary',
                    errorBoundary: 'ui',
                    errorInfo: errorInfo.componentStack,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    }

    public handleReload = () => {
        window.location.reload();
    }

    public render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(255,0,0,0.2)]">
                        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-2 font-cyber">SYSTEM CRITICAL FAILURE</h1>
                        <p className="text-gray-400 mb-6 font-mono text-sm">
                            An unexpected anomaly has occurred in the rendering matrix.
                        </p>
                        <div className="bg-black/50 p-4 rounded-lg mb-6 text-left overflow-auto max-h-32">
                            <code className="text-red-400 text-xs font-mono">
                                {this.state.error?.message || "Unknown Error"}
                            </code>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={this.handleReload}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center transition-colors shadow-lg"
                            >
                                <RotateCcw className="mr-2 w-5 h-5" /> REBOOT SYSTEM
                            </button>

                            <button
                                onClick={() => downloadDebugData()}
                                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl flex items-center justify-center transition-colors border border-white/5"
                            >
                                <Download className="mr-2 w-4 h-4" /> DOWNLOAD DEBUG DATA
                            </button>

                            <button
                                onClick={() => downloadRawDebugData()}
                                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl flex items-center justify-center transition-colors border border-white/5"
                            >
                                <FileJson className="mr-2 w-4 h-4" /> DOWNLOAD FULL DATA (with screenshots)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default UIErrorBoundary;
