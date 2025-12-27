import { Linking, Share } from 'react-native';
import CacheService from './cacheService';

export interface CompartilharData {
  enviar_app: string;
  rede_social: string;
}

const BASE_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec';
const CACHE_KEY = 'compartilhar_cache';

export async function fetchCompartilharData(): Promise<CompartilharData | null> {
  try {
    const response = await fetch(`${BASE_URL}?action=getCompartilhar`);

    if (!response.ok) {
      throw new Error(`Erro na requisição - Status: ${response.status}`);
    }

    const json: { status?: number; data?: CompartilharData[] } = await response.json();

    if (json.status === 200 && json.data && Array.isArray(json.data) && json.data.length > 0) {
      const compartilharData: CompartilharData = {
        enviar_app: String(json.data[0].enviar_app || '').trim(),
        rede_social: String(json.data[0].rede_social || '').trim(),
      };

      // Salva no cache ao carregar com sucesso
      await CacheService.setCache(CACHE_KEY, compartilharData);
      return compartilharData;
    }

    throw new Error('Formato de resposta inválido');
  } catch (error) {
    console.error('Erro ao buscar dados de compartilhamento:', error);

    // Tenta carregar do cache em caso de erro
    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached) {
      console.log('Carregando dados de compartilhamento do cache');
      return cached as CompartilharData;
    }

    return null;
  }
}

/**
 * Compartilha o app via Share nativo do sistema
 */
export async function compartilharApp(): Promise<void> {
  try {
    const data = await fetchCompartilharData();
    
    console.log('📊 Dados de compartilhamento:', data);
    
    if (!data || !data.enviar_app) {
      console.error('❌ Link de compartilhamento não encontrado');
      return;
    }

    const mensagem = `Conheça o DoseCerta! 💊\n\nGerencia seus medicamentos de forma inteligente com lembretes, controle de estoque e muito mais.\n\nBaixe agora: ${data.enviar_app}`;

    await Share.share({
      message: mensagem,
      url: data.enviar_app, // iOS usa url
      title: 'DoseCerta - Gerenciamento de Medicamentos',
    });

    console.log('✅ Compartilhamento realizado');
  } catch (error) {
    console.error('❌ Erro ao compartilhar app:', error);
  }
}

/**
 * Abre o link para divulgar nas redes sociais
 */
export async function divulgarNasRedes(): Promise<void> {
  try {
    const data = await fetchCompartilharData();
    
    console.log('📊 Dados de redes sociais:', data);
    
    if (!data || !data.rede_social) {
      console.error('❌ Link de redes sociais não encontrado');
      return;
    }

    const canOpen = await Linking.canOpenURL(data.rede_social);
    
    console.log('🔗 Link:', data.rede_social);
    console.log('✅ Pode abrir?', canOpen);

    if (canOpen) {
      await Linking.openURL(data.rede_social);
      console.log('✅ Link aberto com sucesso');
    } else {
      console.error('❌ Não foi possível abrir o link');
    }
  } catch (error) {
    console.error('❌ Erro ao abrir redes sociais:', error);
  }
}