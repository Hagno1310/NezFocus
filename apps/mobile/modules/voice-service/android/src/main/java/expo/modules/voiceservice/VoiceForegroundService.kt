package expo.modules.voiceservice

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

// SRS 7.3.5: type microphone / camera while those permissions are granted; listening only
// (no mic permission yet) runs as mediaPlayback, since Android 14 refuses a microphone type
// without RECORD_AUDIO.
class VoiceForegroundService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(TITLE).orEmpty()
    val text = intent?.getStringExtra(TEXT).orEmpty()
    val channelName = intent?.getStringExtra(CHANNEL_NAME).orEmpty()
    val camera = intent?.getBooleanExtra(CAMERA, false) ?: false

    if (Build.VERSION.SDK_INT >= 26) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL_ID, channelName, NotificationManager.IMPORTANCE_LOW),
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)
    val tap = open?.let {
      PendingIntent.getActivity(
        this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }
    // expo-notifications puts its icon in drawable/notification_icon (app.config.ts).
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
      .takeIf { it != 0 } ?: applicationInfo.icon
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(icon)
      .setOngoing(true)
      .setSilent(true)
      .setContentIntent(tap)
      .build()

    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, types(camera))
    return START_NOT_STICKY
  }

  // The app swiped away: the room is left like a lost connection (3 minutes, VC-01).
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
  }

  private fun granted(permission: String) =
    ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

  private fun types(camera: Boolean): Int {
    if (Build.VERSION.SDK_INT < 30) return 0
    var types = 0
    if (granted(Manifest.permission.RECORD_AUDIO)) {
      types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
    }
    if (camera && granted(Manifest.permission.CAMERA)) {
      types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
    }
    return if (types == 0) ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK else types
  }

  companion object {
    const val TITLE = "title"
    const val TEXT = "text"
    const val CHANNEL_NAME = "channelName"
    const val CAMERA = "camera"
    // SRS 7.3.5: the Android channel "Phòng học đang chạy".
    const val CHANNEL_ID = "room-running"
    const val NOTIFICATION_ID = 4210
  }
}
