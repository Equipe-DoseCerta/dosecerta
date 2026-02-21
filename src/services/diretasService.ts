export interface Direta {
  ID: number;
  id: number;
  titulo: string;
  mensagem: string;
  data: string;
  importante: boolean;
  remetente: string;
}

const BASE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec';

// Type for server response
interface DiretaResponse {
  status: number;
  data: Array<{
    id: number | string;
    titulo: string;
    mensagem: string;
    data: string;
    importante?: any;
    remetente?: any;
  }>;
}

export const fetchDiretas = async (): Promise<Direta[]> => {
  try {
    const response = await fetch(`${BASE_SCRIPT_URL}?action=getDiretasAtivas`);
    
    if (!response.ok) {
      throw new Error(`Erro na rede: ${response.status} ${response.statusText}`);
    }
    
    const json: DiretaResponse = await response.json();
    
    if (json.status !== 200) {
      throw new Error(`Erro no servidor: status ${json.status}`);
    }
    
    if (!Array.isArray(json.data)) {
      throw new Error('Formato de dados inválido: "data" não é um array');
    }

    return json.data.map((item) => {
      // Normalize important flag
      const isImportant = Boolean(item.importante);
      
      // Normalize sender information
      const sender = item.remetente 
        ? String(item.remetente).trim() 
        : 'Remetente Desconhecido';
      
      const itemId = Number(item.id);
      
      return {
        ID: itemId, // Add the uppercase ID property
        id: itemId, // Keep the lowercase id property
        titulo: String(item.titulo || 'Sem título'),
        mensagem: String(item.mensagem || ''),
        data: String(item.data || ''),
        importante: isImportant,
        remetente: sender
      };
    });

  } catch (error) {
    let errorMessage = 'Erro ao buscar diretas';
    
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    console.error(errorMessage);
    return [];
  }
};