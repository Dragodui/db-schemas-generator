"use client"

import React, { useState } from 'react';
import { JSONSchema, Table, Column } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableEditor } from './table-editor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Database,
    Sparkles,
    FileJson,
    Table as TableIcon,
} from 'lucide-react';

interface SchemaBuilderProps {
    schema: JSONSchema | null;
    onSchemaChange: (schema: JSONSchema) => void;
}

const TEMPLATES = {
    empty: {
        name: 'Empty Table',
        columns: [],
    },
    basic: {
        name: 'Basic Table',
        columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, notNull: true, autoIncrement: true },
            { name: 'created_at', type: 'TIMESTAMP', notNull: true, default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', notNull: true, default: 'CURRENT_TIMESTAMP' },
        ] as Column[],
    },
    user: {
        name: 'users',
        columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, notNull: true, autoIncrement: true },
            { name: 'email', type: 'VARCHAR', notNull: true, unique: true },
            { name: 'password', type: 'VARCHAR', notNull: true },
            { name: 'name', type: 'VARCHAR', notNull: true },
            { name: 'created_at', type: 'TIMESTAMP', notNull: true, default: 'CURRENT_TIMESTAMP' },
        ] as Column[],
    },
    posts: {
        name: 'posts',
        columns: [
            { name: 'id', type: 'INTEGER', primaryKey: true, notNull: true, autoIncrement: true },
            { name: 'user_id', type: 'INTEGER', notNull: true },
            { name: 'title', type: 'VARCHAR', notNull: true },
            { name: 'content', type: 'TEXT' },
            { name: 'published', type: 'BOOLEAN', default: 'false' },
            { name: 'created_at', type: 'TIMESTAMP', notNull: true, default: 'CURRENT_TIMESTAMP' },
        ] as Column[],
    },
};

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
    schema,
    onSchemaChange,
}) => {
    const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('basic');
    const [selectedEngine, setSelectedEngine] = useState<'mysql' | 'postgresql'>('postgresql');

    const tables = schema?.tables || [];

    const initializeSchema = () => {
        if (!schema) {
            onSchemaChange({ tables: [] });
        }
    };

    const addTable = () => {
        initializeSchema();
        const template = TEMPLATES[selectedTemplate];
        const newTable: Table = {
            name: newTableName || template.name,
            columns: [...template.columns],
            foreignKeys: [],
            engine: selectedEngine,
        };

        const currentTables = schema?.tables || [];
        onSchemaChange({ tables: [...currentTables, newTable] });
        setAddTableDialogOpen(false);
        setNewTableName('');
    };

    const updateTable = (index: number, table: Table) => {
        const newTables = [...tables];
        newTables[index] = table;
        onSchemaChange({ tables: newTables });
    };

    const deleteTable = (index: number) => {
        onSchemaChange({ tables: tables.filter((_, i) => i !== index) });
    };

    const addQuickTable = (templateKey: keyof typeof TEMPLATES) => {
        initializeSchema();
        const template = TEMPLATES[templateKey];
        const newTable: Table = {
            name: template.name,
            columns: [...template.columns],
            foreignKeys: [],
            engine: selectedEngine,
        };

        const currentTables = schema?.tables || [];
        onSchemaChange({ tables: [...currentTables, newTable] });
    };

    const exportToJson = () => {
        if (!schema) return;
        const json = JSON.stringify(schema, null, 2);
        navigator.clipboard.writeText(json);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Schema Builder</h2>
                        {tables.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                                ({tables.length} {tables.length === 1 ? 'table' : 'tables'})
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {schema && tables.length > 0 && (
                            <Button variant="outline" size="sm" onClick={exportToJson}>
                                <FileJson className="h-4 w-4 mr-1" />
                                Copy JSON
                            </Button>
                        )}
                        <Button onClick={() => setAddTableDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Table
                        </Button>
                    </div>
                </div>

                {/* Quick Templates */}
                {tables.length === 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Quick start:</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickTable('user')}
                            className="h-7"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Users Table
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addQuickTable('posts')}
                            className="h-7"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Posts Table
                        </Button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {tables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <TableIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No tables yet</h3>
                        <p className="text-muted-foreground text-sm mb-4 max-w-md">
                            Start building your database schema by adding tables.
                            Use templates to quickly add common table structures.
                        </p>
                        <Button onClick={() => setAddTableDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Create Your First Table
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {tables.map((table, index) => (
                            <TableEditor
                                key={`${table.name}-${index}`}
                                table={table}
                                tableIndex={index}
                                allTables={tables}
                                onUpdate={updateTable}
                                onDelete={deleteTable}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Table Dialog */}
            <Dialog open={addTableDialogOpen} onOpenChange={setAddTableDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Table</DialogTitle>
                        <DialogDescription>
                            Create a new table for your database schema
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Table Name</label>
                            <Input
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                placeholder="Enter table name (or use template default)"
                                className="font-mono"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Template</label>
                            <Select
                                value={selectedTemplate}
                                onValueChange={(v) => setSelectedTemplate(v as keyof typeof TEMPLATES)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="empty">
                                        Empty Table (no columns)
                                    </SelectItem>
                                    <SelectItem value="basic">
                                        Basic (id + timestamps)
                                    </SelectItem>
                                    <SelectItem value="user">
                                        Users Table (auth ready)
                                    </SelectItem>
                                    <SelectItem value="posts">
                                        Posts Table (blog ready)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Database Engine</label>
                            <Select
                                value={selectedEngine}
                                onValueChange={(v) => setSelectedEngine(v as 'mysql' | 'postgresql')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                                    <SelectItem value="mysql">MySQL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate !== 'empty' && (
                            <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Template Preview:
                                </p>
                                <div className="text-xs font-mono space-y-1">
                                    {TEMPLATES[selectedTemplate].columns.map((col, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-primary">{col.name}</span>
                                            <span className="text-muted-foreground">{col.type}</span>
                                            {col.primaryKey && <span className="text-amber-600 text-[10px]">PK</span>}
                                            {col.notNull && <span className="text-blue-600 text-[10px]">NOT NULL</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddTableDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={addTable}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Table
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SchemaBuilder;
