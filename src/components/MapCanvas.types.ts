import type { ConcernZone } from '../../shared/safetyMap';
export type MapCanvasProps = {
  detailed?: boolean;
  onSelectArea?: () => void;
  onSelectZone?: (zone: ConcernZone | null) => void;
  selectedZoneId?: string;
};
