import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import {
  configurarDiretorioBackup,
  executarBackup,
  executarRestauracao,
  verificarDiretorioConfigurado,
  obterUltimoBackup,
  listarBackupsDisponiveis,
  formatarTamanhoArquivo,
} from '../services/backupManager';
import { reinicializarBancoDados } from '../database/database';

interface BackupInfo {
  configured: boolean;
  lastBackup: string | null;
}

interface BackupFile {
  name: string;
  path: string;
  size: number;
  date: Date;
}

const PreferenciasBackup = () => {
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    configured: false,
    lastBackup: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);

  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const carregarConfiguracao = useCallback(async () => {
    try {
      const configured = await verificarDiretorioConfigurado();
      const lastBackup = await obterUltimoBackup();

      setBackupInfo({
        configured,
        lastBackup,
      });

      if (configured) {
        const backupsList = await listarBackupsDisponiveis();
        setBackups(backupsList);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarConfiguracao();
    }, [carregarConfiguracao])
  );

  const animateButton = (scaleAnim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCriarBackup = async () => {
    animateButton(scaleAnim1);

    if (!backupInfo.configured) {
      Alert.alert(
        '📁 Primeira vez?',
        'Vamos escolher onde salvar seus backups!',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => {
              Alert.alert(
                '⚠️ Backup Cancelado',
                'Você pode criar um backup quando quiser.',
                [{ text: 'OK' }]
              );
            },
          },
          {
            text: 'Escolher Pasta',
            onPress: async () => {
              setIsProcessing(true);
              try {
                const resultado = await configurarDiretorioBackup();

                if (resultado.success) {
                  setBackupInfo(prev => ({
                    ...prev,
                    configured: true,
                  }));

                  await executarBackupAgora();
                } else {
                  Alert.alert(
                    '❌ Erro',
                    resultado.error || 'Não foi possível configurar a pasta'
                  );
                  setIsProcessing(false);
                }
              } catch (error) {
                console.error('Erro ao configurar diretório:', error);
                Alert.alert('❌ Erro', 'Ocorreu um erro inesperado');
                setIsProcessing(false);
              }
            },
          },
        ]
      );
      return;
    }

    await executarBackupAgora();
  };

  const executarBackupAgora = async () => {
    setIsProcessing(true);

    try {
      const resultado = await executarBackup();

      if (resultado.success) {
        const lastBackup = await obterUltimoBackup();
        const backupsList = await listarBackupsDisponiveis();

        setBackupInfo(prev => ({
          ...prev,
          lastBackup,
        }));
        setBackups(backupsList);

        Alert.alert(
          '✅ Backup Criado!',
          `Arquivo salvo com sucesso!\n\n📍 Local: ${resultado.path}\n\n💾 Seus dados estão protegidos!`
        );
      } else {
        Alert.alert('❌ Erro', resultado.error || 'Erro ao criar backup');
      }
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      Alert.alert('❌ Erro', 'Ocorreu um erro inesperado');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestaurarBackup = async () => {
    animateButton(scaleAnim2);

    if (backups.length === 0) {
      Alert.alert(
        '📂 Nenhum backup encontrado',
        'Você ainda não tem backups salvos. Crie um backup primeiro para poder restaurar depois.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Criar array de opções com os backups
    const backupOptions: any[] = backups.map((backup, index) => ({
      text: `${backup.name}\n📊 ${formatarTamanhoArquivo(backup.size)}`,
      onPress: async () => {
        Alert.alert(
          '⚠️ Confirmar Restauração',
          `Isso vai substituir TODOS os dados atuais pelos dados do backup:\n\n"${backups[index].name}"\n\nTem certeza?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sim, Restaurar',
              style: 'destructive',
              onPress: async () => {
                setIsProcessing(true);
                try {
                  const resultado = await executarRestauracao(backups[index].path);

                  if (resultado.success) {
                    await reinicializarBancoDados();

                    Alert.alert(
                      '✅ Backup Restaurado!',
                      'Os dados foram restaurados com sucesso!\n\n🔄 Todos os dados agora estão disponíveis na aplicação.',
                      [{ text: 'OK' }]
                    );

                    carregarConfiguracao();
                  } else {
                    Alert.alert('❌ Erro', resultado.error || 'Erro ao restaurar backup');
                  }
                } catch (error) {
                  console.error('Erro ao restaurar backup:', error);
                  Alert.alert('❌ Erro', 'Ocorreu um erro inesperado');
                } finally {
                  setIsProcessing(false);
                }
              },
            },
          ]
        );
      },
    }));

    // Adicionar botão Cancelar ao final
    backupOptions.push({
      text: 'Fechar',
      style: 'cancel',
    });

    Alert.alert(
      '♻️ Escolha um backup',
      'Selecione qual arquivo deseja restaurar:',
      backupOptions
    );
  };

  const formatarDataHora = (dateString: string | null) => {
    if (!dateString) return 'Nunca';

    try {
      const data = new Date(dateString);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#054F77" />
      <LinearGradient colors={['#054F77', '#0A7AB8']} style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Card 1: Criar Backup */}
            <View style={styles.actionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardEmoji}>💾</Text>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Criar Backup</Text>
                    <Text style={styles.cardSubtitle}>
                      {backupInfo.configured
                        ? 'Salve seus dados agora'
                        : 'Configure e crie seu primeiro backup'}
                    </Text>
                  </View>
                </View>
                {backupInfo.configured && (
                  <View style={styles.statusBadgeSuccess}>
                    <Text style={styles.statusEmoji}>✅</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Último backup:</Text>
                  <Text style={styles.infoValue}>
                    {formatarDataHora(backupInfo.lastBackup)}
                  </Text>
                </View>

                {backupInfo.configured && backups.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Backups salvos:</Text>
                    <Text style={styles.infoValue}>{backups.length} arquivo(s)</Text>
                  </View>
                )}

                {!backupInfo.configured && (
                  <View style={styles.firstTimeBox}>
                    <Text style={styles.firstTimeText}>
                      🎯 Primeira vez? Vamos escolher onde salvar seus backups!
                    </Text>
                  </View>
                )}
              </View>

              <Animated.View style={{ transform: [{ scale: scaleAnim1 }] }}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isProcessing && styles.buttonDisabled,
                  ]}
                  onPress={handleCriarBackup}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isProcessing
                        ? ['#999', '#777']
                        : ['#4CAF50', '#45B049']
                    }
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonEmoji}>
                      {isProcessing ? '⏳' : '💾'}
                    </Text>
                    <Text style={styles.buttonText}>
                      {isProcessing
                        ? 'Processando...'
                        : backupInfo.configured
                        ? 'Fazer Backup Agora'
                        : 'Criar Primeiro Backup'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Card 2: Restaurar Backup */}
            <View style={styles.actionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardEmoji}>♻️</Text>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle}>Restaurar Backup</Text>
                    <Text style={styles.cardSubtitle}>
                      Recupere dados anteriores
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.warningBox}>
                  <Text style={styles.warningTextLarge}>
                    ⚠️ Esta ação substituirá todos os dados atuais
                  </Text>
                </View>

                {backups.length > 0 ? (
                  <View style={styles.backupsList}>
                    <Text style={styles.backupsTitle}>
                      📦 Backups disponíveis ({backups.length}):
                    </Text>
                    {backups.slice(0, 3).map((backup, index) => (
                      <Text key={index} style={styles.backupItem}>
                        • {backup.name} ({formatarTamanhoArquivo(backup.size)})
                      </Text>
                    ))}
                    {backups.length > 3 && (
                      <Text style={styles.moreBackups}>
                        + {backups.length - 3} backup(s) adicional(is)
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      📂 Nenhum backup encontrado ainda
                    </Text>
                  </View>
                )}
              </View>

              <Animated.View style={{ transform: [{ scale: scaleAnim2 }] }}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    (isProcessing || backups.length === 0) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleRestaurarBackup}
                  disabled={isProcessing || backups.length === 0}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isProcessing || backups.length === 0
                        ? ['#999', '#777']
                        : ['#FF6B6B', '#FF5252']
                    }
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonEmoji}>♻️</Text>
                    <Text style={styles.buttonText}>
                      {backups.length === 0 ? 'Nenhum Backup' : 'Selecionar Backup'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Help Card */}
            <View style={styles.helpCard}>
              <Text style={styles.helpEmoji}>💡</Text>
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpTitle}>Dicas importantes:</Text>
                <Text style={styles.helpText}>
                  • Faça backups regularmente{'\n'}
                  • Guarde os arquivos em local seguro{'\n'}
                  • Restaurar substitui todos os dados atuais{'\n'}
                  • Backup do dia será sobrescrito se criar novamente{'\n'}
                  • Formato: backup_dosecerta_DD-MM-AAAA.db
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#054F77',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    width: '100%',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#054F77',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statusBadgeSuccess: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusEmoji: {
    fontSize: 18,
  },
  cardContent: {
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#054F77',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  firstTimeBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  firstTimeText: {
    fontSize: 12,
    color: '#1565C0',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButton: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  buttonEmoji: {
    fontSize: 18,
    marginRight: 7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5252',
  },
  warningTextLarge: {
    fontSize: 13,
    color: '#C62828',
    textAlign: 'center',
    fontWeight: '600',
  },
  backupsList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  backupsTitle: {
    fontSize: 12,
    color: '#054F77',
    fontWeight: '600',
    marginBottom: 6,
  },
  backupItem: {
    fontSize: 11,
    color: '#054F77',
    marginBottom: 3,
    fontWeight: '500',
  },
  moreBackups: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 3,
  },
  emptyBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  helpCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 6,
  },
  helpEmoji: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 1,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 5,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
});

export default PreferenciasBackup;