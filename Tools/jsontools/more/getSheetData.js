// Fetches data from a Google Sheet published as JSON and returns the parsed JSON object.

export async function getSheetData(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (typeof data !== 'object' || data === null) {
    throw new Error('Response is not a valid JSON object');
  }
  return data;
}
