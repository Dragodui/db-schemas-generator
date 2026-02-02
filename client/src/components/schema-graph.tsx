'use client';

import { JSONSchema } from '@/lib/types';
import { ReactFlow, Background, Controls, Edge, Node, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';
import { Switch } from './ui/switch';
import { Key } from 'lucide-react';

export default function SchemaGraph({ schema }: { schema: JSONSchema | null }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodesDruggable, setNodesDraggable] = useState(true);

  useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    const initialPositions = new Map<string, { x: number; y: number }>();

    for (const node of nodes) {
        initialPositions.set(node.id, { x: node.position.x, y: node.position.y });
    }
    schema?.tables.forEach((table, index) => {
      const position = initialPositions.get(table.name) || { x: (index % 3) * 300, y: Math.floor(index / 3) * 300 };

      const label = (
        <div>
          <strong>{table.name}</strong>
          <ul style={{ fontSize: '12px', marginTop: '5px' }}>
            {table.columns.map((col) => (
              <li key={col.name}>
                {col.name}: {col.type}
                {col.primaryKey ? <Key/> : ''}
              </li>
            ))}
          </ul>
        </div>
      );

      initialNodes.push({
        id: table.name,
        position,
        data: { label },
        type: 'default',
        draggable: nodesDruggable // Explicitly enable dragging for each node
      });

      if (table.foreignKeys) {
        table.foreignKeys.forEach((fk) => {
          initialEdges.push({
            id: `${table.name}-${fk.column}->${fk.references.table}`,
            source: table.name,
            target: fk.references.table,
            label: `${fk.column} → ${fk.references.column}`,
            animated: true,
            style: { stroke: 'blue' },
            labelStyle: { fill: 'blue', fontWeight: 'bold' }
          });
        });
      }
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [schema, setNodes, setEdges, nodesDruggable]);

  return (
    <div style={{ width: '100%', height: '90vh' }}>
         <div className='p-4 bg-transparent flex items-center gap-3'>
         <Switch
                      checked={nodesDruggable}
                      onCheckedChange={() => setNodesDraggable(!nodesDruggable)}
                    />
                    <p className='text-md fond-bold'>Nodes Draggable</p>
         </div>
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        nodesDraggable={nodesDruggable} // This is the default, but explicit is good
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}