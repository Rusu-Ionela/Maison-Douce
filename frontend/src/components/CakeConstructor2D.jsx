import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import api from '/src/lib/api.js';

export default function CakeConstructor2D(props) {
    const stageRef = useRef(null);
    const [mesaj, setMesaj] = useState('');
    const [layers, setLayers] = useState([
        { id: 'bottom', label: 'Blat', color: '#f6d7c3', height: 40 },
        { id: 'middle', label: 'Cremă', color: '#fff1e6', height: 30 },
        { id: 'top', label: 'Decor', color: '#ffd6e0', height: 20 },
    ]);
    const [loading, setLoading] = useState(false);
    const [designId, setDesignId] = useState(null);

    useEffect(() => {
        // prefer prop.designId, fallback to query param
        try {
            const params = new URLSearchParams(window.location.search);
            const id = props?.designId || params.get('designId');
            if (!id) return;
            setDesignId(id);
            (async () => {
                setLoading(true);
                try {
                    const { data } = await api.get(`/personalizare/${id}`);
                    if (data) {
                        if (Array.isArray(data.culori) && data.culori.length > 0) {
                            setLayers((prev) => prev.map((l, i) => ({ ...l, color: data.culori[i] || l.color })));
                        }
                        if (data.mesaj) setMesaj(data.mesaj);
                        if (data.config && typeof data.config === 'object') {
                            if (Array.isArray(data.config.layers)) {
                                setLayers(data.config.layers.map((ly) => ({ id: ly.id || 'layer', label: ly.label || 'Layer', color: ly.color || '#fff', height: ly.height || 20 })));
                            }
                            if (data.config.mesaj) setMesaj(data.config.mesaj);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load design', e);
                } finally { setLoading(false); }
            })();
        } catch (e) {
            console.warn('No designId in query', e);
        }
    }, [props?.designId]);

    const updateColor = (idx, color) => {
        setLayers(prev => prev.map((l, i) => i === idx ? { ...l, color } : l));
    };

    const exportImage = () => {
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
        return uri;
    };

    const saveDesign = async () => {
        const image = exportImage();
        const payload = {
            clientId: localStorage.getItem('userId') || undefined,
            forma: 'rotund',
            culori: layers.map(l => l.color),
            mesaj,
            imageData: image,
            config: { layers, mesaj },
            note: 'Saved from constructor 2D',
        };

        try {
            if (designId) {
                await api.put(`/personalizare/${designId}`, payload);
                alert('Design actualizat');
            } else {
                await api.post('/personalizare', payload);
                alert('Design salvat (server)');
            }
        } catch (e) {
            console.error('Save design failed', e);
            alert('Eroare la salvare design');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
                <div className="bg-white p-4 rounded shadow-sm">
                    <Stage width={420} height={360} ref={stageRef} style={{ background: '#f8fafc' }}>
                        <Layer>
                            {/* plate */}
                            <Rect x={60} y={40} width={300} height={280} fill={'#fff7f0'} cornerRadius={20} />
                            {/* cake layers stacked bottom->top */}
                            {(() => {
                                let y = 220;
                                return layers.map((l, i) => {
                                    const h = l.height;
                                    const node = (
                                        <Rect key={l.id} x={120} y={y - h} width={180} height={h} fill={l.color} cornerRadius={h / 2} />
                                    );
                                    y -= h + 4;
                                    return node;
                                });
                            })()}
                            <Text x={120} y={50} text={'Preview: tort 2D'} fontSize={14} fill={'#333'} />
                        </Layer>
                    </Stage>
                </div>
            </div>

            <aside>
                <div className="bg-white p-4 rounded shadow-sm">
                    <h3 className="text-lg font-semibold mb-2">Setări tort</h3>
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontWeight: 600 }}>Mesaj pe tort (opțional)</label>
                        <input value={mesaj} onChange={e => setMesaj(e.target.value)} placeholder="Ex: La mulți ani!" className="input" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                    </div>
                    {layers.map((l, idx) => (
                        <div key={l.id} style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600 }}>{l.label}</div>
                            <input type="color" value={l.color} onChange={e => updateColor(idx, e.target.value)} style={{ marginTop: 8 }} />
                        </div>
                    ))}

                    <div className="flex gap-2 mt-3">
                        <button className="px-3 py-2 border rounded" onClick={() => {
                            const uri = exportImage();
                            const w = window.open('about:blank');
                            const img = new Image(); img.src = uri; img.onload = () => w.document.body.appendChild(img);
                        }}>Export imagine</button>
                        <button className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={saveDesign}>Salvează design</button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
