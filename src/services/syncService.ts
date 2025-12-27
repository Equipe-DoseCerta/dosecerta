// src/services/syncService.ts
// Serviço de Sincronização com Google Sheets

import BadgeService from './badgeService';

interface ContentItem {
  id: number;
  title: string;
  publishedAt: string; // ISO timestamp
  category: string;
  content?: string;
  url?: string;
  // Adicione outros campos conforme necessário
}

interface GoogleSheetsResponse {
  diretas: ContentItem[];
  avisos: ContentItem[];
  saudeDiaria: ContentItem[];
  videos: ContentItem[];
  audios: ContentItem[];
  guiaRemedios: ContentItem[];
}

// Mapeamento de categorias para screenKeys
const CATEGORY_TO_SCREEN_KEY: { [key: string]: string } = {
  diretas: 'diretas',
  avisos: 'avisos',
  saudeDiaria: 'saudeDiaria',
  videos: 'videos',
  audios: 'audios',
  guiaRemedios: 'guiaRemedios',
};

/**
 * Serviço de Sincronização com Google Sheets
 * Gerencia a sincronização de conteúdo e atualização de badges
 */
export const SyncService = {
  /**
   * URL da API do Google Sheets
   * IMPORTANTE: Substitua pela URL real da sua API
   */
  GOOGLE_SHEETS_API_URL: 'https://sua-api.com/sheets/data',

  /**
   * Busca dados do Google Sheets
   * @returns Dados do Google Sheets ou null em caso de erro
   */
  async fetchGoogleSheetsData(): Promise<GoogleSheetsResponse | null> {
    try {
      console.log('🔄 Buscando dados do Google Sheets...');
      
      const response = await fetch(this.GOOGLE_SHEETS_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Adicione headers de autenticação se necessário
          // 'Authorization': 'Bearer YOUR_TOKEN',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GoogleSheetsResponse = await response.json();
      console.log('✅ Dados do Google Sheets recebidos');
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar Google Sheets:', error);
      return null;
    }
  },

  /**
   * Sincroniza conteúdo e atualiza badges
   */
  async syncContent(): Promise<void> {
    try {
      console.log('🔄 Iniciando sincronização completa...');

      // 1. Buscar dados do Google Sheets
      const sheetsData = await this.fetchGoogleSheetsData();
      if (!sheetsData) {
        console.warn('⚠️ Não foi possível buscar dados do Sheets');
        return;
      }

      // 2. Obter timestamps de última visualização
      const lastViewTimestamps = await BadgeService.getAllLastViewTimestamps();

      // 3. Processar cada categoria
      for (const [category, items] of Object.entries(sheetsData)) {
        const screenKey = CATEGORY_TO_SCREEN_KEY[category];
        if (!screenKey) {
          console.warn(`⚠️ Categoria desconhecida: ${category}`);
          continue;
        }

        // Obter timestamp da última visualização desta categoria
        const lastViewTime = lastViewTimestamps[screenKey];
        
        // Contar itens novos (publicados após última visualização)
        const newItemsCount = this.countNewItems(items, lastViewTime);

        // Atualizar badge
        if (newItemsCount > 0) {
          await BadgeService.setUnread(screenKey, newItemsCount);
          console.log(`📬 ${screenKey}: ${newItemsCount} novo(s) item(ns)`);
        } else {
          await BadgeService.setUnread(screenKey, 0);
          console.log(`✅ ${screenKey}: nenhum item novo`);
        }
      }

      // 4. Atualizar timestamp de última sincronização
      await BadgeService.updateLastSyncTimestamp();
      console.log('✅ Sincronização concluída com sucesso');

    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
    }
  },

  /**
   * Conta itens novos baseado no timestamp de última visualização
   * @param items - Array de itens da categoria
   * @param lastViewTime - Timestamp da última visualização (ISO string)
   * @returns Quantidade de itens novos
   */
  countNewItems(items: ContentItem[], lastViewTime: string | null): number {
    if (!lastViewTime) {
      // Se nunca visualizou, todos são novos
      return items.length;
    }

    const lastViewDate = new Date(lastViewTime);
    return items.filter(item => {
      try {
        const publishedDate = new Date(item.publishedAt);
        return publishedDate > lastViewDate;
      } catch {
        console.warn('⚠️ Data inválida:', item.publishedAt);
        return false;
      }
    }).length;
  },

  /**
   * Verifica se há novos conteúdos para uma categoria específica
   * @param screenKey - Chave da tela (ex: 'diretas', 'videos')
   * @returns Quantidade de novos itens
   */
  async checkNewContentForCategory(screenKey: string): Promise<number> {
    try {
      const sheetsData = await this.fetchGoogleSheetsData();
      if (!sheetsData) return 0;

      // Encontrar categoria correspondente
      const category = Object.keys(CATEGORY_TO_SCREEN_KEY).find(
        key => CATEGORY_TO_SCREEN_KEY[key] === screenKey
      );
      
      if (!category) {
        console.warn(`⚠️ ScreenKey desconhecida: ${screenKey}`);
        return 0;
      }

      const items = sheetsData[category as keyof GoogleSheetsResponse];
      const lastViewTime = await BadgeService.getLastViewTimestamp(screenKey);
      
      return this.countNewItems(items, lastViewTime);
    } catch (error) {
      console.error('❌ Erro ao verificar novos conteúdos:', error);
      return 0;
    }
  },

  /**
   * Força sincronização manual
   * @returns true se sucesso, false se erro
   */
  async forceSyncNow(): Promise<boolean> {
    try {
      console.log('🔨 Sincronização manual iniciada...');
      await this.syncContent();
      return true;
    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error);
      return false;
    }
  },

  /**
   * Obtém informações de sincronização
   * @returns Informações sobre última e próxima sincronização
   */
  async getSyncInfo(): Promise<{
    lastSync: string | null;
    nextSync: string | null;
  }> {
    const lastSync = await BadgeService.getLastSyncTimestamp();
    const nextSync = lastSync 
      ? new Date(new Date(lastSync).getTime() + 30 * 60 * 1000).toISOString() // +30min
      : null;

    return { lastSync, nextSync };
  },

  /**
   * Define uma URL customizada para a API
   * @param url - Nova URL da API
   */
  setApiUrl(url: string): void {
    this.GOOGLE_SHEETS_API_URL = url;
    console.log(`✅ URL da API atualizada: ${url}`);
  },
};

export default SyncService;