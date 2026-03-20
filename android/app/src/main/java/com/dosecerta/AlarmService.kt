package com.dosecerta

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat

class AlarmService : Service() {

    companion object {
        private const val TAG = "AlarmService"
        private const val CHANNEL_ID = "ALARM_CRITICAL_CHANNEL"
        private const val NOTIFICATION_ID = 99999

        @Volatile
        private var isServiceRunning = false

        fun startAlarmService(
            context: Context,
            medicamentoId: Int,
            medicamento: String,
            paciente: String,
            dosagem: String,
            horario: String,
            frequencia: String,
            dataInicio: String,
            duracao: String,
            notas: String,
            som: Boolean,
            tipoSom: String,
            vibracao: Boolean,
            notificacaoVisual: Boolean
        ) {
            Log.d(TAG, "🎬 startAlarmService() chamado - ID: $medicamentoId")

            val intent = Intent(context, AlarmService::class.java).apply {
                action = "START_ALARM"
                putExtra("medicamentoId", medicamentoId)
                putExtra("medicamento", medicamento)
                putExtra("paciente", paciente)
                putExtra("dosagem", dosagem)
                putExtra("horario", horario)
                putExtra("frequencia", frequencia)
                putExtra("dataInicio", dataInicio)
                putExtra("duracao", duracao)
                putExtra("notas", notas)
                putExtra("som", som)
                putExtra("tipoSom", tipoSom)
                putExtra("vibracao", vibracao)
                putExtra("notificacaoVisual", notificacaoVisual)
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                    Log.d(TAG, "✅ startForegroundService() executado (Android 8+)")
                } else {
                    context.startService(intent)
                    Log.d(TAG, "✅ startService() executado (Android < 8)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ ERRO CRÍTICO ao iniciar serviço: ${e.message}", e)
            }
        }

        fun stopAlarmService(context: Context) {
            Log.d(TAG, "🛑 stopAlarmService() chamado")
            try {
                val intent = Intent(context, AlarmService::class.java)
                context.stopService(intent)
                isServiceRunning = false
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao parar serviço: ${e.message}", e)
            }
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var notificationManager: NotificationManager? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🔧 onCreate() - Serviço sendo criado")

        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
        acquireWakeLock()

        isServiceRunning = true
        Log.d(TAG, "✅ Serviço criado com sucesso")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "🚀 onStartCommand() - flags: $flags, startId: $startId")

        // ========================================
        // 🚨 CRÍTICO: Iniciar Foreground IMEDIATAMENTE
        // ========================================
        try {
            // 🆕 Notificação SILENCIOSA (sem som/vibração)
            val dummyNotification = createSilentNotification()
            startForeground(NOTIFICATION_ID, dummyNotification)
            Log.d(TAG, "✅ Foreground iniciado com notificação SILENCIOSA")
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao iniciar Foreground: ${e.message}", e)
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent == null) {
            Log.e(TAG, "❌ Intent é NULL! Mantendo serviço vivo...")
            return START_STICKY
        }

        val action = intent.action
        Log.d(TAG, "📋 Action recebida: $action")

        if (action == "START_ALARM") {
            handleAlarmStart(intent)
        } else {
            Log.w(TAG, "⚠️ Action desconhecida ou nula")
        }

        return START_STICKY
    }

