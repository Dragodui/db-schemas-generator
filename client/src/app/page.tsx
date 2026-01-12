"use client"

import AppSidebar from "@/components/app-sidebar";
import { JSONSchema } from "@/lib/types";
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toPng } from 'html-to-image';

const SchemaGraph = dynamic(() => import('../components/schema-graph'), { ssr: false });

export default function Home() {
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [currentSchemaId, setCurrentSchemaId] = useState<number | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  const exportToImage = useCallback(async () => {
    if (!graphRef.current) return;

    try {
      // Find the React Flow viewport
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
      <div className="flex-1 relative" ref={graphRef}>
        {schema && (
          <div className="absolute top-4 right-4 z-10">
            <Button variant="outline" size="sm" onClick={exportToImage}>
              Export as Image
            </Button>
          </div>
        )}
        <SchemaGraph schema={schema} />
      </div>
    </div>
  );
}
