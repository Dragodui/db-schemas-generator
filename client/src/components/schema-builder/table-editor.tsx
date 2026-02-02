"use client"

import React, { useState } from 'react';
import { Table, Column, ForeignKey } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColumnEditor } from './column-editor';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Table as TableIcon,
    Key,
    Link,
} from 'lucide-react';

interface TableEditorProps {
    table: Table;
    tableIndex: number;
    allTables: Table[];
    onUpdate: (index: number, table: Table) => void;
    onDelete: (index: number) => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({
    table,
    tableIndex,
    allTables,
    onUpdate,
    onDelete,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [showForeignKeys, setShowForeignKeys] = useState(false);

    const engine = table.engine || "postgresql";

    const updateTable = (updates: Partial<Table>) => {
        onUpdate(tableIndex, { ...table, ...updates });
    };

    const addColumn = () => {
        const newColumn: Column = {
            name: '',
            type: engine === 'mysql' ? 'INT' : 'INTEGER',
            primaryKey: false,
            notNull: false,
            unique: false,
            autoIncrement: false,
        };
        updateTable({ columns: [...table.columns, newColumn] });
    };

    const updateColumn = (columnIndex: number, column: Column) => {
        const newColumns = [...table.columns];
        newColumns[columnIndex] = column;
        updateTable({ columns: newColumns });
    };

    const deleteColumn = (columnIndex: number) => {
        updateTable({ columns: table.columns.filter((_, i) => i !== columnIndex) });
    };

    const addForeignKey = () => {
        const newFK: ForeignKey = {
            column: '',
            references: { table: '', column: '' },
        };
        updateTable({ foreignKeys: [...(table.foreignKeys || []), newFK] });
    };

    const updateForeignKey = (fkIndex: number, fk: ForeignKey) => {
        const newFKs = [...(table.foreignKeys || [])];
        newFKs[fkIndex] = fk;
        updateTable({ foreignKeys: newFKs });
    };

    const deleteForeignKey = (fkIndex: number) => {
        updateTable({
            foreignKeys: (table.foreignKeys || []).filter((_, i) => i !== fkIndex)
        });
    };

    // Get other tables for FK references
    const otherTables = allTables.filter((_, i) => i !== tableIndex);

    const pkCount = table.columns.filter(c => c.primaryKey).length;
    const fkCount = table.foreignKeys?.length || 0;

    return (
        <div className="border rounded-lg bg-card shadow-sm">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                            {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <TableIcon className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-lg">{table.name || 'Untitled Table'}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="bg-muted px-2 py-0.5 rounded">
                                    {table.columns.length} columns
                                </span>
                                {pkCount > 0 && (
                                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Key className="h-3 w-3" /> {pkCount} PK
                                    </span>
                                )}
                                {fkCount > 0 && (
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Link className="h-3 w-3" /> {fkCount} FK
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(tableIndex);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                        {/* Table Settings */}
                        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                    Table Name
                                </label>
                                <Input
                                    value={table.name}
                                    onChange={(e) => updateTable({ name: e.target.value })}
                                    placeholder="table_name"
                                    className="font-mono"
                                />
                            </div>
                            <div className="w-40">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                    Database Engine
                                </label>
                                <Select
                                    value={engine}
                                    onValueChange={(v) => updateTable({ engine: v as "mysql" | "postgresql" })}
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
                        </div>

                        {/* Columns Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Columns</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addColumn}
                                    className="h-8"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Column
                                </Button>
                            </div>

                            {table.columns.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                    No columns yet. Click &quot;Add Column&quot; to start.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Header */}
                                    <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
                                        <div className="col-span-3 pl-6">Name</div>
                                        <div className="col-span-3">Type</div>
                                        <div className="col-span-5">Constraints</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {table.columns.map((column, idx) => (
                                        <ColumnEditor
                                            key={idx}
                                            column={column}
                                            index={idx}
                                            engine={engine}
                                            onUpdate={updateColumn}
                                            onDelete={deleteColumn}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Foreign Keys Section */}
                        <div className="space-y-2 pt-2 border-t">
                            <Collapsible open={showForeignKeys} onOpenChange={setShowForeignKeys}>
                                <div className="flex items-center justify-between">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 px-2">
                                            {showForeignKeys ? (
                                                <ChevronDown className="h-4 w-4 mr-1" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 mr-1" />
                                            )}
                                            <Link className="h-4 w-4 mr-1" />
                                            Foreign Keys ({fkCount})
                                        </Button>
                                    </CollapsibleTrigger>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addForeignKey}
                                        className="h-8"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add FK
                                    </Button>
                                </div>

                                <CollapsibleContent>
                                    {(table.foreignKeys?.length || 0) === 0 ? (
                                        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg mt-2">
                                            No foreign keys defined.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 mt-2">
                                            {table.foreignKeys?.map((fk, fkIdx) => (
                                                <ForeignKeyEditor
                                                    key={fkIdx}
                                                    fk={fk}
                                                    index={fkIdx}
                                                    columns={table.columns}
                                                    otherTables={otherTables}
                                                    onUpdate={updateForeignKey}
                                                    onDelete={deleteForeignKey}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

interface ForeignKeyEditorProps {
    fk: ForeignKey;
    index: number;
    columns: Column[];
    otherTables: Table[];
    onUpdate: (index: number, fk: ForeignKey) => void;
    onDelete: (index: number) => void;
}

const ForeignKeyEditor: React.FC<ForeignKeyEditorProps> = ({
    fk,
    index,
    columns,
    otherTables,
    onUpdate,
    onDelete,
}) => {
    const selectedTable = otherTables.find(t => t.name === fk.references.table);
    const refColumns = selectedTable?.columns || [];

    return (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex-1 grid grid-cols-11 gap-2 items-center">
                {/* Local Column */}
                <div className="col-span-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Column</label>
                    <Select
                        value={fk.column}
                        onValueChange={(v) => onUpdate(index, { ...fk, column: v })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                    {col.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="col-span-1 flex justify-center text-muted-foreground">
                    →
                </div>

                {/* Referenced Table */}
                <div className="col-span-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Ref. Table</label>
                    <Select
                        value={fk.references.table}
                        onValueChange={(v) => onUpdate(index, {
                            ...fk,
                            references: { ...fk.references, table: v, column: '' }
                        })}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select table" />
                        </SelectTrigger>
                        <SelectContent>
                            {otherTables.map((t) => (
                                <SelectItem key={t.name} value={t.name}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Referenced Column */}
                <div className="col-span-3">
                    <label className="text-xs text-muted-foreground mb-1 block">Ref. Column</label>
                    <Select
                        value={fk.references.column}
                        onValueChange={(v) => onUpdate(index, {
                            ...fk,
                            references: { ...fk.references, column: v }
                        })}
                        disabled={!fk.references.table}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                            {refColumns.map((col) => (
                                <SelectItem key={col.name} value={col.name}>
                                    {col.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Delete */}
                <div className="col-span-1 flex justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TableEditor;
