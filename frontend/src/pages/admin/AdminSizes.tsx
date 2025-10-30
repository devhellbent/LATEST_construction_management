import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { sizesAPI } from '../../services/api';
import { Plus, Search, Edit, Save, X, Upload } from 'lucide-react';

interface Size { size_id: number; value: string; category?: string; is_active?: boolean; }
interface Pagination { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number; }

const AdminSizes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingCategory, setEditingCategory] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['sizes', { q: searchTerm, page: currentPage }],
    () => sizesAPI.getSizes({ q: searchTerm || undefined, page: currentPage, limit: 20 }),
    { onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to load sizes'); } }
  );

  const sizes: Size[] = (data as any)?.data?.sizes || [];
  const pagination: Pagination = (data as any)?.data?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 };

  const createMutation = useMutation((payload: any) => sizesAPI.createSize(payload.value, payload.category), {
    onSuccess: () => { toast.success('Size added'); queryClient.invalidateQueries(['sizes']); setNewValue(''); setNewCategory(''); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to add size'); }
  });

  const updateMutation = useMutation(({ id, data }: { id: number; data: any }) => sizesAPI.updateSize(id, data), {
    onSuccess: () => { toast.success('Size updated'); queryClient.invalidateQueries(['sizes']); setEditingId(null); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to update size'); }
  });

  const bulkMutation = useMutation((values: string[]) => sizesAPI.bulkImport(values), {
    onSuccess: () => { toast.success('Sizes imported'); queryClient.invalidateQueries(['sizes']); setBulkText(''); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed to import sizes'); }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) { toast.error('Enter size value'); return; }
    createMutation.mutate({ value: newValue.trim(), category: newCategory.trim() || undefined });
  };

  const startEdit = (s: Size) => { setEditingId(s.size_id); setEditingValue(s.value); setEditingCategory(s.category || ''); };
  const saveEdit = () => { if (editingId == null) return; updateMutation.mutate({ id: editingId, data: { value: editingValue.trim(), category: editingCategory.trim() || null } }); };
  const toggleActive = (s: Size) => updateMutation.mutate({ id: s.size_id, data: { is_active: !s.is_active } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sizes</h1>
          <p className="text-slate-600">Manage master size values</p>
        </div>
      </div>

      <div className="card-mobile">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="input" placeholder="New size value" value={newValue} onChange={e => setNewValue(e.target.value)} />
          <input className="input" placeholder="Category (optional)" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
          <button type="submit" className="btn btn-primary md:col-span-1 flex items-center justify-center"><Plus className="w-4 h-4 mr-2"/>Add</button>
        </form>
      </div>

      <div className="card-mobile">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input className="pl-9 input" placeholder="Search sizes..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="flex-1">
            <div className="flex gap-2">
              <textarea className="input w-full" rows={1} placeholder="Paste sizes (one per line)" value={bulkText} onChange={e => setBulkText(e.target.value)} />
              <button className="btn btn-secondary flex items-center" onClick={() => {
                const values = bulkText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                if (!values.length) { toast.error('Paste sizes first'); return; }
                bulkMutation.mutate(values);
              }} type="button"><Upload className="w-4 h-4 mr-2"/>Import</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card-mobile">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sizes.map(s => (
                <tr key={s.size_id}>
                  <td className="px-4 py-2">
                    {editingId === s.size_id ? (
                      <input className="input" value={editingValue} onChange={e => setEditingValue(e.target.value)} />
                    ) : (
                      <span>{s.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editingId === s.size_id ? (
                      <input className="input" value={editingCategory} onChange={e => setEditingCategory(e.target.value)} />
                    ) : (
                      <span>{s.category || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.is_active ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td className="px-4 py-2 flex gap-2 justify-end">
                    {editingId === s.size_id ? (
                      <>
                        <button className="btn btn-primary btn-sm flex items-center" onClick={saveEdit} type="button"><Save className="w-4 h-4 mr-1"/>Save</button>
                        <button className="btn btn-secondary btn-sm flex items-center" onClick={() => setEditingId(null)} type="button"><X className="w-4 h-4 mr-1"/>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-secondary btn-sm flex items-center" onClick={() => startEdit(s)} type="button"><Edit className="w-4 h-4 mr-1"/>Edit</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(s)} type="button">{s.is_active ? 'Disable' : 'Enable'}</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <div className="text-sm text-slate-600">Showing {sizes.length} of {pagination.totalItems} sizes</div>
        </div>
      </div>
    </div>
  );
};

export default AdminSizes;



