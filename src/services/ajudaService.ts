// src/services/ajudaService.ts
import firestore from '@react-native-firebase/firestore';
import CacheService from './cacheService';

export interface FAQItem {
  id: number;
  categoria: string;
  ordem_categoria: number;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  data_criacao: string;
  ultima_atualizacao: string;
}

export interface FAQCategoria {
  categoria: string;
  perguntas: FAQItem[];
}

function groupByCategory(items: FAQItem[]): FAQCategoria[] {
  const grouped = new Map<string, FAQItem[]>();

  items.forEach(item => {
    if (!grouped.has(item.categoria)) {
      grouped.set(item.categoria, []);
    }
    grouped.get(item.categoria)?.push(item);
  });

  const result: FAQCategoria[] = [];
  grouped.forEach((perguntas, categoria) => {
    result.push({ categoria, perguntas });
  });

  result.sort((a, b) => {
    const ordemA = a.perguntas[0]?.ordem_categoria || 0;
    const ordemB = b.perguntas[0]?.ordem_categoria || 0;
    return ordemA - ordemB;
  });

  return result;
}

export async function getFAQData(forceRefresh: boolean = false): Promise<FAQCategoria[]> {
  try {
    if (!forceRefresh) {
      const cached = await CacheService.getCache('faq_cache');
      if (cached && Array.isArray(cached)) {
        console.log('✅ FAQ carregado do cache');
        return cached as FAQCategoria[];
      }
    }

    console.log('🔥 [ajudaService] Buscando FAQ do Firebase...');

    const snapshot = await firestore()
      .collection('faq')
      .where('ativo', '==', true)
      .orderBy('ordem_categoria', 'asc')
      .get();

    console.log(`📄 Documentos encontrados: ${snapshot.size}`);

    const items: FAQItem[] = snapshot.docs.map(doc => {
      const data = doc.data();

      // Suporta Timestamp e string
      const parseData = (field: any): string => {
        if (!field) return '';
        if (typeof field.toDate === 'function') return field.toDate().toISOString().split('T')[0];
        return String(field);
      };

      return {
        id: Number(data.id),
        categoria: String(data.categoria || ''),
        ordem_categoria: Number(data.ordem_categoria || 0),
        pergunta: String(data.pergunta || ''),
        resposta: String(data.resposta || ''),
        ativo: Boolean(data.ativo),
        data_criacao: parseData(data.data_criacao),
        ultima_atualizacao: parseData(data.ultima_atualizacao),
      };
    });

    const grouped = groupByCategory(items);
    await CacheService.setCache('faq_cache', grouped);

    console.log(`✅ FAQ carregado: ${items.length} perguntas em ${grouped.length} categorias`);
    return grouped;

  } catch (error: any) {
    console.error('❌ Erro ao buscar FAQ:', error?.message);
    console.error('❌ Código:', error?.code);

    const cached = await CacheService.getCache('faq_cache');
    if (cached && Array.isArray(cached)) {
      console.log('⚠️ Usando FAQ do cache (modo offline)');
      return cached as FAQCategoria[];
    }

    return [];
  }
}

export async function clearCache(): Promise<void> {
  await CacheService.setCache('faq_cache', null);
  console.log('🗑️ Cache do FAQ limpo');
}