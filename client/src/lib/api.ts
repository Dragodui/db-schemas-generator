const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ApiError {
  error: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined' && !this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(name: string, email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async me() {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Schema endpoints
  async createSchema(name: string, data: SchemaData, isPublic: boolean = false) {
    return this.request<Schema>('/schemas', {
      method: 'POST',
      body: JSON.stringify({ name, data, is_public: isPublic }),
    });
  }

  async getMySchemas() {
    return this.request<Schema[]>('/schemas');
  }

  async getPublicSchemas() {
    return this.request<Schema[]>('/schemas/public');
  }

  async getSchema(id: number, shareToken?: string) {
    const url = shareToken ? `/schemas/${id}?token=${shareToken}` : `/schemas/${id}`;
    return this.request<SchemaWithAccess>(url);
  }

  async getSchemaByShareToken(token: string) {
    return this.request<SchemaWithAccess>(`/shared/${token}`);
  }

  async updateSchema(id: number, updates: Partial<{ name: string; data: SchemaData; is_public: boolean }>, shareToken?: string) {
    const url = shareToken ? `/schemas/${id}?token=${shareToken}` : `/schemas/${id}`;
    return this.request<Schema>(url, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateShareSettings(id: number, access: 'none' | 'view' | 'edit') {
    return this.request<ShareResponse>(`/schemas/${id}/share`, {
      method: 'PUT',
      body: JSON.stringify({ access }),
    });
  }

  async regenerateShareToken(id: number) {
    return this.request<ShareResponse>(`/schemas/${id}/share/regenerate`, {
      method: 'POST',
    });
  }

  async deleteSchema(id: number) {
    return this.request<void>(`/schemas/${id}`, {
      method: 'DELETE',
    });
  }

  // Export endpoints
  async exportSchema(id: number, format: 'mysql' | 'postgres' | 'mongo') {
    return this.request<{ sql: string; format: string }>(`/schemas/${id}/export?format=${format}`);
  }

  async exportDirect(data: SchemaData, format: 'mysql' | 'postgres' | 'mongo') {
    return this.request<{ sql: string; format: string }>('/export', {
      method: 'POST',
      body: JSON.stringify({ data, format }),
    });
  }

  async downloadExport(id: number, format: 'mysql' | 'postgres' | 'mongo') {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/schemas/${id}/download?format=${format}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `schema.${format === 'mongo' ? 'js' : 'sql'}`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Import endpoint
  async importSQL(sql: string, format: 'mysql' | 'postgres') {
    return this.request<{ data: SchemaData }>('/import', {
      method: 'POST',
      body: JSON.stringify({ sql, format }),
    });
  }
}

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface SchemaData {
  tables: TableData[];
}

export interface TableData {
  name: string;
  columns: ColumnData[];
  foreignKeys?: ForeignKeyData[];
  engine?: string;
  color?: string;
}

export interface ColumnData {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: string;
  autoIncrement?: boolean;
  enumValues?: string[];
}

export interface ForeignKeyData {
  column: string;
  references: {
    table: string;
    column: string;
  };
  relationType?: '1:1' | '1:n' | 'n:1' | 'n:m';
  onDelete?: string;
  onUpdate?: string;
}

export interface Schema {
  id: number;
  user_id: number;
  name: string;
  data: SchemaData;
  is_public: boolean;
  share_token?: string;
  share_access?: 'none' | 'view' | 'edit';
  created_at: string;
  updated_at: string;
}

export interface SchemaWithAccess extends Schema {
  access_level: 'owner' | 'edit' | 'view';
}

export interface ShareResponse {
  share_token: string;
  share_access: string;
  share_url: string;
}

export const api = new ApiClient();
