package com.dosecerta

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

// ✅ IMPORTS NECESSÁRIOS:
import com.dosecerta.AppCloserPackage
import com.dosecerta.AlarmPackage // Importação adicionada
import com.dosecerta.PermissionDialogPackage // Importação adicionada

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(AlarmPackage())
          add(PermissionDialogPackage())
          add(AppCloserPackage()) // ✅ Seu novo pacote para fechar o app
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}