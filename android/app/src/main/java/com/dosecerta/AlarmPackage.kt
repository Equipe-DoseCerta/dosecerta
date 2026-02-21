package com.dosecerta

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * 📦 PACOTE DE ALARMES
 * 
 * Registra o módulo nativo AlarmModule no React Native.
 * Este arquivo é necessário para que o JavaScript possa
 * chamar funções nativas através do NativeModules.
 */
class AlarmPackage : ReactPackage {

    /**
     * 🔌 Cria e retorna lista de módulos nativos
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmModule(reactContext))
    }

    /**
     * 🎨 Retorna lista de ViewManagers (não usado neste caso)
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}