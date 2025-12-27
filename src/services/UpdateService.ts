import { Linking, Alert } from 'react-native';
// @ts-ignore: Ignora falta de tipos da biblioteca
import VersionCheck from 'react-native-version-check';

export const UpdateService = {
  /**
   * Verifica se há atualização disponível.
   * Retorna um objeto com o resultado e a URL da loja.
   * 
   * ⚠️ IMPORTANTE: Só funciona se o app estiver publicado na Play Store/App Store
   * Durante desenvolvimento ou em internal testing, sempre retorna { available: false }
   */
  checkUpdate: async () => {
    try {
      console.log('🔍 Verificando atualizações disponíveis...');
      
      const updateNeeded = await VersionCheck.needUpdate();
      
      if (updateNeeded && updateNeeded.isNeeded) {
        console.log('✅ Atualização disponível!', {
          atual: updateNeeded.currentVersion,
          nova: updateNeeded.latestVersion,
        });
        
        return {
          available: true,
          currentVersion: updateNeeded.currentVersion,
          latestVersion: updateNeeded.latestVersion,
          storeUrl: updateNeeded.storeUrl,
        };
      }
      
      console.log('✅ App está atualizado');
      return { available: false };
    } catch (error: any) {
      // Erros comuns:
      // - App não publicado na loja (development/internal testing)
      // - Sem conexão com internet
      // - Play Store page não encontrada
      
      const errorMessage = error?.message || String(error);
      
      // Se for erro de "Parse Error" ou "Not Found", é porque o app não está na loja
      if (
        errorMessage.includes('Parse Error') ||
        errorMessage.includes('Not Found') ||
        errorMessage.includes('play store page')
      ) {
        console.log('ℹ️ App ainda não publicado na Play Store (modo desenvolvimento/teste)');
      } else {
        // Outros erros (sem internet, etc)
        console.warn('⚠️ Erro ao verificar atualização:', errorMessage);
      }
      
      // Sempre retornar false para não quebrar o app
      return { available: false };
    }
  },

  /**
   * Abre a loja de aplicativos diretamente
   * 
   * ⚠️ IMPORTANTE: Só funciona se o app estiver publicado
   */
  openStore: async () => {
    try {
      console.log('🏪 Abrindo loja de aplicativos...');
      
      const url = await VersionCheck.getStoreUrl();
      
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
          console.log('✅ Loja aberta com sucesso');
        } else {
          throw new Error('Não foi possível abrir a URL da loja');
        }
      } else {
        throw new Error('URL da loja não encontrada');
      }
    } catch (error: any) {
      console.error('❌ Erro ao abrir loja:', error?.message || error);
      
      Alert.alert(
        '❌ Erro',
        'Não foi possível abrir a loja de aplicativos.\n\nVerifique sua conexão com a internet e tente novamente.',
        [{ text: 'OK' }]
      );
    }
  },

  /**
   * Retorna informações da versão atual do app
   * Útil para debugging
   */
  getVersionInfo: () => {
    try {
      return {
        version: VersionCheck.getCurrentVersion(),
        buildNumber: VersionCheck.getCurrentBuildNumber(),
        packageName: VersionCheck.getPackageName(),
      };
    } catch (error) {
      console.error('Erro ao obter informações da versão:', error);
      return {
        version: 'desconhecida',
        buildNumber: 'desconhecido',
        packageName: 'desconhecido',
      };
    }
  },
};