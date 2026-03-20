package com.dosecerta

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * 🔄 BOOT RECEIVER - REAGENDA ALARMES APÓS REINICIALIZAÇÃO
 * 
 * Funciona em:
 * ✅ Reinicialização completa (BOOT_COMPLETED)
 * ✅ Boot direto criptografado (LOCKED_BOOT_COMPLETED)
 * ✅ Quick boot (alguns fabricantes)
 * ✅ Atualização do app (MY_PACKAGE_REPLACED)
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "📡 ========== BOOT RECEIVER ACIONADO ==========")
        Log.d(TAG, "🔔 Action recebida: ${intent.action}")

        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> {
                Log.d(TAG, "🔄 Sistema reiniciado completamente")
                handleBootCompleted(context)
            }
            
            Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                Log.d(TAG, "🔒 Boot direto criptografado")
                handleBootCompleted(context)
            }
            
            "android.intent.action.QUICKBOOT_POWERON" -> {
                Log.d(TAG, "⚡ Quick boot detectado")
                handleBootCompleted(context)
            }
            
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d(TAG, "📦 Aplicativo atualizado")
                handleBootCompleted(context)
            }
            
            else -> {
                Log.w(TAG, "⚠️ Action desconhecida: ${intent.action}")
            }
        }
    }

    /**
     * 🔄 Processa o boot completo
     */
    private fun handleBootCompleted(context: Context) {
        try {
            Log.d(TAG, "🎬 Iniciando reagendamento de alarmes...")

            // ========================================
            // 1️⃣ REAGENDAR ALARMES DE MEDICAMENTOS
            // ========================================
            val rnIntent = Intent("REAGENDAR_ALARMES")
            context.sendBroadcast(rnIntent)
            Log.d(TAG, "✅ Broadcast REAGENDAR_ALARMES enviado para React Native")

            // ========================================
            // 2️⃣ 🆕 REAGENDAR CHECAGEM DE NOVIDADES
            // ========================================
            reagendarNovidadesCheck(context)

            Log.d(TAG, "🎉 ========== REAGENDAMENTO CONCLUÍDO ==========")
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro no reagendamento: ${e.message}", e)
            e.printStackTrace()
        }
    }

    /**
     * 🆕 Reagenda a checagem de novidades se estava ativa
     */
    private fun reagendarNovidadesCheck(context: Context) {
        try {
            Log.d(TAG, "🔍 Verificando se havia checagem de novidades ativa...")
            
            // Lê as preferências salvas
            val prefs = context.getSharedPreferences("novidades_check_prefs", Context.MODE_PRIVATE)
            val intervalo = prefs.getInt("intervalo_horas", 0)
            
            if (intervalo > 0) {
                Log.d(TAG, "✅ Checagem ativa encontrada: $intervalo horas")
                Log.d(TAG, "🔄 Reagendando checagem de novidades...")
                
                // Cria o Intent com a action correta
                val intent = Intent(context, AlarmReceiver::class.java).apply {
                    action = "com.dosecerta.CHECK_NOVIDADES"
                }
                
                val pendingIntent = android.app.PendingIntent.getBroadcast(
                    context,
                    200000, // Mesmo ID usado no AlarmModule
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or 
                    android.app.PendingIntent.FLAG_IMMUTABLE
                )
                
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                val intervaloMs = intervalo * 3600 * 1000L
                val primeiraChecagem = System.currentTimeMillis() + (60 * 1000L) // 1 minuto
                
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    alarmManager.setInexactRepeating(
                        android.app.AlarmManager.RTC_WAKEUP,
                        primeiraChecagem,
                        intervaloMs,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Checagem reagendada (INEXACT REPEATING)")
                } else {
                    alarmManager.setRepeating(
                        android.app.AlarmManager.RTC_WAKEUP,
                        primeiraChecagem,
                        intervaloMs,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Checagem reagendada (REPEATING)")
                }
                
                // Atualiza o timestamp do último agendamento
                prefs.edit()
                    .putLong("ultimo_agendamento", System.currentTimeMillis())
                    .apply()
                
                Log.d(TAG, "🎉 Checagem de novidades reagendada com sucesso!")
                
            } else {
                Log.d(TAG, "ℹ️ Nenhuma checagem de novidades estava ativa")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao reagendar checagem de novidades: ${e.message}", e)
            e.printStackTrace()
        }
    }
}