import { useState, useEffect } from 'react';
import { Platform, Linking, Share, Alert } from 'react-native';

interface CompartilharData {
  linkApp?: string;
  linkRedeSocial?: string;
}

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRIC6xzo4SkJyXIDWffs6hS1X0Uo3S9glMf4DMrBtz8d4QHDVYB5_afHfTS9mdbe7alDcU2wFWZZvXn/pub?gid=182224173&single=true&output=csv';

const useCompartilhar = () => {
  const [data, setData] = useState<CompartilharData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(CSV_URL);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const csvText = await response.text();
      const lines = csvText.trim().split('\n');

      if (lines.length < 2) throw new Error('CSV vazio ou inválido');

      const header = lines[0].split('\t'); // planilha usa TAB
      const values = lines[1].split('\t');

      const linkAppIndex = header.findIndex((h) => h.toLowerCase().includes('enviar_app'));
      const linkRedeSocialIndex = header.findIndex((h) =>
        h.toLowerCase().includes('rede_social')
      );

      const linkApp = values[linkAppIndex]?.trim() || '';
      const linkRedeSocial = values[linkRedeSocialIndex]?.trim() || '';

      setData({ linkApp, linkRedeSocial });
    } catch (err) {
      console.error('Erro ao buscar CSV:', err);
      setError('Não foi possível carregar os dados de compartilhamento.');
    } finally {
      setLoading(false);
    }
  };

  // 📲 Compartilhar com amigo (envio direto)
  const compartilharApp = async (): Promise<void> => {
    if (!data.linkApp) {
      Alert.alert('Erro', 'Link de compartilhamento não disponível.');
      return;
    }

    try {
      const mensagem = `Confira este app: ${data.linkApp}`;
      await Share.share({
        message: mensagem,
        url: Platform.OS === 'ios' ? data.linkApp : undefined,
        title: 'Compartilhar DoseCerta',
      });
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar o app.');
    }
  };

  // 📣 Divulgar nas redes sociais (mensagem pública)
  const divulgarNasRedes = async (): Promise<void> => {
    const link = data.linkApp || 'https://play.google.com/store/apps/details?id=com.dosecerta';
    const mensagem = `Estou usando o app DoseCerta! Ele me ajuda a lembrar dos meus remédios na hora certa. 💊 Baixe também 👉 ${link}`;

    try {
      await Share.share({
        message: mensagem,
        url: Platform.OS === 'ios' ? link : undefined,
        title: 'Divulgar DoseCerta',
      });
    } catch (err) {
      console.error('Erro ao divulgar:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar nas redes sociais.');
    }
  };

  // 🌐 Abrir rede social do app
  const abrirRedeSocial = async (): Promise<void> => {
    if (!data.linkRedeSocial) {
      Alert.alert('Aviso', 'Rede social não configurada.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(data.linkRedeSocial);
      if (supported) {
        await Linking.openURL(data.linkRedeSocial);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link da rede social.');
      }
    } catch (err) {
      console.error('Erro ao abrir rede social:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir a rede social.');
    }
  };

  return {
    data,
    loading,
    error,
    compartilharApp, // Enviar para amigo
    divulgarNasRedes, // Compartilhar publicamente
    abrirRedeSocial, // Ir para perfil do app
    refetch: fetchData,
  };
};

export default useCompartilhar;
