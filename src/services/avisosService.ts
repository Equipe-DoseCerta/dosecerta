export interface Aviso {
  ID: number;
  id: number;
  titulo: string;
  mensagem: string;
  data: string;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec?action=getAvisosAtivos';

export async function fetchAvisos(): Promise<Aviso[]> {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const resultado = await response.json();

    if (resultado.status === 200 && Array.isArray(resultado.data)) {
      return resultado.data.map((item: any) => ({
        id: Number(item.id),
        titulo: String(item.titulo),
        mensagem: String(item.mensagem),
        data: String(item.data),
      }));
    }

    throw new Error('Formato de resposta inválido');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao buscar avisos:', message);
    return [];
  }
}