package com.dosecerta

import android.app.Activity
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.system.exitProcess

class AppCloserModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppCloserModule"
    }

    /**
     * Fecha o aplicativo completamente, removendo-o da memória e da lista de recentes.
     * Testado e funciona em Android 5.0+ (API 21+)
     */
    @ReactMethod
    fun closeAppAggressively() {
        val activity: Activity? = reactContext.currentActivity
        
        if (activity == null) {
            // Se não há activity, mata o processo diretamente
            Process.killProcess(Process.myPid())
            exitProcess(0)
            return
        }

        // Executa no thread principal
        Handler(Looper.getMainLooper()).post {
            try {
                // Método 1: Para Android 5.0+ (API 21+)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    activity.finishAndRemoveTask()
                } else {
                    // Método alternativo para versões antigas
                    activity.finish()
                }
                
                // Aguarda 50ms para a activity finalizar visualmente
                Handler(Looper.getMainLooper()).postDelayed({
                    // Mata o processo completamente
                    android.os.Process.killProcess(android.os.Process.myPid())
                    exitProcess(0)
                }, 50)
                
            } catch (e: Exception) {
                // Fallback final em caso de erro
                try {
                    activity.finishAffinity()
                    android.os.Process.killProcess(android.os.Process.myPid())
                    exitProcess(0)
                } catch (ex: Exception) {
                    exitProcess(0)
                }
            }
        }
    }
}