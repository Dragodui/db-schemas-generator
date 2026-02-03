"use client"

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { api, Schema, ShareResponse } from '@/lib/api';
import { Copy, RefreshCw, Link, Eye, Edit3, Lock, Check } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: Schema | null;
  onUpdate?: () => void;
}

export function ShareDialog({ open, onOpenChange, schema, onUpdate }: ShareDialogProps) {
  const [shareAccess, setShareAccess] = useState<'none' | 'view' | 'edit'>('none');
  const [shareToken, setShareToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (schema) {
      setShareAccess(schema.share_access || 'none');
      setShareToken(schema.share_token || '');
    }
  }, [schema]);

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : '';

  const handleAccessChange = async (access: 'none' | 'view' | 'edit') => {
    if (!schema) return;

    setLoading(true);
    try {
      const result = await api.updateShareSettings(schema.id, access);
      setShareAccess(access);
      setShareToken(result.share_token || '');
      onUpdate?.();
    } catch (err) {
      console.error('Failed to update share settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!schema) return;

    setLoading(true);
    try {
      const result = await api.regenerateShareToken(schema.id);
      setShareToken(result.share_token);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to regenerate token', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share Schema
          </DialogTitle>
          <DialogDescription>
            Share &quot;{schema?.name}&quot; with others via link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Access Level Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Level</label>
            <Select
              value={shareAccess}
              onValueChange={(v) => handleAccessChange(v as typeof shareAccess)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Private</div>
                      <div className="text-xs text-muted-foreground">Only you can access</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <div>
                      <div className="font-medium">View Only</div>
                      <div className="text-xs text-muted-foreground">Anyone with link can view</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Can Edit</div>
                      <div className="text-xs text-muted-foreground">Anyone with link can edit</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Link */}
          {shareAccess !== 'none' && shareToken && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Share Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateToken}
                disabled={loading}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate new link
              </Button>
              <p className="text-xs text-muted-foreground">
                Generating a new link will invalidate the old one
              </p>
            </div>
          )}

          {shareAccess === 'none' && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                This schema is private. Change access level to share it.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
