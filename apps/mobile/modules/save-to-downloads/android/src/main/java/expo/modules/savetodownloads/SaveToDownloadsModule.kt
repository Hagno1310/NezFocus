package expo.modules.savetodownloads

import android.content.ContentValues
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// S-HOME-11 "Tải về" (CR-28 #29): copies a file the app already has into the phone's Download
// folder. Android 10+ goes through MediaStore (no permission; a taken name gets " (1)").
class SaveToDownloadsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SaveToDownloads")

    AsyncFunction("save") { fileUri: String, name: String, mimeType: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val resolver = context.contentResolver
      val source = Uri.parse(fileUri)
      val input = resolver.openInputStream(source)
        ?: throw CodedException("ERR_SAVE_SOURCE", "Cannot read $fileUri", null)
      input.use { from ->
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, name)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
            put(MediaStore.Downloads.IS_PENDING, 1)
          }
          val item = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw CodedException("ERR_SAVE_TARGET", "MediaStore refused $name", null)
          resolver.openOutputStream(item)?.use { to -> from.copyTo(to) }
            ?: throw CodedException("ERR_SAVE_TARGET", "Cannot write $name", null)
          values.clear()
          values.put(MediaStore.Downloads.IS_PENDING, 0)
          resolver.update(item, values, null, null)
        } else {
          @Suppress("DEPRECATION")
          val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          dir.mkdirs()
          val dot = name.lastIndexOf('.')
          val base = if (dot > 0) name.substring(0, dot) else name
          val ext = if (dot > 0) name.substring(dot) else ""
          var target = File(dir, name)
          var n = 1
          while (target.exists()) target = File(dir, "$base (${n++})$ext")
          target.outputStream().use { to -> from.copyTo(to) }
          MediaScannerConnection.scanFile(context, arrayOf(target.absolutePath), arrayOf(mimeType), null)
        }
      }
    }
  }
}
