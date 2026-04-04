/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, Download, ExternalLink, Hash } from 'lucide-react';

interface DocumentCardProps {
    title: string;
    type: string;
    year: number;
    source: string;
    url: string;
    tags?: string[];
}

/**
 * Premium DocumentCard component with glassmorphism aesthetic for library resources.
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({ title, type, year, source, url, tags = [] }) => {
    return (
        <div className="relative group bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-500 shadow-2xl overflow-hidden flex flex-col h-full">
            {/* Glossy gradient effect */}
            <div className="absolute -inset-x-full inset-y-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:inset-x-full transition-all duration-1000 ease-in-out pointer-events-none" />

            <div className="flex items-start justify-between mb-6">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300 ring-1 ring-white/10">
                    <FileText size={28} />
                </div>
                <div className="flex gap-1">
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white" title="Download">
                        <Download size={18} />
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white" title="Open Link">
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                {title}
            </h3>

            <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                            <Hash size={10} />{tag}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between text-[11px] font-black tracking-widest uppercase">
                    <span className="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                        {source}
                    </span>
                    <span className="text-white/30">
                        {type} • {year}
                    </span>
                </div>
            </div>
        </div>
    );
};
