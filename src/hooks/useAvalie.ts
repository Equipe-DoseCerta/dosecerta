import { useState, useEffect } from 'react';
import { Platform, Linking, Alert } from 'react-native';

interface AvalieData {
  titulo: string;
  descricao: string;
  linkAndroid: string;
  linkIOS: string;
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRIC6xzo4SkJyXIDWffs6hS1X0Uo3S9glMf4DMrBtz8d4QHDVYB5_afHfTS9mdbe7alDcU2wFWZZvXn/pub?gid=2115177793&single=true&output=csv';

/**
 * Parser CSV robusto que lida com vírgulas dentro de valores e campos vazios
 */
const parseCSV = (text: string): AvalieData | null => {
  try {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV vazio ou inválido');
      return null;
    }

    // Parse da primeira linha (headers)
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    // Parse da segunda linha (valores)
    const valueLine = lines[1];
    const values = parseCSVLine(valueLine);

    if (headers.length === 0 || values.length === 0) {
      console.warn('Headers ou valores vazios');
      return null;
    }

    // Cria objeto com os dados
    const data: Partial<AvalieData> = {};
    headers.forEach((header, index) => {
      if (header in { titulo: '', descricao: '', linkAndroid: '', linkIOS: '', prioridade: '' }) {
        (data as any)[header] = values[index] || '';
      }
    });

    console.log('Dados parseados:', data);

    // Valida se tem os campos obrigatórios
    if (!data.linkAndroid && !data.linkIOS) {
      console.warn('Links das lojas não encontrados');
      return null;
    }

    return data as AvalieData;
  } catch (error) {
    console.error('Erro ao parsear CSV:', error);
    return null;
  }
};

/**
 * Parse de uma linha CSV considerando aspas e vírgulas
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      // Aspas duplas ("") dentro de campo citado = aspas literal
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Pula a próxima aspa
      } else {
        // Toggle do estado de aspas
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Vírgula fora de aspas = separador de campo
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Adiciona o último campo
  result.push(current.trim());

  return result;
};

const useAvalie = () => {
  const [avalieData, setAvalieData] = useState<AvalieData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvalieData();
  }, []);

  const fetchAvalieData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Buscando dados do CSV...');
      const response = await fetch(CSV_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log('CSV recebido, tamanho:', csvText.length);

      const data = parseCSV(csvText);
      
      if (data) {
        console.log('Dados carregados com sucesso:', {
          titulo: data.titulo,
          linkAndroid: data.linkAndroid,
          linkIOS: data.linkIOS,
        });
        setAvalieData(data);
      } else {
        setError('Erro ao processar dados');
        console.error('Falha ao parsear CSV');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const abrirLoja = async () => {
    console.log('Tentando abrir loja...');
    console.log('Plataforma:', Platform.OS);
    console.log('Dados disponíveis:', !!avalieData);

    if (!avalieData) {
      console.warn('Dados de avaliação não disponíveis');
      Alert.alert('Erro', 'Dados de avaliação não disponíveis');
      return;
    }

    const storeUrl = Platform.OS === 'android' 
      ? avalieData.linkAndroid 
      : avalieData.linkIOS;

    console.log('URL da loja:', storeUrl);

    if (!storeUrl || storeUrl.trim() === '') {
      console.warn('Link da loja vazio');
      Alert.alert('Erro', 'Link da loja não disponível');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(storeUrl);
      console.log('URL suportada:', supported);
      
      if (supported) {
        console.log('Abrindo URL:', storeUrl);
        await Linking.openURL(storeUrl);
      } else {
        console.warn('URL não suportada:', storeUrl);
        Alert.alert(
          'Erro',
          'Não foi possível abrir a loja de aplicativos'
        );
      }
    } catch (err) {
      console.error('Erro ao abrir loja:', err);
      Alert.alert(
        'Erro',
        'Ocorreu um erro ao tentar abrir a loja'
      );
    }
  };

  return {
    avalieData,
    loading,
    error,
    abrirLoja,
    refetch: fetchAvalieData,
  };
};

export default useAvalie;