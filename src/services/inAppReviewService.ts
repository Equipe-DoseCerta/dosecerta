// src/services/inAppReviewService.ts
// Serviço responsável por solicitar avaliação do app no momento certo

import AsyncStorage from '@react-native-async-storage/async-storage';
import InAppReview from 'react-native-in-app-review';

const KEYS = {
  TOTAL_CADASTROS: '@dosecerta:total_cadastros',
  REVIEW_SOLICITADO: '@dosecerta:review_solicitado',
  DATA_PRIMEIRO_USO: '@dosecerta:data_primeiro_uso',
};

/**
 * Registra um novo cadastro e verifica se deve solicitar avaliação.
 * Gatilhos:
 * - 3º medicamento cadastrado
 * - 7 dias de uso
 */
export async function registrarCadastroEVerificarReview(): Promise<void> {
  try {
    // Se já solicitou review antes, não solicita novamente
    const reviewSolicitado = await AsyncStorage.getItem(KEYS.REVIEW_SOLICITADO);
    if (reviewSolicitado === 'true') return;

    // Registra data do primeiro uso
    const dataPrimeiroUso = await AsyncStorage.getItem(KEYS.DATA_PRIMEIRO_USO);
    if (!dataPrimeiroUso) {
      await AsyncStorage.setItem(KEYS.DATA_PRIMEIRO_USO, new Date().toISOString());
    }

    // Incrementa total de cadastros
    const totalStr = await AsyncStorage.getItem(KEYS.TOTAL_CADASTROS);
    const total = totalStr ? parseInt(totalStr, 10) + 1 : 1;
    await AsyncStorage.setItem(KEYS.TOTAL_CADASTROS, total.toString());

    console.log(`[REVIEW] Total de cadastros: ${total}`);

    // Gatilho 1: 2º medicamento cadastrado
    if (total === 2) {
      console.log('[REVIEW] Gatilho ativado: 3º medicamento cadastrado');
      await solicitarReview();
      return;
    }

    // Gatilho 2: 7 dias de uso
    if (dataPrimeiroUso) {
      const inicio = new Date(dataPrimeiroUso).getTime();
      const agora = Date.now();
      const diasDeUso = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));

      if (diasDeUso >= 7) {
        console.log(`[REVIEW] Gatilho ativado: ${diasDeUso} dias de uso`);
        await solicitarReview();
      }
    }

  } catch (error) {
    console.warn('[REVIEW] Erro ao verificar gatilhos:', error);
  }
}

/**
 * Abre o popup de avaliação do Google Play
 */
async function solicitarReview(): Promise<void> {
  try {
    const isAvailable = InAppReview.isAvailable();
    if (!isAvailable) {
      console.log('[REVIEW] In-App Review não disponível neste dispositivo');
      return;
    }

    await InAppReview.RequestInAppReview();
    await AsyncStorage.setItem(KEYS.REVIEW_SOLICITADO, 'true');
    console.log('[REVIEW] ✅ Review solicitado com sucesso');

  } catch (error) {
    console.warn('[REVIEW] Erro ao solicitar review:', error);
  }
}