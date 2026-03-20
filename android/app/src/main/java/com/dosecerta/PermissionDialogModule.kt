package com.dosecerta

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat

class PermissionDialogModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener, ActivityEventListener {

    companion object {
        private const val MODULE_NAME = "PermissionDialogModule"
        private const val TAG = "PermissionDialogModule"
        private const val PREFS_NAME = "permission_prefs"
        private const val KEY_DIALOGS_SHOWN = "dialogs_shown"
        
        // Request codes para permissões
        private const val REQUEST_POST_NOTIFICATIONS = 1001
        // REQUEST_RECORD_AUDIO (1002) removido
    }

    private var isShowingDialogs = false
    private var pendingCallback: (() -> Unit)? = null
    private var currentActivity: Activity? = null

    init {
        reactContext.addLifecycleEventListener(this)
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    override fun onHostResume() {
        // Quando o app volta ao foreground, continua verificando permissões
        if (isShowingDialogs && pendingCallback != null) {
            Log.d(TAG, "📱 App voltou ao foreground, verificando permissões...")
            Handler(Looper.getMainLooper()).postDelayed({
                currentActivity?.let { activity ->
                    showNextPermissionDialog(activity, pendingCallback!!)
                }
            }, 500)
        }
    }

    override fun onHostPause() {
        Log.d(TAG, "⏸️ App foi para background")
    }

    override fun onHostDestroy() {
        currentActivity = null
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        // Callback das permissões nativas
        if (isShowingDialogs && pendingCallback != null) {
            Log.d(TAG, "📱 Callback de permissão recebido, verificando próxima...")
            Handler(Looper.getMainLooper()).postDelayed({
                currentActivity?.let { act ->
                    showNextPermissionDialog(act, pendingCallback!!)
                }
            }, 500)
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Não precisa implementar
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    /**
     * 🎯 Verifica e exibe os diálogos de permissões na ordem correta
     */
    @ReactMethod
    fun showPermissionDialogsIfNeeded(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity não disponível")
                return
            }

            currentActivity = activity

            // Verifica se já mostrou os diálogos
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val dialogsShown = prefs.getBoolean(KEY_DIALOGS_SHOWN, false)

            if (dialogsShown) {
                Log.d(TAG, "ℹ️ Diálogos já foram exibidos anteriormente")
                promise.resolve(false)
                return
            }

            Log.d(TAG, "🎬 Iniciando cadeia de diálogos de permissões...")

            isShowingDialogs = true

            // Inicia a cadeia de diálogos
            showNextPermissionDialog(activity) {
                // Marca como mostrado após todos os diálogos
                isShowingDialogs = false
                pendingCallback = null
                prefs.edit().putBoolean(KEY_DIALOGS_SHOWN, true).apply()
                Log.d(TAG, "✅ Todos os diálogos foram exibidos e marcados como concluídos")
                promise.resolve(true)
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao exibir diálogos: ${e.message}", e)
            promise.reject("ERROR", "Erro ao exibir diálogos: ${e.message}")
        }
    }

    /**
     * 🔄 Reseta o estado dos diálogos (para testes)
     */
    @ReactMethod
    fun resetDialogsShown(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_DIALOGS_SHOWN, false).apply()
            Log.d(TAG, "🔄 Estado dos diálogos resetado")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Erro ao resetar: ${e.message}")
        }
    }

    /**
     * 📋 Exibe o próximo diálogo necessário
     */
    private fun showNextPermissionDialog(activity: Activity, onAllCompleted: () -> Unit) {
        pendingCallback = onAllCompleted
        
        Handler(Looper.getMainLooper()).post {
            try {
                // 1️⃣ Notificações (Android 13+) - DIÁLOGO NATIVO
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val hasNotificationPermission = reactApplicationContext.checkSelfPermission(
                        android.Manifest.permission.POST_NOTIFICATIONS
                    ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                    
                    if (!hasNotificationPermission) {
                        Log.d(TAG, "1️⃣ Solicitando permissão NATIVA: Notificações")
                        ActivityCompat.requestPermissions(
                            activity,
                            arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                            REQUEST_POST_NOTIFICATIONS
                        )
                        // O callback será chamado quando o usuário responder
                        return@post
                    }
                }

                // 2️⃣ Full-Screen Intent (Android 14+) - O número de ordem foi ajustado de 3 para 2.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    val notificationManager = reactApplicationContext.getSystemService(
                        Context.NOTIFICATION_SERVICE
                    ) as android.app.NotificationManager
                    
                    if (!notificationManager.canUseFullScreenIntent()) {
                        Log.d(TAG, "2️⃣ Redirecionando para: Full-Screen Intent")
                        openFullScreenIntentSettings()
                        return@post
                    }
                }

                // 3️⃣ Alarmes Exatos (Android 12+) - O número de ordem foi ajustado de 4 para 3.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val alarmManager = reactApplicationContext.getSystemService(
                        Context.ALARM_SERVICE
                    ) as android.app.AlarmManager
                    
                    if (!alarmManager.canScheduleExactAlarms()) {
                        Log.d(TAG, "3️⃣ Redirecionando para: Alarmes Exatos")
                        openExactAlarmsSettings()
                        return@post
                    }
                }

                // 4️⃣ Overlay (Exibir sobre outros apps) - O número de ordem foi ajustado de 5 para 4.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (!Settings.canDrawOverlays(reactApplicationContext)) {
                        Log.d(TAG, "4️⃣ Redirecionando para: Overlay")
                        openOverlaySettings()
                        return@post
                    }
                }

                // 5️⃣ Bateria (Desativar otimização) - O número de ordem foi ajustado de 6 para 5.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val pm = reactApplicationContext.getSystemService(
                        Context.POWER_SERVICE
                    ) as android.os.PowerManager
                    
                    if (!pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)) {
                        Log.d(TAG, "5️⃣ Redirecionando para: Bateria")
                        openBatterySettings()
                        return@post
                    }
                }

                // ✅ Todos os diálogos foram exibidos
                Log.d(TAG, "✅ Nenhuma permissão pendente")
                isShowingDialogs = false
                pendingCallback = null
                onAllCompleted()

            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao exibir diálogo: ${e.message}", e)
                isShowingDialogs = false
                pendingCallback = null
                onAllCompleted()
            }
        }
    }

    /**
     * Abre configurações de Full-Screen Intent
     */
    private fun openFullScreenIntentSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "📱 Abrindo configurações de Full-Screen Intent")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao abrir configurações: ${e.message}", e)
            // Continua mesmo se falhar
            currentActivity?.let { showNextPermissionDialog(it, pendingCallback!!) }
        }
    }

    /**
     * Abre configurações de Alarmes Exatos
     */
    private fun openExactAlarmsSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "📱 Abrindo configurações de Alarmes Exatos")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao abrir configurações: ${e.message}", e)
            currentActivity?.let { showNextPermissionDialog(it, pendingCallback!!) }
        }
    }

    /**
     * Abre configurações de Overlay
     */
    private fun openOverlaySettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "📱 Abrindo configurações de Overlay")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao abrir configurações: ${e.message}", e)
            currentActivity?.let { showNextPermissionDialog(it, pendingCallback!!) }
        }
    }

    /**
     * Abre configurações de Bateria
     */
    private fun openBatterySettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "📱 Abrindo configurações de Bateria")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao abrir configurações: ${e.message}", e)
            currentActivity?.let { showNextPermissionDialog(it, pendingCallback!!) }
        }
    }
}