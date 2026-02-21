import CacheService from './cacheService';

export interface Video {
  ID: number;
  id: number;
  titulo: string;
  descricao: string;
  videoUrl: string;
  data: string;
  ativo: string;
}

const BASE_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec';
const CACHE_KEY = 'videos_cache';

export async function fetchVideos(): Promise<Video[]> {
  try {
    const response = await fetch(`${BASE_URL}?action=getVideosAtivos`);

    if (!response.ok) {
      throw new Error(`Erro na requisição dos vídeos - Status: ${response.status}`);
    }

    const json: { data?: Video[] } = await response.json();

    if (!json.data || !Array.isArray(json.data)) {
      throw new Error('Resposta não contém um array em json.data');
    }

    const videosAtivos = json.data
      .filter(item => item.ativo?.toLowerCase() === 'sim')
      .map(item => ({
        ID: Number(item.id),
        id: Number(item.id),
        titulo: String(item.titulo),
        descricao: String(item.descricao),
        videoUrl: String(item.videoUrl),
        data: String(item.data),
        ativo: String(item.ativo),
      }))
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Salva no cache ao carregar com sucesso
    await CacheService.setCache(CACHE_KEY, videosAtivos);
    return videosAtivos;
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);

    // Tenta carregar do cache em caso de erro
    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached && Array.isArray(cached)) {
      console.log('Carregando vídeos do cache');
      return cached;
    }

    return [];
  }
}