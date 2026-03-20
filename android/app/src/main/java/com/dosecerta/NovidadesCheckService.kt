package com.dosecerta

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * 💡 SERVIÇO HEADLESS JS
 * Responsável por iniciar o ambiente JavaScript do React Native em background
 * para executar a lógica de checagem de novidades (fetch na API).
 */
class NovidadesCheckService : HeadlessJsTaskService() {

    companion object {
        private const val TAG = "NovidadesCheckService"
        private const val SERVICE_NOTIFICATION_ID = 99998
        private const val CHANNEL_ID = "NOVIDADES_CHECK_CHANNEL"
        private const val TASK_NAME = "NovidadesCheckerTask"
    }

    /**
     * 🎯 Configura a tarefa JavaScript a ser executada
     */
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        Log.d(TAG, "⚙️ getTaskConfig() - Configurando tarefa Headless: $TASK_NAME")

        return intent?.let {
            HeadlessJsTaskConfig(
                TASK_NAME,
                Arguments.createMap().apply { 
                    putString("motivo", "periodic_check")
                },
                5000, // Tempo máximo em ms para a tarefa rodar (5 segundos)
                true // Indica que a tarefa deve tentar rodar mesmo com pouca bateria/internet
            )
        }
    }

    /**
     * 🛡️ Cria e inicia o serviço em Foreground para garantir que ele rode sem ser morto pelo sistema.
     */
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🎬 onCreate() - Iniciando Serviço de Novidades.")
        
        // Android O (API 26) ou superior exige Foreground Service para tarefas de background.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createNotificationChannel()
            
            // Notificação discreta, apenas para manter o serviço ativo
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Verificação de Novidades")
                .setContentText("O app está verificando novas postagens em segundo plano.")
                .setSmallIcon(R.drawable.ic_notification) // 💡 Ícone pequeno
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .build()
            
            startForeground(SERVICE_NOTIFICATION_ID, notification)
            Log.d(TAG, "🛡️ Serviço rodando em Foreground.")
        }
    }
    
    /**
     * 🔔 Cria o Canal de Notificação para o Serviço Foreground (Android O+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Verificação de Conteúdo"
            val descriptionText = "Notificação discreta para manter a checagem de novidades ativa em segundo plano."
            val importance = NotificationManager.IMPORTANCE_MIN
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                setShowBadge(false)
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "📢 Canal de notificação criado: $CHANNEL_ID")
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "👋 onTaskRemoved() - Parando o serviço.")
        stopSelf()
    }
}