// src/services/avalieService.ts
import firestore from '@react-native-firebase/firestore';  // ✅ SDK nativa
import { Platform, Linking } from 'react-native';
import CacheService from './cacheService';

export interface AvalieData {
  titulo: string;
  descricao: string;
  linkAndroid: string;
  linkIOS: string;
}

const CACHE_KEY = 'avalie_cache';

export const fetchAvalieData = async (): Promise<AvalieData | null> => {
  try {
    // ✅ Sem where('ativo') nem orderBy — coleção tem só 1 documento
    const snapshot = await firestore()
      .collection('avalie')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('⚠️ Nenhum registro de avalie encontrado');
      return null;
    }

    const data = snapshot.docs[0].data();

    const avalieData: AvalieData = {
      titulo: String(data.titulo || 'Avalie o App').trim(),
      descricao: String(data.descricao || 'Sua avaliação é muito importante para nós!').trim(),
      linkAndroid: String(data.link || '').trim(),  // ✅ campo 'link' no Firestore
      linkIOS: String(data.link || '').trim(),
    };

    await CacheService.setCache(CACHE_KEY, avalieData);
    console.log('✅ Dados de avalie carregados');
    return avalieData;

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados de avalie:', error?.message);

    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached) {
      console.log('📦 Carregando dados de avalie do cache');
      return cached as AvalieData;
    }

    return null;
  }
};

export const abrirLojaApp = async (): Promise<void> => {
  try {
    const avalieData = await fetchAvalieData();

    if (!avalieData) {
      console.error('❌ Dados de avaliação não encontrados');
      return;
    }

    if (Platform.OS === 'android') {
      const match = avalieData.linkAndroid.match(/id=([^&]+)/);
      const packageId = match ? match[1] : null;

      if (packageId) {
        const marketLink = `market://details?id=${packageId}`;
        try {
          const canOpenMarket = await Linking.canOpenURL(marketLink);
          if (canOpenMarket) {
            await Linking.openURL(marketLink);
            return;
          }
        } catch {
          console.log('⚠️ Falhou com market://, tentando https://');
        }
      }

      if (avalieData.linkAndroid) {
        await Linking.openURL(avalieData.linkAndroid);
      }
    } else {
      if (avalieData.linkIOS) {
        await Linking.openURL(avalieData.linkIOS);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao abrir loja:', error);
  }
};