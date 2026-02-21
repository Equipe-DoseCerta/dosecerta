// services/ajudaService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const GID = '984978518';
const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRIC6xzo4SkJyXIDWffs6hS1X0Uo3S9glMf4DMrBtz8d4QHDVYB5_afHfTS9mdbe7alDcU2wFWZZvXn/pub?gid=${GID}&single=true&output=csv`;

const CACHE_KEY = '@DoseCerta:faq_data';
const CACHE_TIMESTAMP_KEY = '@DoseCerta:faq_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

export interface FAQItem {
  id: number;
  categoria: string;
  ordem_categoria: number;
  pergunta: string;
  resposta: string;
  ativo: string;
  data_criacao: string;
  ultima_atualizacao: string;
}

export interface FAQCategoria {
  categoria: string;
  perguntas: FAQItem[];
}

/**
 * Converte CSV em array de objetos
 */
function parseCSV(csv: string): FAQItem[] {
  const lines = csv.split('\n');
  
  const data: FAQItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parser CSV mais robusto para lidar com vírgulas dentro de aspas
    const values: string[] = [];
    let current = '';
    let insideQuotes = false;
    
    for (let char of line) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    if (values.length >= 8) {
      const item: FAQItem = {
        id: parseInt(values[0], 10) || 0,
        categoria: values[1] || '',
        ordem_categoria: parseInt(values[2], 10) || 0,
        pergunta: values[3] || '',
        resposta: values[4] || '',
        ativo: values[5] || 'TRUE',
        data_criacao: values[6] || '',
        ultima_atualizacao: values[7] || '',
      };
      
      // Apenas adiciona se estiver ativo
      if (item.ativo.toUpperCase() === 'TRUE') {
        data.push(item);
      }
    }
  }
  
  return data;
}

/**
 * Agrupa FAQs por categoria
 */
function groupByCategory(items: FAQItem[]): FAQCategoria[] {
  const grouped = new Map<string, FAQItem[]>();
  
  items.forEach(item => {
    if (!grouped.has(item.categoria)) {
      grouped.set(item.categoria, []);
    }
    grouped.get(item.categoria)?.push(item);
  });
  
  // Converte para array e ordena por ordem_categoria
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

/**
 * Salva dados no cache local
 */
async function saveToCache(data: FAQCategoria[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
}

/**
 * Carrega dados do cache local
 */
async function loadFromCache(): Promise<FAQCategoria[] | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp, 10);
    
    // Se o cache expirou, retorna null
    if (age > CACHE_DURATION) {
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Erro ao carregar cache:', error);
    return null;
  }
}

/**
 * Busca dados do Google Sheets
 */
async function fetchFromSheets(): Promise<FAQCategoria[]> {
  try {
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const csvText = await response.text();
    const items = parseCSV(csvText);
    const grouped = groupByCategory(items);
    
    // Salva no cache
    await saveToCache(grouped);
    
    return grouped;
  } catch (error) {
    console.error('Erro ao buscar dados do Google Sheets:', error);
    throw error;
  }
}

/**
 * Obtém dados do FAQ (cache ou rede)
 */
export async function getFAQData(forceRefresh: boolean = false): Promise<FAQCategoria[]> {
  try {
    // Se não forçar atualização, tenta carregar do cache
    if (!forceRefresh) {
      const cached = await loadFromCache();
      if (cached) {
        console.log('✅ Dados carregados do cache');
        return cached;
      }
    }
    
    // Busca da rede
    console.log('🌐 Buscando dados do Google Sheets...');
    const data = await fetchFromSheets();
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error);
    
    // Em caso de erro, tenta carregar cache (mesmo expirado)
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('⚠️ Usando cache expirado (modo offline)');
      return JSON.parse(cached);
    }
    
    throw error;
  }
}

/**
 * Limpa o cache
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('🗑️ Cache limpo com sucesso');
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
  }
}