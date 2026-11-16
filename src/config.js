export const API_BASE_URL = process.env.REACT_APP_API_URL; 
export const API_BASE_URL1 = process.env.REACT_APP_API_URL1;


// apiConfig.js
const API_URLS = [
  process.env.REACT_APP_API_URL,// URL 1
  process.env.REACT_APP_API_URL_1  // URL 2
 
];

/**
 * Realiza una petición intentando primero con la URL primaria.
 * Si falla, reintenta automáticamente con la secundaria.
 */
export async function fetchWithFallback(endpoint, options = {}) {
  for (const baseUrl of API_URLS) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(3000) // Timeout de 9s para no esperar demasiado
      });
      
      if (!response.ok) throw new Error(`Error en ${baseUrl}`);
      return await response.json();
      
    } catch (error) {
      console.warn(`Fallo en ${baseUrl}. Intentando siguiente...`);
      // Si es el último intento, lanzamos el error definitivo
      if (baseUrl === API_URLS[API_URLS.length - 1]) throw error;
    }
  }
}
