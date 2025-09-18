"use client"

import React from 'react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader } from './ui/sidebar';
import { Button } from './ui/button';
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { JSONSchema } from '@/lib/types';

const AppSidebar = ({setSchema}: {setSchema: (schema: JSONSchema) => void, schema: JSONSchema | null}) => {
    const [jsonInput, setJsonInput] = React.useState<string>('');
    const [parsingError, setParsingError] = React.useState<boolean>(false);

    const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => 
    {
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
        } catch (error) {
            console.error("Error parsing JSON:", error);
            setParsingError(true);
        }
    }

    return (
        <Sidebar>
            <SidebarHeader className='text-3xl font-bold'>
                Provide JSON Schema
            </SidebarHeader>
            <SidebarContent>
            <SidebarGroup>
            <SidebarGroupLabel className='text-2xl mb-4'>JSON</SidebarGroupLabel>
            <SidebarGroupContent>
                <Input className='mb-3' type="file" accept='.json' onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFileUpload(e)}/>
                <Textarea value={jsonInput} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)} className='max-h-[400px]' placeholder={`{
  "tables": [
    {
      "name": "users",
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true, "autoIncrement": true },
        { "name": "username", "type": "varchar", "length": 50, "notNull": true },
        { "name": "email", "type": "varchar", "length": 100, "notNull": true, "unique": true },
        { "name": "created_at", "type": "timestamp", "default": "CURRENT_TIMESTAMP" }
      ]
    },
    {
      "name": "posts",
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true, "autoIncrement": true },
        { "name": "title", "type": "varchar", "length": 100, "notNull": true },
        { "name": "content", "type": "text" },
        { "name": "user_id", "type": "int", "notNull": true },
        { "name": "created_at", "type": "timestamp", "default": "CURRENT_TIMESTAMP" }
      ],
      "foreignKeys": [
        {
          "column": "user_id",
          "references": {
            "table": "users",
            "column": "id"
          },
          "onDelete": "CASCADE"
        }
      ]
    },
    {
      "name": "post_tags",
      "columns": [
        { "name": "post_id", "type": "int", "notNull": true },
        { "name": "tag_id", "type": "int", "notNull": true }
      ],
      "foreignKeys": [
        {
          "column": "post_id",
          "references": {
            "table": "posts",
            "column": "id"
          },
          "onDelete": "CASCADE"
        },
        {
          "column": "tag_id",
          "references": {
            "table": "tags",
            "column": "id"
          },
          "onDelete": "CASCADE"
        }
      ],
      "indexes": [
        {
          "name": "post_tag_pk",
          "columns": ["post_id", "tag_id"],
          "unique": true
        }
      ]
    },
    {
      "name": "tags",
      "columns": [
        { "name": "id", "type": "int", "primaryKey": true, "autoIncrement": true },
        { "name": "name", "type": "varchar", "length": 50, "notNull": true, "unique": true }
      ]
    }
  ]
}`}/>
<p className={`text-red-500 text-md my-3 ${parsingError ? "flex" : "hidden"}`}>Invalid JSON file. Please check your input.</p>
<Button onClick={generateSchema} className='mt-3 w-full' >
    Generate Scheme
</Button>
            </SidebarGroupContent>
            </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
};

export default AppSidebar;