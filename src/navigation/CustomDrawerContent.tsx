import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Alert,
  Animated,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchImageLibrary,
  ImagePickerResponse,
} from 'react-native-image-picker';
import DeviceInfo from 'react-native-device-info';
import { openCamera } from '../utils/CameraUtils';
import BadgeService from '../services/badgeService';

import { abrirLojaApp } from '../services/avalieService';
import { compartilharApp, divulgarNasRedes } from '../services/compartilharService';
import { UpdateService } from '../services/UpdateService';

interface MenuItem {
  label: string;
  icon: string;
  screenKey: string;
  onPress: () => void;
}

interface MenuGroup {
  title: string;
  icon: string;
  key: string;
  items: MenuItem[];
}

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = ({
  navigation,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState('Usuário');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempUserName, setTempUserName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [appVersion, setAppVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkAppUpdate = async () => {
      try {
        const result = await UpdateService.check();
        if (result.available) {
          setUpdateAvailable(true);
        } else {
          setUpdateAvailable(false);
        }
      } catch (err) {
        setUpdateAvailable(false);
      }
    };
    checkAppUpdate();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    Animated.spring(badgeScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [unreadCounts, badgeScale]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) setUserName(storedName);
        const storedAvatar = await AsyncStorage.getItem('userAvatar');
        if (storedAvatar) setAvatarUri(storedAvatar);
        await loadUnreadCounts();
      } catch (error) {
        console.warn('Erro ao carregar dados do usuário:', error);
      }
    };

    const loadVersion = () => {
      const version = DeviceInfo.getVersion();
      setAppVersion(version);
    };

    loadUserData();
    loadVersion();
  }, []);

  const loadUnreadCounts = async () => {
    try {
      const counts = await BadgeService.getUnreadCounts();
      setUnreadCounts(counts);
    } catch (error) {
      console.warn('Erro ao carregar notificações:', error);
    }
  };

  const markAsRead = async (screenKey: string) => {
    try {
      await BadgeService.clearUnread(screenKey);
      const updated = { ...unreadCounts, [screenKey]: 0 };
      setUnreadCounts(updated);
    } catch (error) {
      console.warn('Erro ao marcar como lida:', error);
    }
  };

  const formatName = (name: string) =>
    name
      .split(' ')
      .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');

  const startEditingName = () => {
    setTempUserName(userName);
    setIsEditingName(true);
  };

  const saveUserName = async () => {
    const trimmed = tempUserName.trim();
    if (trimmed.length > 0) {
      const formatted = formatName(trimmed);
      setUserName(formatted);
      await AsyncStorage.setItem('userName', formatted);
    }
    setIsEditingName(false);
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert('Erro', 'Não foi possível processar a imagem.');
      return;
    }
    if (response.assets && response.assets.length > 0) {
      const imageUri = response.assets[0].uri;
      if (imageUri) {
        try {
          setAvatarUri(imageUri);
          await AsyncStorage.setItem('userAvatar', imageUri);
        } catch {
          Alert.alert('Erro', 'Não foi possível salvar a imagem.');
        }
      }
    }
  };

  const handleOpenCamera = () => openCamera(handleImageResponse);
  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
  };

  const pickImage = () => {
    Alert.alert('Foto de Perfil', 'Escolha uma opção:', [
      { text: 'Câmera', onPress: handleOpenCamera },
      { text: 'Galeria', onPress: openGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const navigateTo = (screenName: string, screenKey: string) => {
    markAsRead(screenKey);
    navigation.closeDrawer();
    // @ts-ignore
    navigation.navigate('MainStack', { screen: screenName });
  };

  const performAfterClose = (fn: () => Promise<void> | void, delay = 220) => {
    navigation.closeDrawer();
    setTimeout(() => {
      try {
        const ret = fn();
        if (ret && typeof (ret as any).catch === 'function') {
          (ret as Promise<void>).catch(console.error);
        }
      } catch (e) {
        console.error(e);
      }
    }, delay);
  };

  const handleAvaliePress = () => performAfterClose(() => abrirLojaApp());
  const handleEnviarAppPress = () => performAfterClose(() => compartilharApp());
  const handleRedesSociaisPress = () => performAfterClose(() => divulgarNasRedes());

  const handleHomePress = () => {
    navigation.closeDrawer();
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('MainStack', { screen: 'Home' });
    }, 220);
  };

  const getGroupUnreadCount = (group: MenuGroup): number =>
    group.items.reduce((sum, item) => sum + (unreadCounts[item.screenKey] || 0), 0);

  // ==========================================
  // MENU — Vídeos Educativos, Áudios e Guia de Remédios removidos
  // para conformidade com as políticas do Google Play.
  // Estas funcionalidades serão reintroduzidas futuramente
  // quando a conta for migrada para organização.
  // ==========================================
  const menuGroups: MenuGroup[] = [
    {
      title: 'Conteúdo & Notícias',
      icon: '📰',
      key: 'conteudo',
      items: [
        {
          label: 'Mural de Notícias',
          icon: '🗞️',
          screenKey: 'mural',
          onPress: () => navigateTo('Mural', 'mural'),
        },
      ],
    },
    {
      title: 'Compartilhar',
      icon: '🔗',
      key: 'compartilhar',
      items: [
        {
          label: 'Recomendar o DoseCerta',
          icon: '🤝',
          screenKey: 'enviarApp',
          onPress: handleEnviarAppPress,
        },
        {
          label: 'Publicar nas Redes',
          icon: '📢',
          screenKey: 'redesSociais',
          onPress: handleRedesSociaisPress,
        },
      ],
    },
    {
      title: 'Preferências',
      icon: '⚙️',
      key: 'preferencias',
      items: [
        {
          label: 'Alarmes',
          icon: '⏰',
          screenKey: 'alarmes',
          onPress: () => navigateTo('PreferenciasAlarmes', 'alarmes'),
        },
        {
          label: 'Backup & Restauração',
          icon: '💾',
          screenKey: 'backup',
          onPress: () => navigateTo('PreferenciasBackup', 'backup'),
        },
      ],
    },
    {
      title: 'Suporte',
      icon: '🆘',
      key: 'suporte',
      items: [
        {
          label: 'Ajuda',
          icon: '❓',
          screenKey: 'ajuda',
          onPress: () => navigateTo('Ajuda', 'ajuda'),
        },
        {
          label: 'Termos de Uso',
          icon: '📄',
          screenKey: 'termos',
          onPress: () => navigateTo('TermosDeUso', 'termos'),
        },
        {
          label: 'Privacidade (LGPD)',
          icon: '🔒',
          screenKey: 'lgpd',
          onPress: () => navigateTo('LGPD', 'lgpd'),
        },
        {
          label: 'Sobre o App',
          icon: 'ℹ️',
          screenKey: 'sobre',
          onPress: () => navigateTo('Sobre', 'sobre'),
        },
        {
          label: 'Avaliar o DoseCerta',
          icon: '⭐',
          screenKey: 'avalie',
          onPress: handleAvaliePress,
        },
      ],
    },
  ];

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  const renderBadge = (count: number, style?: 'title' | 'subtitle') => {
    if (!count) return null;
    const isTitle = style === 'title';
    return (
      <Animated.View
        style={[
          isTitle ? styles.titleBadge : styles.subtitleBadge,
          { transform: [{ scale: badgeScale }] },
        ]}
      >
        <Text style={isTitle ? styles.titleBadgeText : styles.subtitleBadgeText}>
          {count > 99 ? '99+' : count}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A7AB8', '#054F77']} style={styles.gradientBackground}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.topButtonsRow}>
              <TouchableOpacity onPress={handleHomePress} style={styles.homeButton}>
                <Text style={styles.homeIcon}>🏠</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.closeDrawer()} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✖️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.nameContainer}>
                {isEditingName ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.nameInput}
                      value={tempUserName}
                      onChangeText={setTempUserName}
                      autoFocus
                      onSubmitEditing={saveUserName}
                      placeholder="Digite seu nome"
                      placeholderTextColor="#ffffff80"
                    />
                    <TouchableOpacity onPress={saveUserName} style={styles.saveButton}>
                      <Text style={styles.saveIcon}>✔️</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.nameRow}>
                    <Text style={styles.greetingText}>Olá,</Text>
                    <Text style={styles.userName}>{userName}! 👋</Text>
                    <TouchableOpacity onPress={startEditingName} style={styles.editButton}>
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          <View style={styles.divider} />

          <ScrollView style={styles.menuScrollView} contentContainerStyle={styles.menuContent}>
            {menuGroups.map((group, index) => {
              const groupUnreadCount = getGroupUnreadCount(group);

              return (
                <Animated.View
                  key={group.key}
                  style={[styles.menuGroupContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
                >
                  <TouchableOpacity
                    style={styles.menuGroupHeader}
                    onPress={() => setOpenMenu(prev => (prev === group.key ? null : group.key))}
                  >
                    <View style={styles.menuGroupTitleContainer}>
                      <View style={styles.iconCircle}>
                        <Text style={styles.menuGroupIcon}>{group.icon}</Text>
                      </View>
                      <Text style={styles.menuGroupTitle}>{group.title}</Text>
                      {renderBadge(groupUnreadCount, 'title')}
                    </View>
                    <Text style={styles.chevronIcon}>
                      {openMenu === group.key ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {openMenu === group.key && (
                    <View style={styles.subItemsContainer}>
                      {group.items.map((item, subIndex) => {
                        const itemUnreadCount = unreadCounts[item.screenKey] || 0;
                        const isLoading = false;

                        return (
                          <TouchableOpacity
                            key={`${group.key}-${subIndex}`}
                            style={styles.subItem}
                            onPress={item.onPress}
                            disabled={isLoading}
                          >
                            <Text style={styles.subItemIcon}>{item.icon}</Text>
                            <Text style={styles.subItemText}>
                              {item.label}
                              {isLoading ? ' ...' : ''}
                            </Text>
                            {renderBadge(itemUnreadCount, 'subtitle')}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {index < menuGroups.length - 1 && <View style={styles.groupSeparator} />}
                </Animated.View>
              );
            })}

            <TouchableOpacity onPress={() => {
              Alert.alert('Fechar aplicativo', 'Deseja realmente fechar o app?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sim', onPress: () => BackHandler.exitApp() },
              ]);
            }} style={styles.exitButton}>
              <Text style={styles.exitIcon}>🚪</Text>
              <Text style={styles.exitText}>Sair do App</Text>
            </TouchableOpacity>

            <View style={styles.versionContainer}>
              {updateAvailable ? (
                <TouchableOpacity
                  onPress={() => UpdateService.openStore()}
                  style={styles.updateButton}
                  activeOpacity={0.8}
                >
                  <View style={styles.updateContent}>
                    <Text style={styles.updateIcon}>🚀</Text>
                    <View style={styles.updateTextContainer}>
                      <Text style={styles.updateTitle}>Atualização Disponível</Text>
                      <Text style={styles.updateSubtitle}>Toque para atualizar agora</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.versionInfo}>
                  <Text style={styles.versionText}>Versão {appVersion}</Text>
                  <Text style={styles.copyrightText}>© DoseCerta {new Date().getFullYear()}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBackground: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  topButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  homeButton: { padding: 8 },
  homeIcon: { fontSize: 20, color: '#FFFFFF' },
  closeButton: { padding: 8 },
  closeIcon: { fontSize: 20, color: '#FFFFFF' },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: { fontSize: 12 },
  nameContainer: { flex: 1, marginLeft: 15 },
  nameRow: { flexDirection: 'column' },
  greetingText: { color: '#FFFFFF', fontSize: 14, opacity: 0.9 },
  userName: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  editButton: { position: 'absolute', right: 0, top: 0, padding: 5 },
  editIcon: { fontSize: 16, top: 25 },
  editContainer: { flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
    paddingVertical: 5,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIcon: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  menuScrollView: { flex: 1 },
  menuContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 30 },
  menuGroupContainer: { marginBottom: 5 },
  menuGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuGroupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuGroupIcon: { fontSize: 20 },
  menuGroupTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  chevronIcon: { color: '#FFFFFF', fontSize: 14, opacity: 0.8 },
  subItemsContainer: {
    marginTop: 5,
    marginLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    paddingLeft: 10,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  subItemIcon: { fontSize: 18, marginRight: 10 },
  subItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.95,
    flex: 1,
  },
  titleBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  titleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtitleBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  subtitleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
    marginHorizontal: 10,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exitIcon: { fontSize: 22, marginRight: 10 },
  exitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  versionContainer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  versionInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  versionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  copyrightText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  updateButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  updateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  updateTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  updateTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  updateSubtitle: {
    color: '#FFFFFF',
    fontSize: 11,
    opacity: 0.9,
  },
});

export default CustomDrawerContent;
