"use client"

import AppSidebar from "@/components/app-sidebar";
import { JSONSchema } from "@/lib/types";
import dynamic from 'next/dynamic';
import { useState } from "react";

const SchemaGraph = dynamic(() => import('../components/schema-graph'), { ssr: false });

export default function Home() {
  const [schema, setSchema] = useState<JSONSchema | null>(null);
  return (
   <>
   <AppSidebar setSchema={setSchema} schema={schema}/>
   <SchemaGraph schema={schema} />;
   {/* <FlowExample/> */}
   </>
  );
}
