import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TortForm({ initialData, onSubmit, submitText = "Salvează" }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nume: initialData?.nume || '',
        descriere: initialData?.descriere || '',
        ingrediente: (initialData?.ingrediente || []).join(', '),
        pret: initialData?.pret || 0,
        stoc: initialData?.stoc || 0,
        categorie: initialData?.categorie || 'torturi',
        imagine: null,
        activ: initialData?.activ ?? true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (key === 'imagine' && form[key] instanceof File) {
                    formData.append(key, form[key]);
                } else if (form[key] !== null) {
                    formData.append(key, form[key]);
                }
            });

            await onSubmit(formData);
            navigate('/admin/torturi');
        } catch (err) {
            setError(err.message || 'A apărut o eroare');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto p-6">
            {error && (
                <div className="bg-red-50 text-red-500 p-3 rounded">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1">Nume</label>
                <input
                    type="text"
                    value={form.nume}
                    onChange={e => setForm({...form, nume: e.target.value})}
                    className="w-full border rounded p-2"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Descriere</label>
                <textarea
                    value={form.descriere}
                    onChange={e => setForm({...form, descriere: e.target.value})}
                    className="w-full border rounded p-2"
                    rows="3"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Ingrediente</label>
                <input
                    type="text"
                    value={form.ingrediente}
                    onChange={e => setForm({...form, ingrediente: e.target.value})}
                    className="w-full border rounded p-2"
                    placeholder="Ingrediente separate prin virgulă"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Preț (MDL)</label>
                    <input
                        type="number"
                        value={form.pret}
                        onChange={e => setForm({...form, pret: e.target.value})}
                        className="w-full border rounded p-2"
                        min="0"
                        step="0.01"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1">Stoc</label>
                    <input
                        type="number"
                        value={form.stoc}
                        onChange={e => setForm({...form, stoc: e.target.value})}
                        className="w-full border rounded p-2"
                        min="0"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Imagine</label>
                <input
                    type="file"
                    onChange={e => setForm({...form, imagine: e.target.files[0]})}
                    className="w-full border rounded p-2"
                    accept="image/*"
                />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.activ}
                        onChange={e => setForm({...form, activ: e.target.checked})}
                    />
                    <span className="text-sm">Activ</span>
                </label>

                <select
                    value={form.categorie}
                    onChange={e => setForm({...form, categorie: e.target.value})}
                    className="border rounded p-2"
                >
                    <option value="torturi">Torturi</option>
                    <option value="prajituri">Prăjituri</option>
                </select>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/admin/torturi')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                    Anulează
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Se salvează...' : submitText}
                </button>
            </div>
        </form>
    );
}