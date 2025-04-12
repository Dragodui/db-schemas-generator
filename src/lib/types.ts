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

// Define ForeignKey structure
export interface ForeignKey {
    column: string;
    references: {
        table: string;
        column: string;
    };
}

// Define Table with columns and optional foreign keys
export interface Table {
    name: string;
    columns: Column[];
    foreignKeys?: ForeignKey[];
    // Optionally specify the type of the database (could be used to switch validation later)
    engine?: "mysql" | "postgresql";
}

// Main JSON schema structure with tables
export interface JSONSchema {
    tables: Table[];
}