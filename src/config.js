export const API_BASE_URL = process.env.REACT_APP_API_URL || ''; 
export const API_BASE_URL1 = process.env.REACT_APP_API_URL_1 || '';

// apiConfig.js
const API_URLS = [
  process.env.REACT_APP_API_URL || '' // Usa ruta relativa al mismo servidor
];

/**
 * Realiza una petición a la API en el mismo servidor (o usando variable de entorno si existe).
 */
export async function fetchWithFallback(endpoint, options = {}) {
  for (const baseUrl of API_URLS) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30s para dar tiempo a que Azure SQL despierte si estaba pausada
      });
      
      if (!response.ok) throw new Error(`Error en ${baseUrl || 'servidor'}`);
      return await response.json();
      
    } catch (error) {
      console.warn(`Fallo en ${baseUrl || 'servidor'}. Intentando siguiente...`);
      if (baseUrl === API_URLS[API_URLS.length - 1]) throw error;
    }
  }
}
