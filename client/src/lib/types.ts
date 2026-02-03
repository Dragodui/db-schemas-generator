// Define specific data types for MySQL and PostgreSQL
export type SQLDataTypeMySQL =
    | "INT"
    | "SMALLINT"
    | "MEDIUMINT"
    | "BIGINT"
    | "FLOAT"
    | "DOUBLE"
    | "DECIMAL"
    | "DATE"
    | "DATETIME"
    | "TIMESTAMP"
    | "TIME"
    | "YEAR"
    | "CHAR"
    | "VARCHAR"
    | "BINARY"
    | "VARBINARY"
    | "TINYBLOB"
    | "BLOB"
    | "MEDIUMBLOB"
    | "LONGBLOB"
    | "TINYTEXT"
    | "TEXT"
    | "MEDIUMTEXT"
    | "LONGTEXT"
    | "ENUM"
    | "SET";

export type SQLDataTypePostgreSQL =
    | "SMALLINT"
    | "INTEGER"
    | "BIGINT"
    | "SERIAL"
    | "BIGSERIAL"
    | "DECIMAL"
    | "NUMERIC"
    | "REAL"
    | "DOUBLE PRECISION"
    | "DATE"
    | "TIMESTAMP"
    | "TIMESTAMPTZ"
    | "TIME"
    | "INTERVAL"
    | "CHAR"
    | "VARCHAR"
    | "TEXT"
    | "BOOLEAN"
    | "JSON"
    | "JSONB"
    | "UUID";

// Define a generic Column type that can use types from either DB
export interface Column {
    name: string;
    // Use union if table supports both types or narrow it down per table config
    type: SQLDataTypeMySQL | SQLDataTypePostgreSQL;
    primaryKey?: boolean;
    notNull?: boolean;
    unique?: boolean;
    // Additional options for defaults, auto increments etc.
    default?: string | number | boolean | null;
    autoIncrement?: boolean;
    // For ENUM or SET, you might want to specify allowed values:
    enumValues?: string[];
}

// Relationship types for foreign keys
export type RelationType = '1:1' | '1:n' | 'n:1' | 'n:m';

// Define ForeignKey structure
export interface ForeignKey {
    column: string;
    references: {
        table: string;
        column: string;
    };
    relationType?: RelationType;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// Predefined table colors
export const TABLE_COLORS = [
    { name: 'Default', value: '#6366f1' },    // Indigo
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Gray', value: '#6b7280' },
] as const;

// Define Table with columns and optional foreign keys
export interface Table {
    name: string;
    columns: Column[];
    foreignKeys?: ForeignKey[];
    // Optionally specify the type of the database (could be used to switch validation later)
    engine?: "mysql" | "postgresql";
    // Table color for visual distinction in graph
    color?: string;
}

// Main JSON schema structure with tables
export interface JSONSchema {
    tables: Table[];
}