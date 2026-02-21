// hooks/useFAQ.ts

import { useState, useEffect } from 'react';
import { getFAQData, FAQCategoria } from '../services/ajudaService';

interface UseFAQReturn {
  data: FAQCategoria[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFAQ(): UseFAQReturn {
  const [data, setData] = useState<FAQCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const faqData = await getFAQData(forceRefresh);
      setData(faqData);
      
    } catch (err) {
      console.error('Erro ao carregar FAQ:', err);
      setError('Não foi possível carregar as perguntas. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  // Função para forçar atualização
  const refresh = async () => {
    await loadData(true);
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
}