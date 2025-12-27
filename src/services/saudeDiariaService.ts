import CacheService from './cacheService';

export interface SaudeDiaria {
  ID: number;
  id: number;
  titulo: string;
  mensagem: string;
  data: string;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec?action=getSaudeDiaria';
const CACHE_KEY = 'saude_diaria_cache';

export async function fetchSaudeDiaria(): Promise<SaudeDiaria[]> {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const resultado = await response.json();

    if (resultado.status === 200 && Array.isArray(resultado.data)) {
      const saudeDiaria = resultado.data.map((item: any) => ({
        ID: Number(item.id),
        id: Number(item.id),
        titulo: String(item.titulo),
        mensagem: String(item.mensagem),
        data: String(item.data),
      }));

      // Salva no cache ao carregar com sucesso
      await CacheService.setCache(CACHE_KEY, saudeDiaria);
      return saudeDiaria;
    }

    throw new Error('Formato de resposta inválido');
  } catch (error) {
    console.error('Erro ao buscar saúde diária:', error);

    // Tenta carregar do cache em caso de erro
    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached && Array.isArray(cached)) {
      console.log('Carregando saúde diária do cache');
      return cached;
    }

    return [];
  }
}