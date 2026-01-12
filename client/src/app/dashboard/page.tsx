'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { api, Schema } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingSchema, setExportingSchema] = useState<Schema | null>(null);
  const [exportFormat, setExportFormat] = useState<'mysql' | 'postgres' | 'mongo'>('postgres');
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSchema, setDeletingSchema] = useState<Schema | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingSchema, setRenamingSchema] = useState<Schema | null>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSchemas();
    }
  }, [isAuthenticated]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const data = await api.getMySchemas();
      setSchemas(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schemas');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!exportingSchema) return;

    setExporting(true);
    try {
      const result = await api.exportSchema(exportingSchema.id, exportFormat);
      setExportResult(result.sql);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!exportingSchema) return;

    try {
      await api.downloadExport(exportingSchema.id, exportFormat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingSchema) return;

    setDeleting(true);
    try {
      await api.deleteSchema(deletingSchema.id);
      setSchemas(schemas.filter(s => s.id !== deletingSchema.id));
      setDeleteDialogOpen(false);
      setDeletingSchema(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = async () => {
    if (!renamingSchema || !newName.trim()) return;

    setRenaming(true);
    try {
      const updated = await api.updateSchema(renamingSchema.id, { name: newName.trim() });
      setSchemas(schemas.map(s => s.id === renamingSchema.id ? updated : s));
      setRenameDialogOpen(false);
      setRenamingSchema(null);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setRenaming(false);
    }
  };

  const togglePublic = async (schema: Schema) => {
    try {
      const updated = await api.updateSchema(schema.id, { is_public: !schema.is_public });
      setSchemas(schemas.map(s => s.id === schema.id ? updated : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const openInEditor = (schema: Schema) => {
    // Store schema in localStorage and redirect to editor
    localStorage.setItem('loadSchema', JSON.stringify(schema));
    router.push('/');
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Schemas</h1>
          <p className="text-muted-foreground mt-1">
            Manage and export your database schemas
          </p>
        </div>
        <Link href="/">
          <Button>Create New Schema</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {schemas.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">You don&apos;t have any schemas yet</p>
            <Link href="/">
              <Button>Create Your First Schema</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemas.map(schema => (
            <Card key={schema.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{schema.name}</CardTitle>
                    <CardDescription>
                      {schema.data.tables?.length || 0} tables
                      {schema.is_public && (
                        <span className="ml-2 text-green-600 dark:text-green-400">Public</span>
                      )}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openInEditor(schema)}>
                        Open in Editor
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setRenamingSchema(schema);
                        setNewName(schema.name);
                        setRenameDialogOpen(true);
                      }}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => togglePublic(schema)}>
                        {schema.is_public ? 'Make Private' : 'Make Public'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setExportingSchema(schema);
                        setExportResult(null);
                        setExportDialogOpen(true);
                      }}>
                        Export SQL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setDeletingSchema(schema);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-muted-foreground">
                  <p>Tables: {schema.data.tables?.map(t => t.name).join(', ') || 'None'}</p>
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Updated {new Date(schema.updated_at).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Schema: {exportingSchema?.name}</DialogTitle>
            <DialogDescription>
              Choose a format and export your schema as SQL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mongo">MongoDB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportResult && (
              <div className="relative">
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto max-h-80">
                  {exportResult}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(exportResult)}
                >
                  Copy
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Close
            </Button>
            {!exportResult ? (
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? 'Generating...' : 'Generate SQL'}
              </Button>
            ) : (
              <Button onClick={handleDownload}>
                Download File
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schema</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSchema?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Schema</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">New Name</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1"
              placeholder="Enter new name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={renaming || !newName.trim()}>
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
