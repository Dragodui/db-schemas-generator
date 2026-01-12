"use client"

import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader } from './ui/sidebar';
import { Button } from './ui/button';
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { JSONSchema } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { api, Schema, SchemaData } from '@/lib/api';
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
import { Switch } from './ui/switch';

interface AppSidebarProps {
    setSchema: (schema: JSONSchema) => void;
    schema: JSONSchema | null;
    currentSchemaId?: number | null;
    setCurrentSchemaId?: (id: number | null) => void;
}

const AppSidebar = ({ setSchema, schema, currentSchemaId, setCurrentSchemaId }: AppSidebarProps) => {
    const { isAuthenticated } = useAuth();
    const [jsonInput, setJsonInput] = useState<string>('');
    const [parsingError, setParsingError] = useState<boolean>(false);

    // Save dialog state
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [schemaName, setSchemaName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Export dialog state
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'mysql' | 'postgres' | 'mongo'>('postgres');
    const [exportResult, setExportResult] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // Load schema from localStorage if coming from dashboard
    useEffect(() => {
        const stored = localStorage.getItem('loadSchema');
        if (stored) {
            try {
                const schemaData: Schema = JSON.parse(stored);
                setSchema(schemaData.data as JSONSchema);
                setJsonInput(JSON.stringify(schemaData.data, null, 2));
                if (setCurrentSchemaId) {
                    setCurrentSchemaId(schemaData.id);
                }
                localStorage.removeItem('loadSchema');
            } catch (e) {
                console.error('Failed to load schema from localStorage', e);
            }
        }
    }, [setSchema, setCurrentSchemaId]);

    const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0];
            if (!file) return;
            const fileReader = new FileReader();
            fileReader.onload = (event) => {
                const content = event.target?.result as string;
                setJsonInput(content)
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

    const handleSave = async () => {
        if (!schema || !schemaName.trim()) return;

        setSaving(true);
        setSaveError('');

        try {
            const schemaData: SchemaData = {
                tables: schema.tables.map(table => ({
                    name: table.name,
                    columns: table.columns,
                    foreignKeys: table.foreignKeys,
                }))
            };

            if (currentSchemaId) {
                // Update existing schema
                await api.updateSchema(currentSchemaId, {
                    name: schemaName.trim(),
                    data: schemaData,
                    is_public: isPublic,
                });
            } else {
                // Create new schema
                const saved = await api.createSchema(schemaName.trim(), schemaData, isPublic);
                if (setCurrentSchemaId) {
                    setCurrentSchemaId(saved.id);
                }
            }
            setSaveDialogOpen(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!schema) return;

        setExporting(true);
        try {
            const schemaData: SchemaData = {
                tables: schema.tables.map(table => ({
                    name: table.name,
                    columns: table.columns,
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

    return (
        <>
            <Sidebar>
                <SidebarHeader className='text-2xl font-bold p-4'>
                    Schema Editor
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel className='text-lg mb-2'>Import JSON</SidebarGroupLabel>
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
                                className='max-h-[300px] min-h-[200px] font-mono text-xs'
                                placeholder='{"tables": [...]}'
                            />
                            <p className={`text-red-500 text-sm my-2 ${parsingError ? "block" : "hidden"}`}>
                                Invalid JSON. Please check your input.
                            </p>
                            <Button onClick={generateSchema} className='mt-2 w-full'>
                                Generate Schema
                            </Button>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {schema && (
                        <SidebarGroup>
                            <SidebarGroupLabel className='text-lg mb-2'>Actions</SidebarGroupLabel>
                            <SidebarGroupContent className='space-y-2'>
                                {isAuthenticated && (
                                    <Button
                                        variant="outline"
                                        className='w-full'
                                        onClick={() => {
                                            setSchemaName('');
                                            setSaveDialogOpen(true);
                                        }}
                                    >
                                        {currentSchemaId ? 'Update Schema' : 'Save Schema'}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className='w-full'
                                    onClick={() => {
                                        setExportResult(null);
                                        setExportDialogOpen(true);
                                    }}
                                >
                                    Export SQL
                                </Button>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}

                    {schema && (
                        <SidebarGroup>
                            <SidebarGroupLabel className='text-lg mb-2'>
                                Tables ({schema.tables.length})
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <div className='space-y-2 max-h-[200px] overflow-y-auto'>
                                    {schema.tables.map((table) => (
                                        <div
                                            key={table.name}
                                            className='p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm'
                                        >
                                            <strong>{table.name}</strong>
                                            <span className='text-muted-foreground ml-2'>
                                                ({table.columns.length} cols)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )}
                </SidebarContent>
            </Sidebar>

            {/* Save Dialog */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {currentSchemaId ? 'Update Schema' : 'Save Schema'}
                        </DialogTitle>
                        <DialogDescription>
                            {currentSchemaId
                                ? 'Update your existing schema'
                                : 'Save your schema to access it later'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div>
                            <label className='text-sm font-medium'>Schema Name</label>
                            <Input
                                value={schemaName}
                                onChange={(e) => setSchemaName(e.target.value)}
                                className='mt-1'
                                placeholder='My Database Schema'
                            />
                        </div>
                        <div className='flex items-center gap-3'>
                            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                            <label className='text-sm'>Make schema public</label>
                        </div>
                        {saveError && (
                            <p className='text-red-500 text-sm'>{saveError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant='outline' onClick={() => setSaveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !schemaName.trim()}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