    /**
     * 🎯 Processa o início do alarme
     */
    private fun handleAlarmStart(intent: Intent) {
        try {
            val medicamentoId = intent.getIntExtra("medicamentoId", -1)
            val medicamento = intent.getStringExtra("medicamento") ?: "Medicamento"
            val horario = intent.getStringExtra("horario") ?: "Horário"

            Log.d(TAG, "📋 Dados do alarme: ID=$medicamentoId, Med=$medicamento, Horário=$horario")

            // ========================================
            // 🔥 ESTRATÉGIA: ABRIR ACTIVITY DIRETAMENTE
            // ========================================
            Log.d(TAG, "🔥 ABRINDO AlarmActivity DIRETAMENTE (SEM NOTIFICAÇÃO)")
            
            if (!openAlarmActivityDirectly(intent)) {
                Log.e(TAG, "❌ Falha ao abrir Activity diretamente!")
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao processar alarme: ${e.message}", e)
        }
    }

    /**
     * 🔥 FUNÇÃO PRINCIPAL: Abre AlarmActivity diretamente
     */
    private fun openAlarmActivityDirectly(serviceIntent: Intent): Boolean {
        return try {
            Log.d(TAG, "🚀 Abrindo AlarmActivity diretamente...")
            
            val activityIntent = Intent(this, AlarmActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
                addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK)
                }
                
                // Copiar TODOS os dados
                putExtra("medicamentoId", serviceIntent.getIntExtra("medicamentoId", -1))
                putExtra("medicamento", serviceIntent.getStringExtra("medicamento"))
                putExtra("paciente", serviceIntent.getStringExtra("paciente"))
                putExtra("dosagem", serviceIntent.getStringExtra("dosagem"))
                putExtra("horario", serviceIntent.getStringExtra("horario"))
                putExtra("frequencia", serviceIntent.getStringExtra("frequencia"))
                putExtra("dataInicio", serviceIntent.getStringExtra("dataInicio"))
                putExtra("duracao", serviceIntent.getStringExtra("duracao"))
                putExtra("notas", serviceIntent.getStringExtra("notas"))
                // 🔥 CRÍTICO: Passar as configurações de som/vibração da Intent (que foram atualizadas no reagendamento)
                putExtra("som", serviceIntent.getBooleanExtra("som", true))
                putExtra("tipoSom", serviceIntent.getStringExtra("tipoSom"))
                putExtra("vibracao", serviceIntent.getBooleanExtra("vibracao", true))
                putExtra("notificacaoVisual", serviceIntent.getBooleanExtra("notificacaoVisual", true))
                
                putExtra("FROM_SERVICE", true)
            }
            
            startActivity(activityIntent)
            Log.d(TAG, "✅ AlarmActivity aberta diretamente (SEM NOTIFICAÇÃO)")
            
            // 🆕 REMOVE A NOTIFICAÇÃO SILENCIOSA APÓS ABRIR A ACTIVITY
            try {
                notificationManager?.cancel(NOTIFICATION_ID)
                Log.d(TAG, "✅ Notificação foreground removida")
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Erro ao remover notificação: ${e.message}")
            }
            
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ ERRO ao abrir AlarmActivity: ${e.message}", e)
            e.printStackTrace()
            false
        }
    }

    /**
     * 🔇 Cria notificação SILENCIOSA para manter foreground
     * (Necessária para Android 8+, mas removida após abrir a activity)
     */
    private fun createSilentNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏰ Processando alarme...")
            .setContentText("Abrindo lembrete de medicamento")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_LOW) // 🆕 PRIORIDADE BAIXA
            .setCategory(NotificationCompat.CATEGORY_SERVICE) // 🆕 CATEGORIA: SERVIÇO
            .setOngoing(false) // 🆕 NÃO É "ONGOING"
            .setSound(null) // 🆕 SEM SOM
            .setVibrate(null) // 🆕 SEM VIBRAÇÃO
            .setAutoCancel(true) // 🆕 AUTO-CANCELÁVEL
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Processamento de Alarmes",
                NotificationManager.IMPORTANCE_LOW // 🆕 IMPORTÂNCIA BAIXA
            ).apply {
                description = "Notificação temporária para processamento"
                setShowBadge(false) // 🆕 NÃO MOSTRAR BADGE
                lockscreenVisibility = Notification.VISIBILITY_SECRET // 🆕 NÃO MOSTRAR NA TELA DE BLOQUEIO
                setSound(null, null) // 🆕 SEM SOM
                enableVibration(false) // 🆕 SEM VIBRAÇÃO
            }
            notificationManager?.createNotificationChannel(channel)
            Log.d(TAG, "📢 Canal de notificação SILENCIOSO criado")
        }
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DoseCerta::AlarmServiceWakeLock"
            )
            wakeLock?.acquire(15 * 60 * 1000L)
            Log.d(TAG, "🔋 Wake Lock PARCIAL adquirido (15 min)")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao adquirir Wake Lock: ${e.message}", e)
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
            wakeLock = null
            Log.d(TAG, "🔓 Wake Lock liberado")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao liberar Wake Lock: ${e.message}", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "💀 onDestroy() - Serviço sendo destruído")

        releaseWakeLock()
        isServiceRunning = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }

        Log.d(TAG, "🛑 Serviço destruído completamente")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "📱 App removido da lista de recentes - serviço continua ativo")
    }
}