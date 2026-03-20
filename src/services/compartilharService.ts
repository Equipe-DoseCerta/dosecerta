// src/services/compartilharService.ts
import firestore from '@react-native-firebase/firestore';
import { Platform, Linking, Share, Alert } from 'react-native';
import CacheService from './cacheService';

export interface CompartilharData {
  enviar_app: string;
  rede_social: string;
}

const CACHE_KEY = 'compartilhar_cache';

export async function fetchCompartilharData(): Promise<CompartilharData | null> {
  try {
    const snapshot = await firestore()
      .collection('compartilhar')
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('⚠️ Nenhum registro de compartilhar encontrado');
      return null;
    }

    const data = snapshot.docs[0].data();

    const compartilharData: CompartilharData = {
      enviar_app: String(data.enviar_app || '').trim(),
      rede_social: String(data.rede_social || '').trim(),
    };

    await CacheService.setCache(CACHE_KEY, compartilharData);
    console.log('✅ Dados de compartilhamento carregados');
    return compartilharData;

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados de compartilhamento:', error?.message);

    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached) {
      console.log('📦 Carregando dados de compartilhamento do cache');
      return cached as CompartilharData;
    }

    return null;
  }
}

/**
 * 📲 Recomendar para um amigo específico
 * Mensagem direta e objetiva, ideal para enviar via WhatsApp, e-mail, SMS
 */
export async function compartilharApp(): Promise<void> {
  console.log('📤 Iniciando compartilhamento do app...');

  try {
    const data = await fetchCompartilharData();

    if (!data?.enviar_app) {
      console.warn('⚠️ Link de compartilhamento não disponível');
      Alert.alert('Erro', 'Link de compartilhamento não disponível.');
      return;
    }

    const mensagem = `Oi! 👋 Descobri um app muito útil chamado DoseCerta que ajuda a lembrar dos horários dos medicamentos. Dá uma olhada: ${data.enviar_app}`;

    console.log('📨 Compartilhando:', mensagem.substring(0, 50) + '...');

    await Share.share({
      message: mensagem,
      url: Platform.OS === 'ios' ? data.enviar_app : undefined,
      title: 'Recomendo o DoseCerta',
    });

    console.log('✅ Compartilhamento realizado');
  } catch (error) {
    console.error('❌ Erro ao compartilhar app:', error);
    Alert.alert('Erro', 'Não foi possível compartilhar o app.');
  }
}

/**
 * 📢 Publicar nas redes sociais
 * Abre link configurado. Fallback: compartilha mensagem promocional elaborada
 */
export async function divulgarNasRedes(): Promise<void> {
  console.log('🌐 Abrindo link de redes sociais...');

  try {
    const data = await fetchCompartilharData();

    if (!data?.rede_social) {
      console.warn('⚠️ Link de redes sociais não disponível');

      // ✅ Fallback: usa link do app com mensagem promocional
      if (data?.enviar_app) {
        const mensagem = `💊 Estou usando o DoseCerta e tem sido incrível!

O app me ajuda a nunca esquecer dos meus medicamentos, com lembretes na hora certa e controle completo do tratamento.

Se você ou alguém da família precisa organizar remédios, recomendo muito! 👇

${data.enviar_app}

#DoseCerta #Saúde #Medicamentos #Organização`;

        await Share.share({
          message: mensagem,
          url: Platform.OS === 'ios' ? data.enviar_app : undefined,
          title: 'Publicar sobre o DoseCerta',
        });
        console.log('✅ Compartilhamento nas redes realizado via fallback');
        return;
      }

      Alert.alert('Aviso', 'Link de rede social não configurado.');
      return;
    }

    // ✅ Garante que o link tem https://
    let link = data.rede_social.trim();
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      link = `https://${link}`;
      console.log('🔧 Protocolo adicionado automaticamente:', link);
    }

    console.log('🔗 Tentando abrir:', link);

    const supported = await Linking.canOpenURL(link);
    console.log('✅ Link suportado?', supported);

    if (supported) {
      await Linking.openURL(link);
      console.log('✅ Link aberto com sucesso');
    } else {
      console.warn('⚠️ Link não suportado, tentando fallback com Share...');

      // ✅ Fallback: se não conseguir abrir, usa Share
      if (data.enviar_app) {
        const mensagem = `💊 Estou usando o DoseCerta e tem sido incrível!

O app me ajuda a nunca esquecer dos meus medicamentos, com lembretes na hora certa e controle completo do tratamento.

Se você ou alguém da família precisa organizar remédios, recomendo muito! 👇

${data.enviar_app}

#DoseCerta #Saúde #Medicamentos #Organização`;

        await Share.share({
          message: mensagem,
          url: Platform.OS === 'ios' ? data.enviar_app : undefined,
          title: 'Publicar sobre o DoseCerta',
        });
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link da rede social.');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao abrir redes sociais:', error);
    Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir a rede social.');
  }
}