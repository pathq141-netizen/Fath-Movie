package com.fathmovie.app.data

import android.Manifest
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class DownloadedVideo(
    val title: String,
    val file: File,
    val path: String,
    val sizeFormatted: String,
    val dateFormatted: String,
    val storageLocation: String
)

object OfflineDownloadManager {

    const val PREFS_NAME = "movienas_offline_prefs"
    const val KEY_STORAGE_PATH = "offline_storage_folder"
    const val KEY_SHOW_IN_GALLERY = "offline_show_in_gallery"

    const val PATH_MOVIES = "/storage/emulated/0/Movies/FathMovie"
    const val PATH_DOWNLOAD = "/storage/emulated/0/Download/FathMovie"

    fun getPreferredStorageFolder(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_STORAGE_PATH, PATH_MOVIES) ?: PATH_MOVIES
    }

    fun setPreferredStorageFolder(context: Context, path: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_STORAGE_PATH, path).apply()
    }

    fun isShowInGallery(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_SHOW_IN_GALLERY, true)
    }

    fun setShowInGallery(context: Context, show: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_SHOW_IN_GALLERY, show).apply()
    }

    fun hasStoragePermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager() ||
                    (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_VIDEO) == PackageManager.PERMISSION_GRANTED) ||
                    (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED)
        } else {
            (ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) &&
                    (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED)
        }
    }

    fun requestStoragePermission(activity: Activity, requestCode: Int = 1001) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                        data = Uri.parse("package:${activity.packageName}")
                    }
                    activity.startActivity(intent)
                    Toast.makeText(activity, "Izinkan Akses Semua Berkas untuk FathMovie", Toast.LENGTH_LONG).show()
                    return
                } catch (e: Exception) {
                    try {
                        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                        activity.startActivity(intent)
                        return
                    } catch (e2: Exception) {
                        // fallback below
                    }
                }
            }
        }

        val permissions = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        ActivityCompat.requestPermissions(activity, permissions.toTypedArray(), requestCode)
    }

    fun formatFileSize(bytes: Long): String {
        if (bytes <= 0) return "0 B"
        val units = arrayOf("B", "KB", "MB", "GB", "TB")
        val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
        return String.format(Locale.US, "%.1f %s", bytes / Math.pow(1024.0, digitGroups.toDouble()), units[digitGroups])
    }

    fun startDownload(
        context: Context,
        videoUrl: String,
        movieTitle: String,
        quality: String,
        targetPath: String = getPreferredStorageFolder(context)
    ): Long {
        val isDownloadDir = targetPath.contains("Download", ignoreCase = true)
        val showInGallery = isShowInGallery(context)
        val cleanTitle = movieTitle.replace("[^a-zA-Z0-9.-]".toRegex(), "_")
        val baseFileName = "${cleanTitle}_${quality}.mp4"
        val fileName = if (showInGallery) baseFileName else ".$baseFileName"

        try {
            // Ensure target directory exists
            val folderFile = if (isDownloadDir) {
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "FathMovie")
            } else {
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "FathMovie")
            }
            if (!folderFile.exists()) {
                folderFile.mkdirs()
            }

            // If user prefers hidden, ensure .nomedia exists in that folder
            if (!showInGallery) {
                try {
                    val nomedia = File(folderFile, ".nomedia")
                    if (!nomedia.exists()) nomedia.createNewFile()
                } catch (_: Exception) {}
            }

            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val uri = Uri.parse(videoUrl)
            val request = DownloadManager.Request(uri).apply {
                setTitle(movieTitle)
                val targetLabel = if (isDownloadDir) "Download/FathMovie" else "Movies/FathMovie"
                val galleryNote = if (showInGallery) "(Galeri)" else "(Tersembunyi)"
                setDescription("Mengunduh kualitas $quality ke $targetLabel $galleryNote")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)

                if (isDownloadDir) {
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "FathMovie/$fileName")
                } else {
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_MOVIES, "FathMovie/$fileName")
                }

                addRequestHeader("Referer", "https://themoviebox.xyz/")
                addRequestHeader("Origin", "https://themoviebox.xyz")
                addRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            }

            val id = downloadManager.enqueue(request)
            val displayPath = if (isDownloadDir) PATH_DOWNLOAD else PATH_MOVIES
            val infoMsg = if (showInGallery) {
                "Mulai mengunduh ke: $displayPath (terlihat di galeri)"
            } else {
                "Mulai mengunduh ke: $displayPath (tersembunyi dari galeri)"
            }
            Toast.makeText(context, infoMsg, Toast.LENGTH_LONG).show()
            return id
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal memulai unduhan: ${e.message}", Toast.LENGTH_LONG).show()
            return -1L
        }
    }

    fun batchSetGalleryVisibility(context: Context, showInGallery: Boolean): Int {
        var count = 0
        val folders = listOf(
            File(PATH_MOVIES),
            File(PATH_DOWNLOAD),
            File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "FathMovie"),
            File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "FathMovie")
        ).distinctBy { it.absolutePath }

        val scannedPaths = mutableListOf<String>()

        for (folder in folders) {
            if (folder.exists() && folder.isDirectory) {
                val nomediaFile = File(folder, ".nomedia")
                if (!showInGallery) {
                    try { if (!nomediaFile.exists()) nomediaFile.createNewFile() } catch (_: Exception) {}
                } else {
                    try { if (nomediaFile.exists()) nomediaFile.delete() } catch (_: Exception) {}
                }

                val files = folder.listFiles() ?: continue
                for (file in files) {
                    if (!file.isFile) continue
                    val name = file.name
                    if (name.equals(".nomedia", ignoreCase = true)) continue
                    if (!name.endsWith(".mp4", ignoreCase = true) && !name.endsWith(".mkv", ignoreCase = true)) continue

                    val isCurrentlyHidden = name.startsWith(".")
                    if (!showInGallery && !isCurrentlyHidden) {
                        val newFile = File(folder, ".$name")
                        if (file.renameTo(newFile)) {
                            count++
                            scannedPaths.add(file.absolutePath)
                            scannedPaths.add(newFile.absolutePath)
                        }
                    } else if (showInGallery && isCurrentlyHidden) {
                        val cleanName = name.removePrefix(".")
                        val newFile = File(folder, cleanName)
                        if (file.renameTo(newFile)) {
                            count++
                            scannedPaths.add(file.absolutePath)
                            scannedPaths.add(newFile.absolutePath)
                        }
                    }
                }
            }
        }

        if (scannedPaths.isNotEmpty()) {
            try {
                android.media.MediaScannerConnection.scanFile(
                    context,
                    scannedPaths.toTypedArray(),
                    null,
                    null
                )
            } catch (_: Exception) {}
        }

        setShowInGallery(context, showInGallery)
        return count
    }

    fun getDownloadedVideos(): List<DownloadedVideo> {
        val list = mutableListOf<DownloadedVideo>()
        val folders = listOf(
            Pair(File(PATH_MOVIES), PATH_MOVIES),
            Pair(File(PATH_DOWNLOAD), PATH_DOWNLOAD),
            Pair(File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "FathMovie"), PATH_MOVIES),
            Pair(File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "FathMovie"), PATH_DOWNLOAD)
        ).distinctBy { it.first.absolutePath }

        val dateFormat = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
        val processedPaths = mutableSetOf<String>()

        for ((folder, displayLocation) in folders) {
            if (folder.exists() && folder.isDirectory) {
                val files = folder.listFiles { file ->
                    file.isFile && (
                        file.name.endsWith(".mp4", ignoreCase = true) ||
                        file.name.endsWith(".mkv", ignoreCase = true)
                    )
                } ?: emptyArray()

                for (f in files) {
                    if (processedPaths.add(f.absolutePath)) {
                        val cleanName = f.nameWithoutExtension.removePrefix(".").replace("_", " ").trim()
                        val dateStr = dateFormat.format(Date(f.lastModified()))
                        list.add(
                            DownloadedVideo(
                                title = if (cleanName.isNotEmpty()) cleanName else f.name,
                                file = f,
                                path = f.absolutePath,
                                sizeFormatted = formatFileSize(f.length()),
                                dateFormatted = dateStr,
                                storageLocation = displayLocation
                            )
                        )
                    }
                }
            }
        }

        return list.sortedByDescending { it.file.lastModified() }
    }

    fun deleteDownloadedVideo(video: DownloadedVideo): Boolean {
        return try {
            if (video.file.exists()) {
                video.file.delete()
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }
}
