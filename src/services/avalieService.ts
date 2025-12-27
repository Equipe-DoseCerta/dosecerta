import { Platform, Linking } from 'react-native';
import CacheService from './cacheService';

export interface AvalieData {
  titulo: string;
  descricao: string;
  linkAndroid: string;
  linkIOS: string;
}

const BASE_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec';
const CACHE_KEY = 'avalie_cache';

export async function fetchAvalieData(): Promise<AvalieData | null> {
  try {
    const response = await fetch(`${BASE_URL}?action=getAvalie`);

    if (!response.ok) {
      throw new Error(`Erro na requisição - Status: ${response.status}`);
    }

    const json: { status?: number; data?: AvalieData[] } = await response.json();

    if (json.status === 200 && json.data && Array.isArray(json.data) && json.data.length > 0) {
      const avalieData: AvalieData = {
        titulo: String(json.data[0].titulo || '').trim(),
        descricao: String(json.data[0].descricao || '').trim(),
        linkAndroid: String(json.data[0].linkAndroid || '').trim(),
        linkIOS: String(json.data[0].linkIOS || '').trim(),
      };

      // Salva no cache ao carregar com sucesso
      await CacheService.setCache(CACHE_KEY, avalieData);
      return avalieData;
    }

    throw new Error('Formato de resposta inválido');
  } catch (error) {
    console.error('Erro ao buscar dados de avaliação:', error);

    // Tenta carregar do cache em caso de erro
    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached) {
      console.log('Carregando dados de avaliação do cache');
      return cached as AvalieData;
    }

    return null;
  }
}

export async function abrirLojaApp(): Promise<void> {
  try {
    const avalieData = await fetchAvalieData();
    
    console.log('📊 Dados recebidos:', avalieData);
    
    if (!avalieData) {
      console.error('❌ Dados de avaliação não encontrados');
      return;
    }

    if (Platform.OS === 'android') {
      // Extrai o ID do pacote do link
      const match = avalieData.linkAndroid.match(/id=([^&]+)/);
      const packageId = match ? match[1] : null;
      
      console.log('📦 Package ID:', packageId);

      if (packageId) {
        // Tenta abrir direto no app da Play Store
        const marketLink = `market://details?id=${packageId}`;
        console.log('🔗 Tentando abrir:', marketLink);
        
        try {
          const canOpenMarket = await Linking.canOpenURL(marketLink);
          if (canOpenMarket) {
            await Linking.openURL(marketLink);
            console.log('✅ Abriu com market://');
            return;
          }
        } catch {
          console.log('⚠️ Falhou com market://, tentando https://');
        }
      }

      // Fallback: tenta com https
      if (avalieData.linkAndroid && avalieData.linkAndroid.trim() !== '') {
        console.log('🔗 Tentando abrir:', avalieData.linkAndroid);
        await Linking.openURL(avalieData.linkAndroid);
        console.log('✅ Abriu com https://');
      }
    } else {
      // iOS
      const link = avalieData.linkIOS;
      if (link && link.trim() !== '') {
        await Linking.openURL(link);
      } else {
        console.error('❌ Link iOS não disponível');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao abrir loja:', error);
  }
}