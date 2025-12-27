// CameraUtils.ts

import { Alert, Linking, Platform, PermissionsAndroid } from 'react-native';
import { launchCamera, ImagePickerResponse } from 'react-native-image-picker'; // Importa ImagePickerResponse

// Tipagem corrigida para handleImageResponse
export const openCamera = async (handleImageResponse: (response: ImagePickerResponse) => void) => {
  if (Platform.OS === 'android') {
    try {
      const checkPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);

      if (checkPermission) {
        launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
        return;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Permissão de Câmera',
          message: 'O app precisa de acesso à câmera para tirar fotos.',
          buttonNeutral: 'Apenas esta vez',
          buttonNegative: 'Não permitir',
          buttonPositive: 'Permitir',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED || result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResponse);
      } else {
        Alert.alert(
          'Permissão Negada',
          'Você negou o acesso à câmera. Para usar a câmera, vá em Configurações do dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir para Configurações', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (err) {
      console.warn('Erro ao solicitar permissão de câmera:', err);
      Alert.alert('Erro', 'Não foi possível acessar a câmera.');
    }
  } else {
    launchCamera({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.errorCode === 'camera_unavailable') {
        Alert.alert('Erro', 'Câmera não disponível neste dispositivo.');
      } else if (response.errorCode === 'permission') {
        Alert.alert(
          'Permissão Negada',
          'Você negou o acesso à câmera. Para usar a câmera, vá em Ajustes > [Seu App] > Câmera.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        handleImageResponse(response);
      }
    });
  }
};