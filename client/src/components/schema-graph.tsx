'use client';

import { JSONSchema, ForeignKey, RelationType } from '@/lib/types';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Connection,
  Handle,
  Position,
  NodeProps,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState, useCallback } from 'react';
import { Switch } from './ui/switch';
import { Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface TableNodeData {
  label: string;
  tableName: string;
  columns: { name: string; type: string; primaryKey?: boolean }[];
}

// Custom Table Node with handles for each column
function TableNode({ data, id }: NodeProps<Node<TableNodeData>>) {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[200px]">
      {/* Table Header */}
      <div className="bg-primary text-primary-foreground px-3 py-2 rounded-t-md font-bold text-sm">
        {data.tableName}
      </div>

      {/* Columns */}
      <div className="p-1">
        {data.columns.map((col, index) => (
          <div
            key={col.name}
            className="relative flex items-center justify-between px-2 py-1.5 text-xs hover:bg-muted/50 rounded"
          >
            {/* Left Handle (Target) */}
            <Handle
              type="target"
              position={Position.Left}
              id={`${id}-${col.name}-target`}
              className="!w-2 !h-2 !bg-blue-500 !border-2 !border-white"
              style={{ top: '50%' }}
            />

            <div className="flex items-center gap-1.5">
              {col.primaryKey && <Key className="h-3 w-3 text-amber-500" />}
              <span className="font-medium">{col.name}</span>
            </div>
            <span className="text-muted-foreground ml-2">{col.type}</span>

            {/* Right Handle (Source) */}
            <Handle
              type="source"
              position={Position.Right}
              id={`${id}-${col.name}-source`}
              className="!w-2 !h-2 !bg-green-500 !border-2 !border-white"
              style={{ top: '50%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom Edge with relation type label
function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relationType = (data?.relationType as RelationType) || '1:n';
  const sourceCol = data?.sourceColumn as string;
  const targetCol = data?.targetColumn as string;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{ stroke: '#3b82f6', strokeWidth: 2 }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold shadow">
            {relationType}
          </div>
          <div className="text-[10px] text-center text-muted-foreground mt-0.5">
            {sourceCol} → {targetCol}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationEdge: RelationEdge,
};

interface SchemaGraphProps {
  schema: JSONSchema | null;
  onSchemaChange?: (schema: JSONSchema) => void;
}

export default function SchemaGraph({ schema, onSchemaChange }: SchemaGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodesDraggable, setNodesDraggable] = useState(true);

  // Connection dialog state
  const [connectionDialog, setConnectionDialog] = useState<{
    open: boolean;
    connection: Connection | null;
  }>({ open: false, connection: null });
  const [selectedRelationType, setSelectedRelationType] = useState<RelationType>('1:n');

  // Build nodes and edges from schema
  useMemo(() => {
    if (!schema) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const initialNodes: Node<TableNodeData>[] = [];
    const initialEdges: Edge[] = [];
    const initialPositions = new Map<string, { x: number; y: number }>();

    // Preserve existing positions
    for (const node of nodes) {
      initialPositions.set(node.id, { x: node.position.x, y: node.position.y });
    }

    schema.tables.forEach((table, index) => {
      const position = initialPositions.get(table.name) || {
        x: (index % 3) * 350,
        y: Math.floor(index / 3) * 300,
      };

      initialNodes.push({
        id: table.name,
        position,
        data: {
          label: table.name,
          tableName: table.name,
          columns: table.columns.map((col) => ({
            name: col.name,
            type: col.type,
            primaryKey: col.primaryKey,
          })),
        },
        type: 'tableNode',
        draggable: nodesDraggable,
      });

      // Create edges from foreign keys
      if (table.foreignKeys) {
        table.foreignKeys.forEach((fk) => {
          initialEdges.push({
            id: `${table.name}-${fk.column}->${fk.references.table}-${fk.references.column}`,
            source: table.name,
            sourceHandle: `${table.name}-${fk.column}-source`,
            target: fk.references.table,
            targetHandle: `${fk.references.table}-${fk.references.column}-target`,
            type: 'relationEdge',
            data: {
              relationType: fk.relationType || '1:n',
              sourceColumn: fk.column,
              targetColumn: fk.references.column,
            },
          });
        });
      }
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [schema, nodesDraggable]);

  // Handle new connection attempt
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }

    // Open dialog to select relation type
    setConnectionDialog({ open: true, connection });
    setSelectedRelationType('1:n');
  }, []);

  // Confirm connection with selected relation type
  const confirmConnection = useCallback(() => {
    const { connection } = connectionDialog;
    if (!connection || !schema || !onSchemaChange) {
      setConnectionDialog({ open: false, connection: null });
      return;
    }

    // Parse handles to get column names
    // Format: tableName-columnName-source/target
    const sourceHandle = connection.sourceHandle || '';
    const targetHandle = connection.targetHandle || '';

    const sourceColumn = sourceHandle.replace(`${connection.source}-`, '').replace('-source', '');
    const targetColumn = targetHandle.replace(`${connection.target}-`, '').replace('-target', '');

    // Create new foreign key
    const newFk: ForeignKey = {
      column: sourceColumn,
      references: {
        table: connection.target!,
        column: targetColumn,
      },
      relationType: selectedRelationType,
    };

    // Update schema
    const updatedSchema: JSONSchema = {
      tables: schema.tables.map((table) => {
        if (table.name === connection.source) {
          const existingFks = table.foreignKeys || [];
          // Check if this FK already exists
          const exists = existingFks.some(
            (fk) =>
              fk.column === newFk.column &&
              fk.references.table === newFk.references.table &&
              fk.references.column === newFk.references.column
          );
          if (exists) return table;

          return {
            ...table,
            foreignKeys: [...existingFks, newFk],
          };
        }
        return table;
      }),
    };

    onSchemaChange(updatedSchema);
    setConnectionDialog({ open: false, connection: null });
  }, [connectionDialog, schema, onSchemaChange, selectedRelationType]);

  // Delete edge/relation
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!schema || !onSchemaChange) return;

      // Find and remove the foreign key
      const updatedSchema: JSONSchema = {
        tables: schema.tables.map((table) => {
          if (table.name === edge.source && table.foreignKeys) {
            return {
              ...table,
              foreignKeys: table.foreignKeys.filter((fk) => {
                const edgeId = `${table.name}-${fk.column}->${fk.references.table}-${fk.references.column}`;
                return edgeId !== edge.id;
              }),
            };
          }
          return table;
        }),
      };

      onSchemaChange(updatedSchema);
    },
    [schema, onSchemaChange]
  );

  return (
    <div style={{ width: '100%', height: '100%' }} className="relative">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow">
        <div className="flex items-center gap-2">
          <Switch
            checked={nodesDraggable}
            onCheckedChange={() => setNodesDraggable(!nodesDraggable)}
          />
          <span className="text-sm">Drag nodes</span>
        </div>
        {onSchemaChange && (
          <div className="text-xs text-muted-foreground border-l pl-4">
            Drag from column (green) to column (blue) to create relations
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onSchemaChange ? onConnect : undefined}
        onEdgeClick={onSchemaChange ? onEdgeClick : undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable={nodesDraggable}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        defaultEdgeOptions={{ type: 'relationEdge' }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Relation Type Dialog */}
      <Dialog
        open={connectionDialog.open}
        onOpenChange={(open) => {
          if (!open) setConnectionDialog({ open: false, connection: null });
        }}
      >
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Create Relation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              {connectionDialog.connection && (
                <>
                  <span className="font-medium">{connectionDialog.connection.source}</span>
                  {' → '}
                  <span className="font-medium">{connectionDialog.connection.target}</span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Relation Type</label>
              <Select
                value={selectedRelationType}
                onValueChange={(v) => setSelectedRelationType(v as RelationType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">1:1</span>
                      <span className="text-muted-foreground">One to One</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="1:n">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">1:n</span>
                      <span className="text-muted-foreground">One to Many</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="n:1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">n:1</span>
                      <span className="text-muted-foreground">Many to One</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="n:m">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">n:m</span>
                      <span className="text-muted-foreground">Many to Many</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConnectionDialog({ open: false, connection: null })}
            >
              Cancel
            </Button>
            <Button onClick={confirmConnection}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
