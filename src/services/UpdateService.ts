// src/services/UpdateService.ts

import { Platform, Linking } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG = {
  USE_MOCK_DATA: true,

  PLAY_STORE_URL: 'market://details?id=com.dosecerta',
  PLAY_STORE_WEB_URL: 'https://play.google.com/store/apps/details?id=com.dosecerta',

  STORAGE_KEY_LAST_CHECK: '@update_last_check',
  STORAGE_KEY_DISMISSED_VERSION: '@update_dismissed_version',
  STORAGE_KEY_REMIND_LATER: '@update_remind_later',

  CHECK_INTERVAL_HOURS: 24,
  REMIND_LATER_HOURS: 12,
};

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  required?: boolean;
  releaseNotes?: string;
}

export class UpdateService {
  static checkUpdate() {
    throw new Error('Method not implemented.');
  }

  // ======================================================
  // 🔎 VERIFICAR UPDATE
  // ======================================================
  static async check(): Promise<UpdateInfo> {
    const currentVersion = DeviceInfo.getVersion();

    const shouldCheck = await this.shouldCheck();
    if (!shouldCheck) {
      return {
        available: false,
        currentVersion,
        latestVersion: currentVersion,
      };
    }

    // MOCK PARA TESTES
    if (CONFIG.USE_MOCK_DATA) {

      const mock = {
        version: '1.5.0',   // <<< ALTERE AQUI
        required: false,
        releaseNotes:
          '• Melhorias de desempenho\n' +
          '• Correções de bugs\n' +
          '• Ajustes no sistema de notificações',
      };

      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEY_LAST_CHECK,
        new Date().toISOString()
      );

      const hasUpdate =
        this.compare(currentVersion, mock.version) < 0;

      return {
        available: hasUpdate,
        currentVersion,
        latestVersion: mock.version,
        required: mock.required,
        releaseNotes: mock.releaseNotes,
      };
    }

    // 🔴 aqui entrará sua API real depois
    return {
      available: false,
      currentVersion,
      latestVersion: currentVersion,
    };
  }

  // ======================================================
  // 🚨 MOSTRAR MODAL (USA SEU ModalContext)
  // ======================================================
  static async run(showModal: any) {

    const result = await this.check();

    if (!result.available) return;

    const shouldShow = await this.shouldShow(result.latestVersion, result.required);
    if (!shouldShow) return;

    // UPDATE OBRIGATÓRIO
    if (result.required) {
      showModal({
        type: 'warning',
        title: 'Atualização necessária',
        message:
          `Nova versão disponível (${result.latestVersion}).\n\n` +
          (result.releaseNotes || ''),
        confirmText: 'Atualizar',
        onConfirm: () => this.openStore(),
      });
      return;
    }

    // UPDATE OPCIONAL
    showModal({
      type: 'confirmation',
      title: 'Nova versão disponível',
      message:
        `Versão ${result.latestVersion} disponível.\n\n` +
        (result.releaseNotes || ''),
      confirmText: 'Atualizar',
      cancelText: 'Depois',
      onConfirm: () => this.openStore(),
      onCancel: () => this.remindLater(result.latestVersion),
    });
  }

  // ======================================================
  // 🏪 ABRIR LOJA
  // ======================================================
  static async openStore() {
    let url = CONFIG.PLAY_STORE_URL;

    if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) url = CONFIG.PLAY_STORE_WEB_URL;
    }

    Linking.openURL(url);
  }

  // ======================================================
  // ⏰ LEMBRAR DEPOIS
  // ======================================================
  static async remindLater(version: string) {
    const time = new Date();
    time.setHours(time.getHours() + CONFIG.REMIND_LATER_HOURS);

    await AsyncStorage.setItem(
      CONFIG.STORAGE_KEY_REMIND_LATER,
      JSON.stringify({
        version,
        remindAt: time.toISOString(),
      })
    );
  }

  // ======================================================
  // 🔕 DISPENSAR
  // ======================================================
  static async dismiss(version: string) {
    await AsyncStorage.setItem(
      CONFIG.STORAGE_KEY_DISMISSED_VERSION,
      version
    );
  }

  // ======================================================
  // 📌 REGRAS DE EXIBIÇÃO
  // ======================================================
  private static async shouldShow(version: string, required?: boolean) {

    if (required) return true;

    const dismissed = await AsyncStorage.getItem(
      CONFIG.STORAGE_KEY_DISMISSED_VERSION
    );
    if (dismissed === version) return false;

    const remindData = await AsyncStorage.getItem(
      CONFIG.STORAGE_KEY_REMIND_LATER
    );

    if (remindData) {
      const { version: v, remindAt } = JSON.parse(remindData);
      if (v === version && new Date() < new Date(remindAt)) {
        return false;
      }
    }

    return true;
  }

  private static async shouldCheck() {
    const last = await AsyncStorage.getItem(
      CONFIG.STORAGE_KEY_LAST_CHECK
    );
    if (!last) return true;

    const hours =
      (Date.now() - new Date(last).getTime()) / 3600000;

    return hours >= CONFIG.CHECK_INTERVAL_HOURS;
  }

  // ======================================================
  // 📊 COMPARAR VERSÕES
  // ======================================================
  private static compare(v1: string, v2: string) {
    const a = v1.split('.').map(Number);
    const b = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const diff = (a[i] || 0) - (b[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}

export default UpdateService;