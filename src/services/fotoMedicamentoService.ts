// src/services/fotoMedicamentoService.ts
// Serviço responsável por capturar, validar e salvar fotos de medicamentos

import { Alert, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  Asset,
} from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import ImageLabeling from '@react-native-ml-kit/image-labeling';
import RNFS from 'react-native-fs';

// ─── Configurações ───────────────────────────────────────────────────────────

const MAX_WIDTH        = 800;
const MAX_HEIGHT       = 800;
const QUALITY          = 70;   // 0-100
const MAX_SIZE_KB      = 200;  // 200KB máximo
const FOTO_DIR         = `${RNFS.DocumentDirectoryPath}/fotos_medicamentos`;
const CONFIDENCE_MIN   = 0.55; // 55% de confiança mínima

// Labels que indicam embalagem de medicamento
const LABELS_VALIDOS = [
  'medicine', 'drug', 'medication', 'pill', 'tablet', 'capsule',
  'bottle', 'box', 'package', 'packaging', 'container', 'tube',
  'blister', 'pharmacy', 'pharmaceutical', 'health', 'medical',
  'product', 'label', 'text', 'brand', 'carton', 'tin',
  'rectangle', 'paper', 'cardboard', 'plastic',
];

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ResultadoFoto {
  sucesso: boolean;
  caminho?: string;
  erro?: string;
  labelDetectado?: string;
}

// ─── Funções auxiliares ──────────────────────────────────────────────────────

/**
 * Garante que o diretório de fotos existe
 */
const garantirDiretorio = async (): Promise<void> => {
  const existe = await RNFS.exists(FOTO_DIR);
  if (!existe) {
    await RNFS.mkdir(FOTO_DIR);
    console.log('[FOTO] 📁 Diretório criado:', FOTO_DIR);
  }
};

/**
 * Verifica se a imagem contém uma embalagem de medicamento via ML Kit
 */
const validarImagemComMLKit = async (imagePath: string): Promise<{
  valida: boolean;
  labelDetectado: string;
}> => {
  try {
    console.log('[FOTO] 🔍 Analisando imagem com ML Kit...');

    const labels = await ImageLabeling.label(imagePath);

    console.log('[FOTO] 📋 Labels detectados:',
      labels.map((l: any) => `${l.text} (${Math.round(l.confidence * 100)}%)`).join(', ')
    );

    // Verifica se algum label corresponde a embalagem
    for (const label of labels) {
      const textoLower = label.text.toLowerCase();
      const isValido = LABELS_VALIDOS.some(l => textoLower.includes(l));

      if (isValido && label.confidence >= CONFIDENCE_MIN) {
        console.log(`[FOTO] ✅ Embalagem detectada: "${label.text}" (${Math.round(label.confidence * 100)}%)`);
        return { valida: true, labelDetectado: label.text };
      }
    }

    // Se não detectou embalagem mas detectou algo com alta confiança
    // permite passar para não frustrar o usuário
    const melhorLabel = labels[0];
    if (melhorLabel && melhorLabel.confidence >= 0.85) {
      console.log(`[FOTO] ⚠️ Nenhuma embalagem detectada, mas objeto identificado com alta confiança: "${melhorLabel.text}"`);
      return { valida: true, labelDetectado: melhorLabel.text };
    }

    console.log('[FOTO] ❌ Nenhuma embalagem identificada');
    return { valida: false, labelDetectado: '' };

  } catch (error) {
    // Se ML Kit falhar, permite a foto passar (não bloqueia o usuário)
    console.warn('[FOTO] ⚠️ ML Kit falhou, permitindo foto:', error);
    return { valida: true, labelDetectado: 'desconhecido' };
  }
};

/**
 * Comprime e salva a imagem localmente
 */
const comprimirESalvar = async (uri: string): Promise<string> => {
  await garantirDiretorio();

  console.log('[FOTO] 🗜️ Comprimindo imagem...');

  // Comprime a imagem
  const resized = await ImageResizer.createResizedImage(
    uri,
    MAX_WIDTH,
    MAX_HEIGHT,
    'JPEG',
    QUALITY,
    0,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true }
  );

  // Gera nome único para o arquivo
  const timestamp = Date.now();
  const destino   = `${FOTO_DIR}/med_${timestamp}.jpg`;

  // Copia para o diretório do app
  await RNFS.copyFile(resized.uri, destino);

  // Verifica tamanho final
  const stat = await RNFS.stat(destino);
  const tamanhoKB = Math.round(stat.size / 1024);
  console.log(`[FOTO] ✅ Foto salva: ${destino} (${tamanhoKB}KB)`);

  return destino;
};

/**
 * Processa a resposta do image picker
 */
const processarResposta = async (response: ImagePickerResponse): Promise<ResultadoFoto> => {
  if (response.didCancel) {
    return { sucesso: false, erro: 'cancelado' };
  }

  if (response.errorCode) {
    console.error('[FOTO] ❌ Erro do picker:', response.errorMessage);
    return { sucesso: false, erro: response.errorMessage || 'Erro ao acessar câmera/galeria' };
  }

  const asset: Asset | undefined = response.assets?.[0];
  if (!asset?.uri) {
    return { sucesso: false, erro: 'Nenhuma imagem selecionada' };
  }

  // Valida com ML Kit
  const { valida, labelDetectado } = await validarImagemComMLKit(asset.uri);

  if (!valida) {
    return {
      sucesso: false,
      erro: 'Não foi possível identificar uma embalagem de medicamento.\n\nAproxime a câmera da caixa, cartela ou frasco.',
    };
  }

  // Comprime e salva
  const caminho = await comprimirESalvar(asset.uri);

  return { sucesso: true, caminho, labelDetectado };
};

// ─── Funções públicas ────────────────────────────────────────────────────────

/**
 * Abre a câmera para fotografar o medicamento
 */
export const tirarFotoMedicamento = (): Promise<ResultadoFoto> => {
  return new Promise((resolve) => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 1,
        saveToPhotos: false,
        cameraType: 'back',
      },
      async (response) => {
        const resultado = await processarResposta(response);
        resolve(resultado);
      }
    );
  });
};

/**
 * Abre a galeria para selecionar foto do medicamento
 */
export const escolherFotoDaGaleria = (): Promise<ResultadoFoto> => {
  return new Promise((resolve) => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 1 },
      async (response) => {
        const resultado = await processarResposta(response);
        resolve(resultado);
      }
    );
  });
};

/**
 * Deleta a foto de um medicamento do armazenamento local
 */
export const deletarFotoMedicamento = async (caminho: string): Promise<void> => {
  try {
    const existe = await RNFS.exists(caminho);
    if (existe) {
      await RNFS.unlink(caminho);
      console.log('[FOTO] 🗑️ Foto deletada:', caminho);
    }
  } catch (error) {
    console.warn('[FOTO] ⚠️ Erro ao deletar foto:', error);
  }
};

/**
 * Exibe o seletor de origem (câmera ou galeria)
 */
export const selecionarFotoMedicamento = (
  onResultado: (resultado: ResultadoFoto) => void
): void => {
  Alert.alert(
    '📷 Foto do Medicamento',
    'Como deseja adicionar a foto?',
    [
      {
        text: '📷 Câmera',
        onPress: async () => {
          const resultado = await tirarFotoMedicamento();
          onResultado(resultado);
        },
      },
      {
        text: '🖼️ Galeria',
        onPress: async () => {
          const resultado = await escolherFotoDaGaleria();
          onResultado(resultado);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]
  );
};
