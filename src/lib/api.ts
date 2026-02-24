const BASE = '/missioncontrol';

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}
