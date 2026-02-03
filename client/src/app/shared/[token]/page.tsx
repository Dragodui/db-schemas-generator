"use client"

import { JSONSchema } from "@/lib/types";
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toPng } from 'html-to-image';
import { SchemaBuilder } from "@/components/schema-builder";
import { LayoutGrid, Code, PanelLeftClose, PanelLeft, Download, Eye, Edit3, Loader2 } from "lucide-react";
import { api, SchemaWithAccess, SchemaData } from "@/lib/api";
import { useParams } from "next/navigation";

const SchemaGraph = dynamic(() => import('@/components/schema-graph'), { ssr: false });

type PanelTab = 'builder' | 'json';

export default function SharedSchemaPage() {
  const params = useParams();
  const token = params.token as string;

  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [schemaData, setSchemaData] = useState<SchemaWithAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('builder');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load schema by share token
  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true);
        const data = await api.getSchemaByShareToken(token);
        setSchemaData(data);
        setSchema(data.data as JSONSchema);
        lastSavedRef.current = JSON.stringify(data.data);
      } catch (err) {
        setError('Schema not found or sharing is disabled');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadSchema();
    }
  }, [token]);

  // Auto-save for edit access
  useEffect(() => {
    if (!schemaData || schemaData.access_level !== 'edit' || !schema) {
      return;
    }

    const currentStr = JSON.stringify(schema);
    if (currentStr === lastSavedRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const schemaDataToSave: SchemaData = {
          tables: schema.tables.map(table => ({
            name: table.name,
            columns: table.columns.map(col => ({
              ...col,
              default: col.default != null ? String(col.default) : undefined,
            })),
            foreignKeys: table.foreignKeys?.map(fk => ({
              ...fk,
              relationType: fk.relationType,
            })),
            color: table.color,
          }))
        };

        await api.updateSchema(schemaData.id, { data: schemaDataToSave }, token);
        lastSavedRef.current = currentStr;
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setSaving(false);
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [schema, schemaData, token]);

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
      link.download = `${schemaData?.name || 'schema'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  }, [schemaData]);

  const canEdit = schemaData?.access_level === 'edit';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left Side Panel */}
      {isPanelOpen && (
        <div className="w-[400px] border-r flex flex-col bg-background shrink-0">
          {/* Panel Header */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold truncate">{schemaData?.name}</h1>
              <div className="flex items-center gap-2">
                {/* Access Level Badge */}
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  canEdit
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {canEdit ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {canEdit ? 'Can Edit' : 'View Only'}
                </div>
                {/* Saving indicator */}
                {saving && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Shared schema {canEdit ? '- your changes will be saved' : '- view only access'}
            </p>
          </div>

          {/* Panel Tabs */}
          <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-1">
              <Button
                variant={panelTab === 'builder' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPanelTab('builder')}
                className="h-8 flex-1 text-xs"
              >
                <LayoutGrid className="h-3 w-3 mr-1" />
                Builder
              </Button>
              <Button
                variant={panelTab === 'json' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPanelTab('json')}
                className="h-8 flex-1 text-xs"
              >
                <Code className="h-3 w-3 mr-1" />
                JSON
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto">
            {panelTab === 'builder' ? (
              canEdit ? (
                <SchemaBuilder
                  schema={schema}
                  onSchemaChange={setSchema}
                />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  <p>View only access - you cannot edit this schema.</p>
                  {schema?.tables.map((table) => (
                    <div key={table.name} className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="font-medium">{table.name}</div>
                      <div className="text-xs mt-1">
                        {table.columns.length} columns
                        {table.foreignKeys?.length ? `, ${table.foreignKeys.length} relations` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="p-4">
                <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-full">
                  {schema ? JSON.stringify(schema, null, 2) : 'No schema loaded'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Graph View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Graph Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
            >
              {isPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Schema Graph</span>
          </div>
          {schema && (
            <Button variant="outline" size="sm" onClick={exportToImage}>
              <Download className="h-4 w-4 mr-1.5" />
              Export Image
            </Button>
          )}
        </div>

        {/* Graph Area */}
        <div className="flex-1 relative" ref={graphRef}>
          <SchemaGraph
            schema={schema}
            onSchemaChange={canEdit ? setSchema : undefined}
          />
        </div>
      </div>
    </div>
  );
}
