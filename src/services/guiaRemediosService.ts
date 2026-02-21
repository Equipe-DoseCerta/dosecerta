// src/services/guiaRemediosService.ts - VERSÃO OTIMIZADA
/**
 * Serviço para buscar dados complementares da API Google Apps Script
 * Fornece: Indicação, Modo de Uso, Contraindicação e Foto
 */

const BASE_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec?action=getGuiaAtivos';

/**
 * Interface do Remédio (dados da API)
 */
export interface Remedio {
  id: number;
  nome: string;
  principioAtivo: string;
  indicacao: string;
  modoUso: string;
  contraindicacao: string;
  fotoURL: string;
  ativo: boolean;
}

/**
 * Interface da resposta da API
 */
interface GuiaRemediosResponse {
  status: number;
  data: Array<{
    ID: number | string;
    Nome: string;
    'Princípio Ativo': string;
    'Indicação': string;
    'Modo de uso': string;
    'Contraindicação': string;
    FotoURL: string;
    Ativo: string | boolean;
  }>;
}

/**
 * Busca lista completa de remédios da API
 * @returns Promise com array de remédios
 */
export async function fetchGuiaRemedios(): Promise<Remedio[]> {
  try {
    console.log('[GUIA_API] 🔄 Buscando dados da API...');
    
    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: GuiaRemediosResponse = await response.json();

    if (json.status !== 200) {
      throw new Error(`API retornou status ${json.status}`);
    }

    if (!Array.isArray(json.data)) {
      throw new Error('Formato inválido: "data" não é um array');
    }

    const remedios = json.data.map(item => {
      // Destructuring com aliases para evitar dot-notation warnings
      const {
        ID,
        Nome,
        'Princípio Ativo': principioAtivo,
        'Indicação': indicacao,
        'Modo de uso': modoUso,
        'Contraindicação': contraindicacao,
        FotoURL,
        Ativo,
      } = item;

      // Normaliza campo "Ativo"
      const isActive = typeof Ativo === 'string' 
        ? Ativo.toLowerCase() === 'sim'
        : Boolean(Ativo);

      return {
        id: Number(ID),
        nome: Nome || 'Nome não disponível',
        principioAtivo: principioAtivo || 'Não informado',
        indicacao: indicacao || 'Não informado',
        modoUso: modoUso || 'Não informado',
        contraindicacao: contraindicacao || 'Nenhuma contraindicação conhecida',
        fotoURL: FotoURL || '',
        ativo: isActive,
      };
    });

    console.log(`[GUIA_API] ✅ ${remedios.length} remédios carregados`);
    return remedios;

  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro desconhecido';
    
    console.error(`[GUIA_API] ❌ Erro ao buscar dados: ${errorMessage}`);
    return [];
  }
}

/**
 * Filtra apenas remédios ativos
 * @param remedios - Array de remédios
 * @returns Array filtrado
 */
export const getRemediosAtivos = (remedios: Remedio[]): Remedio[] => {
  return remedios.filter(remedio => remedio.ativo);
};

/**
 * Busca remédio por ID
 * @param id - ID do remédio
 * @param remedios - Array de remédios
 * @returns Remédio encontrado ou undefined
 */
export const getRemedioById = (id: number, remedios: Remedio[]): Remedio | undefined => {
  return remedios.find(remedio => remedio.id === id);
};

/**
 * Busca remédios por nome ou princípio ativo (case-insensitive)
 * @param term - Termo de busca
 * @param remedios - Array de remédios
 * @returns Array de remédios filtrados
 */
export const searchRemedios = (term: string, remedios: Remedio[]): Remedio[] => {
  const searchTerm = term.toLowerCase().trim();
  
  if (!searchTerm) {
    return remedios;
  }
  
  return remedios.filter(remedio => 
    remedio.nome.toLowerCase().includes(searchTerm) ||
    remedio.principioAtivo.toLowerCase().includes(searchTerm) ||
    remedio.indicacao.toLowerCase().includes(searchTerm)
  );
};

/**
 * Busca remédio por nome exato (útil para integração com SQLite)
 * @param nome - Nome exato do medicamento
 * @param remedios - Array de remédios
 * @returns Remédio encontrado ou undefined
 */
export const getRemedioByNome = (nome: string, remedios: Remedio[]): Remedio | undefined => {
  const normalizedNome = nome.trim().toLowerCase();
  return remedios.find(
    remedio => remedio.nome.trim().toLowerCase() === normalizedNome
  );
};

/**
 * Agrupa remédios por categoria (baseado na indicação)
 * @param remedios - Array de remédios
 * @returns Objeto com remédios agrupados
 */
export const groupByIndicacao = (remedios: Remedio[]): Record<string, Remedio[]> => {
  return remedios.reduce((acc, remedio) => {
    const categoria = remedio.indicacao || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(remedio);
    return acc;
  }, {} as Record<string, Remedio[]>);
};

/**
 * Retorna estatísticas dos remédios
 */
export const getRemediosStats = (remedios: Remedio[]): {
  total: number;
  ativos: number;
  inativos: number;
  comFoto: number;
  semFoto: number;
} => {
  return {
    total: remedios.length,
    ativos: remedios.filter(r => r.ativo).length,
    inativos: remedios.filter(r => !r.ativo).length,
    comFoto: remedios.filter(r => r.fotoURL).length,
    semFoto: remedios.filter(r => !r.fotoURL).length,
  };
};