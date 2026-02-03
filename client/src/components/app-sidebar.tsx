"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader } from './ui/sidebar';
import { Button } from './ui/button';
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { JSONSchema } from '@/lib/types';
import { api, SchemaData } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from './ui/collapsible';
import {
    ChevronDown,
    ChevronRight,
    Download,
    Upload,
    Table,
    Key,
    Link,
    Trash2,
} from 'lucide-react';

interface AppSidebarProps {
    setSchema: (schema: JSONSchema) => void;
    schema: JSONSchema | null;
    currentSchemaId?: number | null;
    setCurrentSchemaId?: (id: number | null) => void;
    embedded?: boolean;
}

const AppSidebar = ({ setSchema, schema, currentSchemaId, setCurrentSchemaId, embedded = false }: AppSidebarProps) => {
    const [jsonInput, setJsonInput] = useState<string>('');
    const [parsingError, setParsingError] = useState<boolean>(false);
    const [showJsonImport, setShowJsonImport] = useState(false);

    // Export dialog state
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'mysql' | 'postgres' | 'mongo'>('postgres');
    const [exportResult, setExportResult] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // Sync JSON input when schema changes from builder
    useEffect(() => {
        if (schema) {
            setJsonInput(JSON.stringify(schema, null, 2));
        }
    }, [schema]);

    const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
                const content = event.target?.result as string;
                setJsonInput(content);
                // Auto-parse the uploaded file
                try {
                    const parsedSchema = JSON.parse(content) as JSONSchema;
                    setSchema(parsedSchema);
                    setParsingError(false);
                    if (setCurrentSchemaId) {
                        setCurrentSchemaId(null);
                    }
                } catch {
                    setParsingError(true);
                }
            }
            fileReader.readAsText(file)
        } catch (error) {
            console.error("Error parsing JSON file:", error);
            setParsingError(true);
        }
    }

    const generateSchema = () => {
        try {
            const parsedSchema = JSON.parse(jsonInput) as JSONSchema;
            setSchema(parsedSchema);
            setParsingError(false);
            if (setCurrentSchemaId) {
                setCurrentSchemaId(null); // New schema, not saved yet
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
            setParsingError(true);
        }
    }

    const handleExport = async () => {
        if (!schema) return;

        setExporting(true);
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

            const result = await api.exportDirect(schemaData, exportFormat);
            setExportResult(result.sql);
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setExporting(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    const downloadSQL = () => {
        if (!exportResult) return;

        const ext = exportFormat === 'mongo' ? 'js' : 'sql';
        const blob = new Blob([exportResult], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schema.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const clearSchema = () => {
        setSchema({ tables: [] });
        setJsonInput('');
        if (setCurrentSchemaId) {
            setCurrentSchemaId(null);
        }
    };

    const tableCount = schema?.tables.length || 0;
    const columnCount = schema?.tables.reduce((acc, t) => acc + t.columns.length, 0) || 0;
    const fkCount = schema?.tables.reduce((acc, t) => acc + (t.foreignKeys?.length || 0), 0) || 0;

    const content = (
        <>
                    {/* Schema Stats */}
                    {schema && tableCount > 0 && (
                        <SidebarGroup>
                            <SidebarGroupLabel className='text-lg mb-2'>Overview</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <div className='grid grid-cols-3 gap-2 text-center'>
                                    <div className='p-2 bg-muted rounded-lg'>
                                        <div className='text-2xl font-bold text-primary'>{tableCount}</div>
                                        <div className='text-xs text-muted-foreground'>Tables</div>
                                    </div>
                                    <div className='p-2 bg-muted rounded-lg'>
                                        <div className='text-2xl font-bold text-primary'>{columnCount}</div>
                                        <div className='text-xs text-muted-foreground'>Columns</div>
                                    </div>
                                    <div className='p-2 bg-muted rounded-lg'>
                                        <div className='text-2xl font-bold text-primary'>{fkCount}</div>
                                        <div className='text-xs text-muted-foreground'>Relations</div>
                                    </div>
                                </div>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {/* Actions */}
                    <SidebarGroup>
                        <SidebarGroupLabel className='text-lg mb-2'>Actions</SidebarGroupLabel>
                        <SidebarGroupContent className='space-y-2'>
                            {schema && tableCount > 0 && (
                                <Button
                                    variant="outline"
                                    className='w-full'
                                    onClick={() => {
                                        setExportResult(null);
                                        setExportDialogOpen(true);
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Export SQL
                                </Button>
                            )}
                            {schema && tableCount > 0 && (
                                <Button
                                    variant="ghost"
                                    className='w-full text-muted-foreground hover:text-destructive'
                                    onClick={clearSchema}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear Schema
                                </Button>
                            )}
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* JSON Import (Collapsible) */}
                    <SidebarGroup>
                        <Collapsible open={showJsonImport} onOpenChange={setShowJsonImport}>
                            <CollapsibleTrigger asChild>
                                <SidebarGroupLabel className='text-lg mb-2 cursor-pointer hover:text-primary flex items-center gap-1'>
                                    {showJsonImport ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <Upload className="h-4 w-4" />
                                    Import JSON
                                </SidebarGroupLabel>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <Input
                                        className='mb-3'
                                        type="file"
                                        accept='.json'
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileUpload(e)}
                                    />
                                    <Textarea
                                        value={jsonInput}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)}
                                        className='max-h-[200px] min-h-[120px] font-mono text-xs'
                                        placeholder='{"tables": [...]}'
                                    />
                                    <p className={`text-red-500 text-sm my-2 ${parsingError ? "block" : "hidden"}`}>
                                        Invalid JSON. Please check your input.
                                    </p>
                                    <Button onClick={generateSchema} variant="outline" className='mt-2 w-full'>
                                        Load from JSON
                                    </Button>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarGroup>

                    {/* Tables List */}
                    {schema && tableCount > 0 && (
                        <SidebarGroup>
                            <SidebarGroupLabel className='text-lg mb-2'>
                                Tables ({tableCount})
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                                    {schema.tables.map((table) => {
                                        const pkCount = table.columns.filter(c => c.primaryKey).length;
                                        const tableFkCount = table.foreignKeys?.length || 0;
                                        return (
                                            <div
                                                key={table.name}
                                                className='p-3 bg-gray-100 dark:bg-gray-800 rounded-lg'
                                            >
                                                <div className='flex items-center gap-2 mb-1'>
                                                    <Table className="h-4 w-4 text-primary" />
                                                    <strong className='text-sm'>{table.name}</strong>
                                                </div>
                                                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                                    <span>{table.columns.length} cols</span>
                                                    {pkCount > 0 && (
                                                        <span className='flex items-center gap-0.5 text-amber-600'>
                                                            <Key className="h-3 w-3" /> {pkCount}
                                                        </span>
                                                    )}
                                                    {tableFkCount > 0 && (
                                                        <span className='flex items-center gap-0.5 text-blue-600'>
                                                            <Link className="h-3 w-3" /> {tableFkCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}
        </>
    );

    return (
        <>
            {embedded ? (
                <div className="p-4 space-y-4">
                    {content}
                </div>
            ) : (
                <Sidebar>
                    <SidebarHeader className='text-2xl font-bold p-4'>
                        Schema Editor
                    </SidebarHeader>
                    <SidebarContent>
                        {content}
                    </SidebarContent>
                </Sidebar>
            )}

            {/* Export Dialog */}
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogContent className='max-w-2xl'>
                    <DialogHeader>
                        <DialogTitle>Export Schema</DialogTitle>
                        <DialogDescription>
                            Generate SQL for your database
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div>
                            <label className='text-sm font-medium'>Format</label>
                            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                                <SelectTrigger className='mt-1'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='postgres'>PostgreSQL</SelectItem>
                                    <SelectItem value='mysql'>MySQL</SelectItem>
                                    <SelectItem value='mongo'>MongoDB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {exportResult && (
                            <div className='relative'>
                                <pre className='bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto max-h-80 font-mono'>
                                    {exportResult}
                                </pre>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='absolute top-2 right-2'
                                    onClick={() => copyToClipboard(exportResult)}
                                >
                                    Copy
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant='outline' onClick={() => setExportDialogOpen(false)}>
                            Close
                        </Button>
                        {!exportResult ? (
                            <Button onClick={handleExport} disabled={exporting}>
                                {exporting ? 'Generating...' : 'Generate SQL'}
                            </Button>
                        ) : (
                            <Button onClick={downloadSQL}>
                                Download File
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AppSidebar;
