"use client"

import React from 'react';
import { Column, SQLDataTypeMySQL, SQLDataTypePostgreSQL } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Trash2, GripVertical } from 'lucide-react';

const MYSQL_TYPES: SQLDataTypeMySQL[] = [
    "INT", "SMALLINT", "MEDIUMINT", "BIGINT", "FLOAT", "DOUBLE", "DECIMAL",
    "DATE", "DATETIME", "TIMESTAMP", "TIME", "YEAR",
    "CHAR", "VARCHAR", "BINARY", "VARBINARY",
    "TINYBLOB", "BLOB", "MEDIUMBLOB", "LONGBLOB",
    "TINYTEXT", "TEXT", "MEDIUMTEXT", "LONGTEXT",
    "ENUM", "SET"
];

const POSTGRESQL_TYPES: SQLDataTypePostgreSQL[] = [
    "SMALLINT", "INTEGER", "BIGINT", "SERIAL", "BIGSERIAL",
    "DECIMAL", "NUMERIC", "REAL", "DOUBLE PRECISION",
    "DATE", "TIMESTAMP", "TIMESTAMPTZ", "TIME", "INTERVAL",
    "CHAR", "VARCHAR", "TEXT",
    "BOOLEAN", "JSON", "JSONB", "UUID"
];

interface ColumnEditorProps {
    column: Column;
    index: number;
    engine: "mysql" | "postgresql";
    onUpdate: (index: number, column: Column) => void;
    onDelete: (index: number) => void;
}

export const ColumnEditor: React.FC<ColumnEditorProps> = ({
    column,
    index,
    engine,
    onUpdate,
    onDelete,
}) => {
    const types = engine === "mysql" ? MYSQL_TYPES : POSTGRESQL_TYPES;
    const showEnumValues = column.type === "ENUM" || column.type === "SET";

    const updateField = <K extends keyof Column>(field: K, value: Column[K]) => {
        onUpdate(index, { ...column, [field]: value });
    };

    return (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg group">
            <div className="flex items-center h-9 text-muted-foreground cursor-move">
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex-1 grid grid-cols-12 gap-2">
                {/* Column Name */}
                <div className="col-span-3">
                    <Input
                        value={column.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="column_name"
                        className="h-9 font-mono text-sm"
                    />
                </div>

                {/* Type Selector */}
                <div className="col-span-3">
                    <Select
                        value={column.type}
                        onValueChange={(v) => updateField('type', v as Column['type'])}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {types.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Constraints */}
                <div className="col-span-5 flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                            checked={column.primaryKey}
                            onCheckedChange={(checked) => updateField('primaryKey', !!checked)}
                        />
                        <span>PK</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                            checked={column.notNull}
                            onCheckedChange={(checked) => updateField('notNull', !!checked)}
                        />
                        <span>NOT NULL</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                            checked={column.unique}
                            onCheckedChange={(checked) => updateField('unique', !!checked)}
                        />
                        <span>UNIQUE</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                            checked={column.autoIncrement}
                            onCheckedChange={(checked) => updateField('autoIncrement', !!checked)}
                        />
                        <span>AUTO</span>
                    </label>
                </div>

                {/* Delete */}
                <div className="col-span-1 flex justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Default Value */}
                <div className="col-span-4">
                    <Input
                        value={column.default?.toString() ?? ''}
                        onChange={(e) => updateField('default', e.target.value || null)}
                        placeholder="Default value"
                        className="h-8 text-xs"
                    />
                </div>

                {/* Enum Values (conditional) */}
                {showEnumValues && (
                    <div className="col-span-8">
                        <Input
                            value={column.enumValues?.join(', ') ?? ''}
                            onChange={(e) => updateField('enumValues', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="Enum values (comma separated)"
                            className="h-8 text-xs"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ColumnEditor;
