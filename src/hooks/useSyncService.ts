// src/hooks/useSyncService.ts
// Hook para gerenciar sincronização automática com Google Sheets

import { useEffect, useRef, useState, useCallback } from 'react';
import SyncService from '../services/syncService';
import BadgeService from '../services/badgeService';

interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
}

/**
 * Hook para gerenciar sincronização automática
 * @param autoSyncInterval - Intervalo em milissegundos (padrão: 30 minutos)
 * @returns Estado da sincronização e funções de controle
 */
export const useSyncService = (autoSyncInterval: number = 30 * 60 * 1000) => {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Executa sincronização
   */
  const sync = useCallback(async () => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

      // Executar sincronização
      // Nota: A verificação de conexão é feita internamente pelo fetch
      await SyncService.syncContent();
      
      // Obter timestamp da última sincronização
      const lastSync = await BadgeService.getLastSyncTimestamp();
      
      setSyncState({
        isSyncing: false,
        lastSync,
        error: null,
      });

      console.log('✅ Sincronização concluída via hook');
      return true;
    } catch (error: any) {
      const errorMessage = error.message || 'Erro na sincronização';
      
      setSyncState({
        isSyncing: false,
        lastSync: null,
        error: errorMessage,
      });
      
      console.error('❌ Erro na sincronização:', errorMessage);
      return false;
    }
  }, []);

  /**
   * Inicia sincronização automática
   */
  const startAutoSync = useCallback(() => {
    // Evitar múltiplos intervalos
    if (intervalRef.current) {
      console.warn('⚠️ Auto-sync já está ativo');
      return;
    }

    // Sincronizar imediatamente
    sync();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      console.log('⏰ Executando auto-sync...');
      sync();
    }, autoSyncInterval);

    console.log(`🔄 Auto-sync iniciado (intervalo: ${autoSyncInterval / 1000}s)`);
  }, [sync, autoSyncInterval]);

  /**
   * Para sincronização automática
   */
  const stopAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏸️ Auto-sync pausado');
    }
  }, []);

  /**
   * Sincronização manual
   */
  const manualSync = useCallback(async () => {
    console.log('🔨 Sincronização manual solicitada');
    return await sync();
  }, [sync]);

  // Iniciar auto-sync ao montar o componente
  useEffect(() => {
    startAutoSync();

    // Cleanup ao desmontar
    return () => {
      stopAutoSync();
    };
  }, [startAutoSync, stopAutoSync]);

  return {
    isSyncing: syncState.isSyncing,
    lastSync: syncState.lastSync,
    error: syncState.error,
    sync: manualSync,
    startAutoSync,
    stopAutoSync,
  };
};

export default useSyncService;