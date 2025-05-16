'use client';

import React from 'react';
import Link from 'next/link';
interface Breadcrumb {
  label: string;
  href?: string;
}

export function AppHeader({ breadcrumbs }: { breadcrumbs: Breadcrumb[] }) {
  
  return (
    <header className="w-full bg-gradient-to-r from-[#181a23] to-[#23244a] border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center text-gray-400 text-sm">
            <span className="opacity-60 mr-1.5">powered by</span>
            <a 
              href="https://langflow.org/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
              Langflow
            </a>
          </div>
          
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.label + idx} className="flex items-center">
                {crumb.href ? (
                  <Link 
                    href={crumb.href} 
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium">{crumb.label}</span>
                )}
                {idx < breadcrumbs.length - 1 && (
                  <span className="mx-2 text-gray-500">/</span>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;