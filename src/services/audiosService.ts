export interface Audio {
  id: number;
  titulo: string;
  descricao: string;
  audioUrl: string;
  data: string;
  ativo: boolean;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbxHUMVTIxmBGOGSYYf4YCTDQ5m2wX6Xj0yNheY0rkjKRv1JTiPLjMTMaxCjoCjY9F9O/exec';

export const fetchAudiosAtivos = async (): Promise<Audio[]> => {
  try {
    const response = await fetch(`${API_URL}?action=getAudiosAtivos`);

    if (!response.ok) {
      throw new Error(`Erro na rede: ${response.status}`);
    }

    const json = await response.json();

    if (json.status !== 200) {
      throw new Error(`Erro no servidor: ${json.status}`);
    }

    if (!Array.isArray(json.data)) {
      throw new Error('Formato de dados inválido');
    }

    return json.data.map((item: any) => ({
      id: Number(item.id),
      titulo: item.titulo || 'Sem título',
      descricao: item.descricao || '',
      audioUrl: item.audioUrl || '',
      data: item.data || '',
      ativo: Boolean(item.ativo),
    }));
  } catch (error) {
    console.error('Erro ao buscar áudios:', error);
    return [];
  }
};