import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { UpdateService } from '../services/UpdateService';

export interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  latestVersion?: string;
  storeUrl?: string;
  required?: boolean;
  releaseNotes?: string;
}

interface UpdateModalProps {
  visible: boolean;
  updateInfo: UpdateInfo;
  onUpdate: () => void;
  onRemindLater?: () => void;
  onDismiss?: () => void;
}

const { width } = Dimensions.get('window');

const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  updateInfo,
  onUpdate,
  onRemindLater,
  onDismiss,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  const handleUpdate = () => {
    onUpdate();
    UpdateService.openStore();
  };

  const handleRemindLater = () => {
    if (onRemindLater) {
      onRemindLater();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!updateInfo.available) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={updateInfo.required ? undefined : handleDismiss}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light-content" />
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#0A7AB8', '#054F77']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🚀</Text>
              </View>
              <Text style={styles.title}>
                {updateInfo.required ? 'Atualização Obrigatória' : 'Nova Versão Disponível'}
              </Text>
              <Text style={styles.versionText}>
                v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
              </Text>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {updateInfo.required && (
                <View style={styles.requiredBanner}>
                  <Text style={styles.requiredIcon}>⚠️</Text>
                  <Text style={styles.requiredText}>
                    Esta atualização é necessária para continuar usando o app
                  </Text>
                </View>
              )}

              <Text style={styles.subtitle}>O que há de novo:</Text>
              
              {updateInfo.releaseNotes ? (
                <Text style={styles.releaseNotes}>{updateInfo.releaseNotes}</Text>
              ) : (
                <View style={styles.defaultNotes}>
                  <Text style={styles.noteItem}>✨ Melhorias de desempenho</Text>
                  <Text style={styles.noteItem}>🐛 Correções de bugs</Text>
                  <Text style={styles.noteItem}>🔒 Atualizações de segurança</Text>
                  <Text style={styles.noteItem}>🎨 Melhorias visuais</Text>
                </View>
              )}
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdate}
                activeOpacity={0.8}
              >
                <Text style={styles.updateButtonText}>
                  {updateInfo.required ? 'Atualizar Agora' : 'Atualizar'}
                </Text>
                <Text style={styles.buttonIcon}>→</Text>
              </TouchableOpacity>

              {!updateInfo.required && (
                <View style={styles.secondaryButtons}>
                  {onRemindLater && (
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton]}
                      onPress={handleRemindLater}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.secondaryButtonText}>Lembrar Depois</Text>
                    </TouchableOpacity>
                  )}

                  {onDismiss && (
                    <TouchableOpacity
                      style={[styles.button, styles.dismissButton]}
                      onPress={handleDismiss}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dismissButtonText}>Não Mostrar Novamente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  gradient: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  content: {
    maxHeight: 250,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 10,
  },
  requiredBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  requiredIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  requiredText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  releaseNotes: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  defaultNotes: {
    gap: 8,
  },
  noteItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonText: {
    color: '#0A7AB8',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    color: '#0A7AB8',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtons: {
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: 'transparent',
  },
  dismissButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default UpdateModal;