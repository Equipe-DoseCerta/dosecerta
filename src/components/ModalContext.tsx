import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

interface ModalConfig {
  type: ModalType;
  title?: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
}

// ============================================================================
// CONTEXTO
// ============================================================================

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

// ============================================================================
// PROVIDER
// ============================================================================

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Refs de animação - SEMPRE criados, nunca condicionalmente
  const modalScale = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // ANIMAÇÃO DO MODAL
  // ============================================================================
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto-fechar apenas se NÃO for confirmação
      if (modalConfig?.type !== 'confirmation') {
        const timer = setTimeout(() => {
          setModalVisible(false);
          setTimeout(() => setModalConfig(null), 300);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } else {
      modalScale.setValue(0);
      checkmarkScale.setValue(0);
    }
  }, [modalVisible, modalConfig?.type, modalScale, checkmarkScale]);

  // ============================================================================
  // FUNÇÕES
  // ============================================================================
  
  const showModal = useCallback((config: ModalConfig) => {
    setModalConfig(config);
    setModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setModalConfig(null), 300);
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalConfig?.onConfirm) {
      modalConfig.onConfirm();
    }
    hideModal();
  }, [modalConfig, hideModal]);

  const handleCancel = useCallback(() => {
    if (modalConfig?.onCancel) {
      modalConfig.onCancel();
    }
    hideModal();
  }, [modalConfig, hideModal]);

  // ============================================================================
  // CONFIGURAÇÕES DE CORES E ÍCONES
  // ============================================================================
  
  const getModalColors = (type: ModalType): string[] => {
    switch (type) {
      case 'success':
        return ['#2196F3', '#1976D2'];
      case 'error':
        return ['#FF5252', '#D32F2F'];
      case 'warning':
        return ['#FF9800', '#F57C00'];
      case 'info':
        return ['#2196F3', '#1976D2'];
      case 'confirmation':
        return ['#E53935', '#C62828']; // ← VERMELHO ao invés de laranja
      default:
        return ['#2196F3', '#1976D2'];
    }
  };

  const getModalIcon = (type: ModalType): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'confirmation':
        return '?';
      default:
        return '✓';
    }
  };

  const getModalTitle = (type: ModalType, customTitle?: string): string => {
    if (customTitle) return customTitle;
    
    switch (type) {
      case 'success':
        return 'Sucesso!';
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Atenção';
      case 'info':
        return 'Informação';
      case 'confirmation':
        return 'Confirmação';
      default:
        return 'Aviso';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      
      {/* MODAL - Renderizado apenas quando há config */}
      <Modal
        visible={modalVisible && modalConfig !== null}
        transparent
        animationType="none"
        onRequestClose={hideModal}
      >
        <View style={styles.modernModalOverlay}>
          <Animated.View
            style={[
              styles.modernModalContainerNew,
              { transform: [{ scale: modalScale }] },
            ]}
          >
            <LinearGradient
              colors={modalConfig ? getModalColors(modalConfig.type) : ['#4CAF50', '#2E7D32']}
              style={styles.modernModalGradientNew}
            >
              {/* ÍCONE */}
              <Animated.View
                style={[
                  styles.iconCircleNew,
                  { transform: [{ scale: checkmarkScale }] },
                ]}
              >
                <Text style={styles.iconTextNew}>
                  {modalConfig ? getModalIcon(modalConfig.type) : '✓'}
                </Text>
              </Animated.View>

              {/* TÍTULO */}
              <Text style={styles.modernModalTitleNew}>
                {modalConfig ? getModalTitle(modalConfig.type, modalConfig.title) : 'Aviso'}
              </Text>

              {/* MENSAGEM */}
              <Text style={styles.modernModalMessageNew}>
                {modalConfig?.message || ''}
              </Text>

              {/* BOTÕES DE CONFIRMAÇÃO */}
              {modalConfig?.type === 'confirmation' && (
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.cancelButton]}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.confirmButtonText, styles.cancelButtonText]}>
                      {modalConfig.cancelText || 'Cancelar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.confirmButton, styles.okButton]}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.confirmButtonText, styles.okButtonText]}>
                      {modalConfig.confirmText || 'Confirmar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </ModalContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// ============================================================================
// ESTILOS - EXATAMENTE IGUAIS AOS DA MedicamentosAtivosScreen
// ============================================================================

const styles = StyleSheet.create({
  modernModalOverlay: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    //paddingTop: 60,
  },
  modernModalContainerNew: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  modernModalGradientNew: {
    padding: 32,
    alignItems: 'center',
  },
  iconCircleNew: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  iconTextNew: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  modernModalTitleNew: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center'
  },
  modernModalMessageNew: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
    opacity: 0.95
  },
  // ESTILOS DOS BOTÕES DE CONFIRMAÇÃO
  confirmationButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  okButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
  },
  okButtonText: {
    color: '#2196F3', // ← AZUL ao invés de laranja
  },
});