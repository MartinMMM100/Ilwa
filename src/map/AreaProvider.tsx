import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { mapSnapshotSchema, suburbs, type AreaId, type MapSnapshot, type Suburb } from '../../shared/safetyMap';

type AreaState = {
  area: Suburb; selectArea: (id: AreaId) => void; data: MapSnapshot | null;
  loading: boolean; error: string; refresh: () => void;
};
const AreaContext = createContext<AreaState | null>(null);
export function AreaProvider({ children }: { children: ReactNode }) {
  const [areaId, setAreaId] = useState<AreaId>('braamfontein');
  const [snapshot, setSnapshot] = useState<MapSnapshot | null>(null);
  const [requestState, setRequestState] = useState({ areaId: '', loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const area = suburbs.find((item) => item.id === areaId)!;
  useEffect(() => {
    const controller = new AbortController();
    setRequestState({ areaId, loading: true, error: '' });
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let active = true;
    const load = async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
        const response = await fetch(`${base}/api/map/areas/${areaId}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Area reports could not be loaded.');
        const data = mapSnapshotSchema.parse(await response.json());
        if (data.areaId !== areaId) throw new Error('The server returned a different area.');
        if (active) { setSnapshot(data); setRequestState({ areaId, loading: false, error: '' }); }
      } catch {
        if (active) { setSnapshot(null); setRequestState({ areaId, loading: false,
          error: 'Could not load reports. Check your API connection and try again.' }); }
      } finally { clearTimeout(timeout); }
    };
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [areaId, revision]);
  const loading = requestState.areaId !== areaId || requestState.loading;
  return <AreaContext.Provider value={{ area, selectArea: setAreaId,
    data: !loading && snapshot?.areaId === areaId ? snapshot : null,
    loading, error: requestState.areaId === areaId ? requestState.error : '',
    refresh: () => setRevision((value) => value + 1),
  }}>{children}</AreaContext.Provider>;
}
export function useAreaMap() {
  const value = useContext(AreaContext);
  if (!value) throw new Error('AreaProvider is missing.');
  return value;
}
