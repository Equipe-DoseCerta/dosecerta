import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  Animated,
  BackHandler,
} from 'react-native';
import { NativeModules, PermissionsAndroid } from 'react-native';

const { AlarmModule } = NativeModules;

interface Permissions {
  canScheduleExactAlarms: boolean;
  canPostNotifications: boolean;
  canDrawOverlays: boolean;
  isBatteryOptimizationDisabled: boolean;
  canUseFullScreenIntent: boolean;
}

// 🎯 Card individual para cada permissão (estilo nativo)
const PermissionCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  onAllow: () => void;
  onDeny: () => void;
  critical?: boolean;
}> = ({ icon, title, description, onAllow, onDeny, critical }) => {
  return (
    <View style={[styles.card, critical && styles.criticalCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, critical && styles.criticalTitle]}>
            {title}
          </Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.denyButton}
          onPress={onDeny}
          activeOpacity={0.7}
        >
          <Text style={styles.denyButtonText}>Não permitir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.allowButton, critical && styles.criticalButton]}
          onPress={onAllow}
          activeOpacity={0.7}
        >
          <Text style={styles.allowButtonText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 🎯 Container que gerencia todas as permissões
const PermissionsCards: React.FC = () => {
  const [permissions, setPermissions] = useState<Permissions>({
    canScheduleExactAlarms: false,
    canPostNotifications: false,
    canDrawOverlays: false,
    isBatteryOptimizationDisabled: false,
    canUseFullScreenIntent: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const checkAllPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setLoading(false);
      return;
    }

    try {
      const perms = await AlarmModule.checkPermissions();
      console.log('📋 Permissões atuais:', perms);
      setPermissions(perms);
      
      // Verifica se tem alguma permissão faltando
      const hasAnyMissing = !perms.canScheduleExactAlarms || 
                           !perms.canPostNotifications ||
                           !perms.canDrawOverlays || 
                           !perms.isBatteryOptimizationDisabled || 
                           !perms.canUseFullScreenIntent;
      
      setVisible(hasAnyMissing);
      
      if (hasAnyMissing) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
    } finally {
      setLoading(false);
    }
  }, [fadeAnim]);

  useEffect(() => {
    checkAllPermissions();
    
    // Verifica permissões periodicamente
    const interval = setInterval(checkAllPermissions, 3000);
    return () => clearInterval(interval);
  }, [checkAllPermissions]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [fadeAnim]);

  // Handler do botão voltar
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, handleClose]);

  const requestNotifications = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('📱 Notificações:', granted);
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar notificações:', error);
    }
  };

  const handleAllow = async (permissionKey: keyof Permissions) => {
    try {
      await requestNotifications();

      switch (permissionKey) {
        case 'canUseFullScreenIntent':
          await AlarmModule.requestFullScreenIntentPermission();
          break;
        case 'canScheduleExactAlarms':
          await AlarmModule.openAlarmSettings();
          break;
        case 'canDrawOverlays':
          await AlarmModule.requestOverlayPermission();
          break;
        case 'isBatteryOptimizationDisabled':
          // 🔧 CORREÇÃO: Verifica se realmente está otimizado ANTES de pedir
          const perms = await AlarmModule.checkPermissions();
          if (!perms.isBatteryOptimizationDisabled) {
            await AlarmModule.requestBatteryOptimizationExemption();
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Erro ao permitir ${permissionKey}:`, error);
    }
  };

  const handleDeny = () => {
    console.log('⚠️ Usuário negou permissão');
  };

  if (loading || !visible) {
    return null;
  }

  // Lista de permissões faltantes
  const missingPermissions = [
    {
      key: 'canUseFullScreenIntent' as keyof Permissions,
      icon: '🚨',
      title: 'Alarme de Tela Cheia',
      description: 'Permite que o alarme apareça em tela cheia mesmo quando o celular está bloqueado',
      critical: true,
    },
    {
      key: 'canScheduleExactAlarms' as keyof Permissions,
      icon: '⏰',
      title: 'Alarmes Exatos',
      description: 'Necessário para que os alarmes toquem no horário correto dos medicamentos',
      critical: false,
    },
    {
      key: 'canDrawOverlays' as keyof Permissions,
      icon: '📱',
      title: 'Exibir sobre outros apps',
      description: 'Permite que o alarme apareça sobre outros aplicativos',
      critical: false,
    },
    {
      key: 'isBatteryOptimizationDisabled' as keyof Permissions,
      icon: '🔋',
      title: 'Economia de bateria',
      description: 'Desativa a economia de bateria para garantir que os alarmes funcionem',
      critical: false,
    },
  ].filter(p => !permissions[p.key]);

  if (missingPermissions.length === 0) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Permissões do DoseCerta</Text>
            <Text style={styles.headerSubtitle}>
              {missingPermissions.length} {missingPermissions.length === 1 ? 'permissão pendente' : 'permissões pendentes'}
            </Text>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.cardsContainer}
            showsVerticalScrollIndicator={false}
          >
            {missingPermissions.map((perm) => (
              <PermissionCard
                key={perm.key}
                icon={perm.icon}
                title={perm.title}
                description={perm.description}
                onAllow={() => handleAllow(perm.key)}
                onDeny={handleDeny}
                critical={perm.critical}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleClose}
            >
              <Text style={styles.skipButtonText}>Pular por agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#495057',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
    paddingRight: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6C757D',
  },
  scrollView: {
    maxHeight: 500,
  },
  cardsContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  criticalCard: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FFC9C9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  criticalTitle: {
    color: '#DC3545',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 22,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  allowButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#0A7AB8',
    alignItems: 'center',
  },
  criticalButton: {
    backgroundColor: '#DC3545',
  },
  allowButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6C757D',
  },
});

export default PermissionsCards;