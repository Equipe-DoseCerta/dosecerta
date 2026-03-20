// src/services/noticiasUnificadasService.ts
import firestore from '@react-native-firebase/firestore';
import CacheService from './cacheService';

// Agora temos apenas dois tipos
export interface NoticiaUnificada {
  id: number;
  tipo: 'aviso' | 'dica'; 
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  ativo: boolean;
}

const CACHE_KEY = 'noticias_unificadas_cache';

// Mapeamento APENAS das coleções ativas
const COLECOES = {
  avisos: 'avisos',
  saude: 'saudeDiaria',
};

export const fetchNoticiasUnificadas = async (): Promise<NoticiaUnificada[]> => {
  try {
    console.log('🔥 [noticiasUnificadasService] Buscando Avisos e Dicas...');

    // 1. Buscar APENAS nas 2 coleções em paralelo
    const [snapAvisos, snapSaude] = await Promise.all([
      firestore()
        .collection(COLECOES.avisos)
        .where('ativo', '==', true)
        .orderBy('data_criacao', 'desc')
        .get(),
      
      firestore()
        .collection(COLECOES.saude)
        .where('ativo', '==', true)
        .orderBy('data_criacao', 'desc')
        .get(),
    ]);

    const resultados: NoticiaUnificada[] = [];

    const processarDocs = (snapshot: any, tipo: 'aviso' | 'dica') => {
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        let dataString = '';
        
        if (data.data_criacao) {
          if (typeof data.data_criacao.toDate === 'function') {
            dataString = data.data_criacao.toDate().toISOString().split('T')[0];
          } else if (typeof data.data_criacao === 'string') {
            dataString = data.data_criacao;
          } else {
            dataString = String(data.data_criacao);
          }
        }

        resultados.push({
          id: Number(data.id || doc.id),
          tipo,
          titulo: String(data.titulo || 'Sem título'),
          mensagem: String(data.mensagem || ''),
          data: dataString,
          importante: Boolean(data.importante || false),
          ativo: true,
        });
      });
    };

    // Processar apenas Avisos e Dicas
    processarDocs(snapAvisos, 'aviso');
    processarDocs(snapSaude, 'dica');

    // 2. Ordenar por data
    resultados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // 3. Salvar no cache
    await CacheService.setCache(CACHE_KEY, resultados);
    
    console.log(`✅ Notícias carregadas: ${resultados.length} itens (${snapAvisos.size} avisos, ${snapSaude.size} dicas)`);
    return resultados;

  } catch (error: any) {
    console.error('❌ Erro ao buscar notícias:', error?.message);
    
    const cached = await CacheService.getCache(CACHE_KEY);
    if (cached && Array.isArray(cached)) {
      console.log('📦 Carregando do cache');
      return cached as NoticiaUnificada[];
    }
    
    return [];
  }
};