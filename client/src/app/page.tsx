"use client"

import AppSidebar from "@/components/app-sidebar";
import { JSONSchema } from "@/lib/types";
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toPng } from 'html-to-image';
import { SchemaBuilder } from "@/components/schema-builder";
import { LayoutGrid, Network } from "lucide-react";

const SchemaGraph = dynamic(() => import('../components/schema-graph'), { ssr: false });

type ViewMode = 'builder' | 'graph';

export default function Home() {
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [currentSchemaId, setCurrentSchemaId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const graphRef = useRef<HTMLDivElement>(null);

  const exportToImage = useCallback(async () => {
    if (!graphRef.current) return;

    try {
      const viewport = graphRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return;

      const dataUrl = await toPng(viewport, {
        backgroundColor: '#ffffff',
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = 'schema.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  }, []);

  return (
    <div className="flex h-screen">
      <AppSidebar
        setSchema={setSchema}
        schema={schema}
        currentSchemaId={currentSchemaId}
        setCurrentSchemaId={setCurrentSchemaId}
      />
      <div className="flex-1 flex flex-col">
        {/* View Toggle */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'builder' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('builder')}
              className="h-8"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Builder
            </Button>
            <Button
              variant={viewMode === 'graph' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('graph')}
              className="h-8"
            >
              <Network className="h-4 w-4 mr-1.5" />
              Graph View
            </Button>
          </div>

          {viewMode === 'graph' && schema && (
            <Button variant="outline" size="sm" onClick={exportToImage}>
              Export as Image
            </Button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative" ref={graphRef}>
          {viewMode === 'builder' ? (
            <SchemaBuilder
              schema={schema}
              onSchemaChange={setSchema}
            />
          ) : (
            <SchemaGraph schema={schema} />
          )}
        </div>
      </div>
    </div>
  );
}
