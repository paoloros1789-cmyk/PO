import { Injectable } from '@angular/core';

export interface Game {
  id: number;
  title: string;
  short_description?: string;
  description?: string;
  thumbnail?: string;
  platform?: string;
  genre?: string;
  release_date?: string;
  publisher?: string;
  developer?: string;
  game_url?: string;
  url?: string;
  freetogame_profile_url?: string;
  screenshots?: Array<{ id: number; image: string }>;
  video_thumb?: string;
  videos?: Array<{ id: number; video_url: string; thumbnail: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class FreetoGameService {
  // Cambiato a URL assoluto per evitare dipendenza da proxy dev non configurato
  private readonly baseUrl = 'https://www.freetogame.com/api/games';
  // Prefissi proxy — tutti trattati come "prefix" (si aspetta che venga aggiunto l'URL completo)
  private readonly proxies = [
    'direct', // marker: provare direttamente l'API ufficiale
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.allorigins.win/raw?url=',
    'https://cors.bridged.cc/',
    'https://cors-anywhere.herokuapp.com/',
  ];

  constructor() {}

  async fetchGames(
    platform?: string,
    category?: string,
    sortBy?: string
  ): Promise<Game[]> {
    const params = new URLSearchParams();
    if (platform && platform !== 'all') {
      params.set('platform', platform);
    }
    if (category) {
      params.set('category', category);
    }
    if (sortBy) {
      params.set('sort-by', sortBy);
    }

    const qs = params.toString();
    // originalUrl ora è sempre assoluto (evita // e percorsi relativi)
    const originalUrl = qs ? `${this.baseUrl}?${qs}` : this.baseUrl;

    let lastError: any = null;
    for (let i = 0; i < this.proxies.length; i++) {
      const proxy = this.proxies[i];
      try {
        const url = this.buildProxyUrl(proxy, originalUrl, proxy === 'direct');
        const response = await fetch(url, { headers: { Accept: 'application/json' }, mode: 'cors' });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status} for ${url}`);
        }

        const text = await response.text();
        if (!text) {
          throw new Error(`Empty response from ${url}`);
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error(`Invalid JSON from ${url}: ${String(parseErr).slice(0, 200)}`);
        }

        if (Array.isArray(data)) {
          return data as Game[];
        }

        console.warn(`Unexpected data shape from ${url}`, data);
      } catch (err) {
        lastError = err;
        console.warn(`Proxy ${i} (${proxy}) failed:`, err);
        // continua al prossimo proxy
      }
    }

    console.error('All proxy attempts failed.', lastError);
    // Restituiamo array vuoto come fallback coerente con il componente
    return [];
  }

  private buildProxyUrl(proxy: string, originalUrl: string, isDirectUrl: boolean): string {
    if (isDirectUrl) {
      // direct => chiamata all'API ufficiale (assicurarsi che sia assoluto)
      return originalUrl;
    }

    // Per i diversi proxy definiamo il formato corretto:
    try {
      if (proxy.includes('api.allorigins.win')) {
        // allorigins => append encoded full URL
        return `${proxy}${encodeURIComponent(originalUrl)}`;
      }

      if (proxy.endsWith('/fetch/') || proxy.includes('thingproxy.freeboard.io')) {
        // thingproxy: /fetch/{fullUrl}
        return `${proxy}${originalUrl}`;
      }

      if (proxy.includes('cors.bridged.cc') || proxy.includes('cors-anywhere')) {
        // cors.bridged.cc e cors-anywhere normalmente aspettano: {proxy}{fullUrl}
        return `${proxy}${originalUrl}`;
      }

      // fallback: concatena in modo sicuro evitando '//' dopo host
      if (proxy.endsWith('/') && originalUrl.startsWith('/')) {
        return proxy + originalUrl.slice(1);
      }
      return proxy + originalUrl;
    } catch (e) {
      return `${proxy}${originalUrl}`;
    }
  }
}
