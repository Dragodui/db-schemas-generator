"use client"

import AppSidebar from "@/components/app-sidebar";
import { JSONSchema } from "@/lib/types";
import dynamic from 'next/dynamic';
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toPng } from 'html-to-image';
import { SchemaBuilder } from "@/components/schema-builder";
import { LayoutGrid, Code, PanelLeftClose, PanelLeft, Download, Plus, User, Check, Loader2, ChevronDown } from "lucide-react";
import { api, Schema, SchemaData } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const SchemaGraph = dynamic(() => import('../components/schema-graph'), { ssr: false });

type PanelTab = 'actions' | 'builder' | 'json';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  const [currentSchemaId, setCurrentSchemaId] = useState<number | null>(null);
  const [currentSchemaName, setCurrentSchemaName] = useState<string>('Untitled Schema');
  const [panelTab, setPanelTab] = useState<PanelTab>('builder');
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [userSchemas, setUserSchemas] = useState<Schema[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const graphRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSchemaRef = useRef<string>('');

  // Load user's schemas on mount and check localStorage
  useEffect(() => {
    if (isAuthenticated) {
      loadUserSchemas();
    }

    // Load schema from localStorage if coming from dashboard
    const stored = localStorage.getItem('loadSchema');
    if (stored) {
      try {
        const schemaData: Schema = JSON.parse(stored);
        setSchema(schemaData.data as JSONSchema);
        setCurrentSchemaId(schemaData.id);
        setCurrentSchemaName(schemaData.name);
        lastSavedSchemaRef.current = JSON.stringify({ schema: schemaData.data, name: schemaData.name });
        localStorage.removeItem('loadSchema');
      } catch (e) {
        console.error('Failed to load schema from localStorage', e);
      }
    }
  }, [isAuthenticated]);

  const loadUserSchemas = async () => {
    try {
      const schemas = await api.getMySchemas();
      setUserSchemas(schemas);
    } catch (err) {
      console.error('Failed to load schemas', err);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!isAuthenticated || !schema || schema.tables.length === 0) {
      return;
    }

    const currentState = JSON.stringify({ schema, name: currentSchemaName });

    // Skip if nothing changed
    if (currentState === lastSavedSchemaRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (3 seconds)
    saveTimeoutRef.current = setTimeout(async () => {
      await autoSave();
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [schema, currentSchemaName, isAuthenticated]);

  const autoSave = async () => {
    if (!schema || schema.tables.length === 0) return;

    setSaveStatus('saving');

    try {
      const schemaData: SchemaData = {
        tables: schema.tables.map(table => ({
          name: table.name,
          columns: table.columns.map(col => ({
            ...col,
            default: col.default != null ? String(col.default) : undefined,
          })),
          foreignKeys: table.foreignKeys,
        }))
      };

      if (currentSchemaId) {
        // Update existing
        await api.updateSchema(currentSchemaId, {
          name: currentSchemaName,
          data: schemaData,
        });
      } else {
        // Create new
        const saved = await api.createSchema(currentSchemaName, schemaData, false);
        setCurrentSchemaId(saved.id);
        await loadUserSchemas();
      }

      lastSavedSchemaRef.current = JSON.stringify({ schema, name: currentSchemaName });
      setSaveStatus('saved');
      await loadUserSchemas(); // Refresh list
    } catch (err) {
      console.error('Auto-save failed', err);
      setSaveStatus('unsaved');
    }
  };

  const createNewSchema = () => {
    setSchema({ tables: [] });
    setCurrentSchemaId(null);
    setCurrentSchemaName('Untitled Schema');
    lastSavedSchemaRef.current = '';
    setSaveStatus('saved');
  };

  const loadSchema = async (schemaItem: Schema) => {
    setSchema(schemaItem.data as JSONSchema);
    setCurrentSchemaId(schemaItem.id);
    setCurrentSchemaName(schemaItem.name);
    lastSavedSchemaRef.current = JSON.stringify({ schema: schemaItem.data, name: schemaItem.name });
    setSaveStatus('saved');
  };

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
    <div className="flex h-screen w-full">
        {/* Left Side Panel - Actions, Builder & JSON */}
        {isPanelOpen && (
          <div className="w-[400px] border-r flex flex-col bg-background shrink-0">
            {/* Panel Header with Schema Selector */}
            <div className="p-3 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">Schema Editor</h1>
                <div className="flex items-center gap-2">
                  {/* Save Status */}
                  {isAuthenticated && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {saveStatus === 'saving' && (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      )}
                      {saveStatus === 'saved' && currentSchemaId && (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Saved</span>
                        </>
                      )}
                      {saveStatus === 'unsaved' && (
                        <span className="text-amber-500">Unsaved</span>
                      )}
                    </div>
                  )}
                  {/* Profile Link */}
                  {isAuthenticated ? (
                    <Link href="/dashboard">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <User className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/login">
                      <Button variant="ghost" size="sm" className="text-xs">
                        Login
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Schema Selector */}
              {isAuthenticated && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentSchemaName}
                      onChange={(e) => setCurrentSchemaName(e.target.value)}
                      className="h-9 text-sm font-medium"
                      placeholder="Schema name..."
                    />
                    <Button variant="outline" size="sm" onClick={createNewSchema} className="h-9 px-3 shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {userSchemas.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground">
                          <span>Switch schema ({userSchemas.length})</span>
                          <ChevronDown className="h-3 w-3 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[340px]">
                        {userSchemas.map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => loadSchema(s)}
                            className={currentSchemaId === s.id ? 'bg-muted' : ''}
                          >
                            <span className="truncate">{s.name}</span>
                            {currentSchemaId === s.id && (
                              <Check className="h-4 w-4 ml-auto" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>

            {/* Panel Tabs */}
            <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-1">
                <Button
                  variant={panelTab === 'actions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPanelTab('actions')}
                  className="h-8 flex-1 text-xs"
                >
                  Actions
                </Button>
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
              {panelTab === 'actions' ? (
                <AppSidebar
                  setSchema={setSchema}
                  schema={schema}
                  currentSchemaId={currentSchemaId}
                  setCurrentSchemaId={setCurrentSchemaId}
                  embedded={true}
                />
              ) : panelTab === 'builder' ? (
                <SchemaBuilder
                  schema={schema}
                  onSchemaChange={setSchema}
                />
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

        {/* Main Content - Graph View (Always Visible) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Graph Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                title={isPanelOpen ? "Close panel" : "Open panel"}
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
            <SchemaGraph schema={schema} onSchemaChange={setSchema} />
          </div>
        </div>
      </div>
  );
}
