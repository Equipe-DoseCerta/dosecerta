import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import * as DocumentPicker from '@react-native-documents/picker';
import ScreenContainer from '../components/ScreenContainer';
import {
  executarBackupRapido,
  executarBackupEmPasta,
  executarRestauracao,
  obterUltimoBackup,
  buscarBackupsNaRaiz,
  formatarTamanhoArquivo,
} from '../services/backupManager';
import { reinicializarBancoDados } from '../database/database';
import { theme } from '../constants/theme';

interface BackupFile {
  name: string;
  path: string;
  size: number;
  date: Date;
}

interface CustomModalProps {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'confirmation' | 'warning';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'confirmation': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#FF5252';
      case 'warning': return '#FF9800';
      case 'confirmation': return '#FF6B6B';
      default: return '#2196F3';
    }
  };

  // ✅ Fecha o modal ANTES de chamar o callback, com delay para a animação
  // terminar. Evita conflito entre Modal e DocumentPicker no Android.
  const handleConfirm = () => {
    onClose();
    if (onConfirm) setTimeout(onConfirm, 350);
  };

  const handleCancel = () => {
    onClose();
    if (onCancel) setTimeout(onCancel, 350);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIcon, { backgroundColor: getIconColor() + '20' }]}>
              <Text style={styles.modalIconText}>{getIcon()}</Text>
            </View>
            
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalMessage}>{message}</Text>

            <View style={styles.modalButtons}>
              {cancelText && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCancel}
                >
                  <Text style={styles.modalButtonTextCancel}>{cancelText}</Text>
                </TouchableOpacity>
              )}
              
              {confirmText && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: getIconColor() }]}
                  onPress={handleConfirm}
                >
                  <Text style={styles.modalButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              )}
              
              {!confirmText && !cancelText && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: getIconColor() }]}
                  onPress={onClose}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const PreferenciasBackup = () => {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backupsRaiz, setBackupsRaiz] = useState<BackupFile[]>([]);
  const [modalListaVisible, setModalListaVisible] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<Omit<CustomModalProps, 'visible' | 'onClose'>>({
    type: 'info',
    title: '',
    message: '',
  });

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

  const showModal = (config: Omit<CustomModalProps, 'visible' | 'onClose'>) => {
    setModalConfig(config);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const carregarInformacoes = async () => {
    try {
      setLastBackup(await obterUltimoBackup());
      const backupsNaRaiz = await buscarBackupsNaRaiz();
      setBackupsRaiz(backupsNaRaiz);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      carregarInformacoes();
    }, [])
  );

  const animateButton = (scaleAnim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleMenuCriarBackup = () => {
    animateButton(scaleAnim1);
    showModal({
      type: 'info',
      title: '💾 Criar Backup',
      message: 'Como deseja salvar seus dados?\n\n⚡ Rápido: Salva em "Documents/DoseCerta"\n📂 Escolher: Selecione outra pasta personalizada',
      confirmText: '⚡ Backup Rápido',
      cancelText: '📂 Escolher Pasta',
      onConfirm: iniciarBackupRapido,
      onCancel: iniciarBackupManual,
    });
  };

  const iniciarBackupRapido = async () => {
    setIsProcessing(true);
    try {
      const result = await executarBackupRapido();
      if (result.success) {
        showModal({
          type: 'success',
          title: 'Sucesso!',
          message: 'Backup salvo em "Documents/DoseCerta". Mantemos apenas os 3 arquivos mais recentes.',
        });
        await carregarInformacoes();
      } else {
        showModal({
          type: 'error',
          title: 'Erro no Backup',
          message: result.error || 'Falha ao criar backup.',
        });
      }
    } catch (err: any) {
      showModal({
        type: 'error',
        title: 'Erro Inesperado',
        message: err?.message || 'Falha ao processar backup.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const iniciarBackupManual = async () => {
    try {
      const result = await DocumentPicker.pickDirectory();
      if (result && result.uri) {
        setIsProcessing(true);
        const res = await executarBackupEmPasta(result.uri, false);
        if (res.success) {
          showModal({
            type: 'success',
            title: 'Backup Concluído',
            message: 'Backup exportado com sucesso!',
          });
          await carregarInformacoes();
        } else {
          showModal({
            type: 'error',
            title: 'Erro',
            message: res.error || 'Falha ao salvar na pasta selecionada.',
          });
        }
        setIsProcessing(false);
      }
    } catch (err: any) {
      setIsProcessing(false);
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        showModal({
          type: 'error',
          title: 'Erro',
          message: 'Falha ao selecionar pasta.',
        });
      }
    }
  };

  const handleMenuRestaurar = async () => {
    animateButton(scaleAnim2);
    showModal({
      type: 'info',
      title: '♻️ Restaurar Dados',
      message: 'Como deseja localizar seu backup?\n\n🔍 Automático: Abre a pasta "Documents/DoseCerta"\n📂 Manual: Navegar para outra pasta',
      confirmText: '🔍 Automático',
      cancelText: '📂 Manual',
      onConfirm: restaurarAutomatico,
      onCancel: buscarArquivoExterno,
      // ✅ Ambos os callbacks recebem delay de 350ms do CustomModal
    });
  };

  const restaurarAutomatico = async () => {
    setIsProcessing(true);
    let backupsEncontrados: BackupFile[] = [];
    try {
      backupsEncontrados = await buscarBackupsNaRaiz();
      setBackupsRaiz(backupsEncontrados);
    } catch {
      // ignora — mostrará "nenhum backup"
    } finally {
      setIsProcessing(false);
    }

    if (backupsEncontrados.length === 0) {
      showModal({
        type: 'warning',
        title: 'Nenhum Backup Encontrado',
        message: 'Não localizamos arquivos em "Documents/DoseCerta".\n\nIsso pode ocorrer se você reinstalou o app recentemente. Deseja buscar manualmente?',
        confirmText: '📂 Buscar Manualmente',
        cancelText: 'Cancelar',
        onConfirm: buscarArquivoExterno,
        // CustomModal aplica delay de 350ms antes de chamar onConfirm
      });
      return;
    }

    // ✅ Tem backups na pasta padrão — mostra lista para o usuário escolher
    // Os paths retornados por buscarBackupsNaRaiz são caminhos absolutos internos
    // que executarRestauracao consegue ler diretamente (sem precisar do picker)
    setModalListaVisible(true);
  };

  const selecionarBackupDaLista = (backup: BackupFile) => {
    setModalListaVisible(false);
    // Delay para o modal de lista fechar antes de abrir o de confirmação
    setTimeout(() => {
      confirmarRestauracao(backup.path, backup.name);
    }, 300);
  };

  const buscarArquivoExterno = async () => {
    try {
      const pickerResult = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });
      const res = pickerResult[0];

      // ✅ executarRestauracao trata content:// copiando para cache internamente.
      // Passamos o uri original (content://) para que o backupManager faça a cópia
      // corretamente via RNFS. Se fileCopyUri existir (já é file://), usamos ele.
      const localPath = (res as any).fileCopyUri || res.uri;
      const nomeArquivo = res.name || '';

      if (!localPath) {
        showModal({ type: 'error', title: 'Erro', message: 'Não foi possível acessar o arquivo selecionado.' });
        return;
      }

      if (!nomeArquivo.endsWith('.db') && !nomeArquivo.endsWith('.sqlite')) {
        showModal({
          type: 'warning',
          title: 'Arquivo Inválido',
          message: 'Selecione um arquivo de backup válido com extensão .db',
        });
        return;
      }

      confirmarRestauracao(localPath, nomeArquivo || 'arquivo externo');
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        showModal({ type: 'error', title: 'Erro', message: 'Falha ao selecionar o arquivo.' });
      }
    }
  };

  const confirmarRestauracao = (path: string, nome: string) => {
    showModal({
      type: 'confirmation',
      title: '⚠️ Atenção!',
      message: `Isso SUBSTITUIRÁ todos os dados atuais pelos dados do backup:\n\n"${nome}"\n\nEsta ação não pode ser desfeita. Tem certeza?`,
      confirmText: 'SIM, RESTAURAR',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const res = await executarRestauracao(path);
          
          if (res.success) {
            await reinicializarBancoDados();
            await carregarInformacoes();
            
            showModal({
              type: 'success',
              title: 'Sucesso!',
              message: 'Dados restaurados com sucesso! O aplicativo foi atualizado com as informações do backup.',
            });
          } else {
            showModal({
              type: 'error',
              title: 'Falha na Restauração',
              message: res.error || 'Não foi possível restaurar o arquivo.',
            });
          }
        } catch (error: any) {
          showModal({
            type: 'error',
            title: 'Erro Crítico',
            message: 'Ocorreu um erro ao tentar restaurar: ' + (error?.message || 'Erro desconhecido'),
          });
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  return (
    <ScreenContainer showGradient={true}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>🔒 Segurança dos Dados</Text>
          <Text style={styles.headerSub}>Seus medicamentos sempre protegidos</Text>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>💾</Text>
            <View>
              <Text style={styles.cardTitle}>Fazer Backup</Text>
              <Text style={styles.cardSubtitle}>Salvar cópia de segurança agora</Text>
            </View>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.infoText}>
              Último backup: <Text style={styles.boldText}>{lastBackup ? new Date(lastBackup).toLocaleString() : 'Nunca realizado'}</Text>
            </Text>
            <Text style={styles.infoTextPath}>
              Local: Documents/DoseCerta/
            </Text>
          </View>
          <Animated.View style={{ transform: [{ scale: scaleAnim1 }] }}>
            <TouchableOpacity
              style={[styles.actionButton, isProcessing && styles.disabled]}
              onPress={handleMenuCriarBackup}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#4CAF50', '#45B049']} style={styles.btnGradient}>
                {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Criar Novo Backup</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEmoji}>♻️</Text>
            <View>
              <Text style={styles.cardTitle}>Restaurar Dados</Text>
              <Text style={styles.cardSubtitle}>Recuperar informações salvas</Text>
            </View>
          </View>
          <View style={styles.cardInfo}>
            {backupsRaiz.length > 0 ? (
              <View>
                <Text style={styles.infoText}>Backups encontrados (Máx. 3):</Text>
                {backupsRaiz.slice(0, 3).map((b, i) => (
                  <Text key={i} style={styles.backupItem}>
                    {i === 0 ? '🟢' : '⚪'} {b.date.toLocaleString()} ({formatarTamanhoArquivo(b.size)})
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.infoText}>Nenhum backup automático encontrado na pasta padrão.</Text>
            )}
          </View>
          <Animated.View style={{ transform: [{ scale: scaleAnim2 }] }}>
            <TouchableOpacity
              style={[styles.actionButton, isProcessing && styles.disabled]}
              onPress={handleMenuRestaurar}
              disabled={isProcessing}
            >
              <LinearGradient colors={['#FF6B6B', '#FF5252']} style={styles.btnGradient}>
                {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Restaurar Backup</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ✅ Modal de lista de backups — aparece no fluxo Automático */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalListaVisible}
        onRequestClose={() => setModalListaVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalListaVisible(false)}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={[styles.modalIcon]}>
                <Text style={styles.modalIconText}>📋</Text>
              </View>
              <Text style={styles.modalTitle}>Selecionar Backup</Text>
              <Text style={styles.modalMessage}>
                Escolha qual backup deseja restaurar{'\n'}(🟢 = mais recente)
              </Text>
              <View style={ styles.backupListContainer }>
                {backupsRaiz.slice(0, 3).map((b, i) => (
                  <TouchableOpacity
                    key={b.path}
                    style={[styles.backupListItem, i === 0 && styles.backupListItemFirst]}
                    onPress={() => selecionarBackupDaLista(b)}
                  >
                    <Text style={styles.backupListEmoji}>{i === 0 ? '🟢' : '⚪'}</Text>
                    <View style={ styles.backupListInfo }>
                      <Text style={styles.backupListDate}>
                        {b.date.toLocaleString('pt-BR')}
                      </Text>
                      <Text style={styles.backupListSize}>
                        {formatarTamanhoArquivo(b.size)}
                      </Text>
                    </View>
                    <Text style={styles.backupListArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalListaVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomModal
        visible={modalVisible}
        onClose={closeModal}
        {...modalConfig}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: { 
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerContainer: { 
    marginBottom: theme.spacing.lg,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSub: { 
    fontSize: 14, 
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  actionCard: { 
    backgroundColor: '#fff', 
    borderRadius: theme.borderRadius.lg, 
    padding: theme.spacing.lg, 
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: theme.spacing.md,
  },
  cardEmoji: { 
    fontSize: 32, 
    marginRight: theme.spacing.md,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: theme.colors.primary,
  },
  cardSubtitle: { 
    fontSize: 13, 
    color: '#666',
    marginTop: 2,
  },
  cardInfo: { 
    backgroundColor: '#F5F7FA', 
    padding: theme.spacing.md, 
    borderRadius: theme.borderRadius.md, 
    marginBottom: theme.spacing.md,
  },
  infoText: { 
    fontSize: 13, 
    color: '#555',
    lineHeight: 18,
  },
  infoTextPath: {
    marginTop: 4, 
    fontSize: 11, 
    color: '#888',
  },
  boldText: { 
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  backupItem: { 
    fontSize: 12, 
    color: '#444', 
    marginTop: 6,
    paddingLeft: theme.spacing.sm,
  },
  actionButton: { 
    borderRadius: theme.borderRadius.lg, 
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  disabled: { 
    opacity: 0.6,
  },
  btnGradient: { 
    padding: theme.spacing.md, 
    alignItems: 'center',
  },
  btnText: { 
    color: '#fff', 
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#2196F320' 
  },
  modalIconText: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    backgroundColor: '#2196F3',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
    marginTop: 16, width: '100%'
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  backupListItemFirst: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  backupListEmoji: {
    fontSize: 18,
  },
  backupListDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  backupListSize: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  backupListArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backupListContainer: {
    width: '100%',
    gap: 8,
  },

  backupListInfo: {
    flex: 1,
  },
});

export default PreferenciasBackup;