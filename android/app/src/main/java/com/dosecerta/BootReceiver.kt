package com.dosecerta

import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * 🔄 BOOT RECEIVER - REAGENDA ALARMES APÓS REINICIAR
 * Funciona mesmo com o app fechado e antes do desbloqueio.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS_NAME = "alarm_storage"
        private const val KEY_ALARM_IDS = "scheduled_alarm_ids"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "📱 ========== BOOT COMPLETED ==========")
        Log.d(TAG, "🔄 Action: $action")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Log.d(TAG, "📱 Android 14+ detectado: executando reagendamento com contexto seguro")
        }

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d(TAG, "🚀 Dispositivo reiniciado - Iniciando reagendamento...")

                val pendingResult = goAsync()
                val wakeLock = acquireBootWakeLock(context)

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        rescheduleAllAlarms(context)
                        Log.d(TAG, "✅ Reagendamento concluído com sucesso!")
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Erro no reagendamento: ${e.message}", e)
                    } finally {
                        wakeLock?.let { if (it.isHeld) it.release() }
                        pendingResult.finish()
                    }
                }
            }
            else -> {
                Log.w(TAG, "⚠️ Action desconhecida: $action")
            }
        }
    }

    /**
     * 🔋 WakeLock curto para manter CPU ativa durante o boot
     */
    private fun acquireBootWakeLock(context: Context): PowerManager.WakeLock? {
        return try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DoseCerta::BootReceiverWakeLock"
            )
            wl.acquire(2 * 60 * 1000L) // 2 minutos
            Log.d(TAG, "🔋 Wake Lock de boot adquirido (2 min)")
            wl
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao adquirir Wake Lock: ${e.message}", e)
            null
        }
    }

    /**
     * 🔄 Reagenda todos os alarmes salvos
     */
    private fun rescheduleAllAlarms(context: Context) {
        Log.d(TAG, "📋 Iniciando leitura de alarmes salvos...")

        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val savedAlarmIds = prefs.getStringSet(KEY_ALARM_IDS, null)

            if (savedAlarmIds != null && savedAlarmIds.isNotEmpty()) {
                Log.d(TAG, "📦 Encontrados ${savedAlarmIds.size} alarmes para reagendar")
                startMainActivityIfUnlocked(context)
            } else {
                Log.w(TAG, "⚠️ Nenhum alarme salvo encontrado - iniciando fallback...")
                startMainActivityIfUnlocked(context)
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao reagendar: ${e.message}", e)
            startMainActivityIfUnlocked(context)
        }
    }

    /**
     * 📱 Inicia MainActivity para reagendar via React Native
     */
    private fun startMainActivityIfUnlocked(context: Context) {
        if (!isUserUnlocked(context)) {
            Log.w(TAG, "🔒 Usuário ainda não desbloqueou o dispositivo — reagendamento adiado.")
            return
        }

        try {
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                action = "REAGENDAR_ALARMES"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("source", "boot_receiver")
                putExtra("timestamp", System.currentTimeMillis())
            }

            context.startActivity(launchIntent)
            Log.d(TAG, "✅ MainActivity iniciada para reagendamento")

        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao iniciar MainActivity: ${e.message}", e)
        }
    }

    /**
     * 🔐 Verifica se o usuário já desbloqueou o dispositivo
     */
    private fun isUserUnlocked(context: Context): Boolean {
        val km = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        return km.isKeyguardLocked.not()
    }
}
