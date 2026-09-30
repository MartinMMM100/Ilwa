// Fictional seed placement only. These are approximate landmark centres, not incident coordinates.
export const demoLocations = [
  { id: 'park-station', match: 'Park Station', label: 'Park Station precinct', latitude: -26.1987, longitude: 28.0414 },
  { id: 'juta-street', match: 'Juta Street', label: 'Juta Street precinct', latitude: -26.1952, longitude: 28.0345 },
  { id: 'de-korte', match: 'De Korte Street', label: 'De Korte Street precinct', latitude: -26.1931, longitude: 28.0352 },
  { id: 'library', match: 'Braamfontein Library', label: 'Braamfontein library precinct', latitude: -26.1920, longitude: 28.0370 },
  { id: 'wits', match: 'Wits University', label: 'Wits entrance precinct', latitude: -26.1910, longitude: 28.0294 },
  { id: 'smit', match: 'Smit Street', label: 'Smit Street precinct', latitude: -26.1972, longitude: 28.0325 },
  { id: 'civic', match: 'Civic Boulevard', label: 'Civic precinct', latitude: -26.1915, longitude: 28.0414 },
  { id: 'constitution-hill', match: 'Constitution Hill', label: 'Constitution Hill precinct', latitude: -26.1889, longitude: 28.0425 },
] as const;
export function resolveDemoLocation(text: string | null | undefined) {
  return demoLocations.find((location) => text?.toLowerCase().includes(location.match.toLowerCase()));
}
