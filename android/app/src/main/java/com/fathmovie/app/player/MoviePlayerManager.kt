package com.fathmovie.app.player

import android.content.Context
import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.source.MediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource

@UnstableApi
object MoviePlayerManager {

    private const val DEFAULT_USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    fun getStreamHeaders(): Map<String, String> {
        return mapOf(
            "Referer" to "https://themoviebox.xyz/",
            "Origin" to "https://themoviebox.xyz",
            "Accept" to "*/*",
            "Accept-Language" to "en-US,en;q=0.9,id;q=0.8",
            "Sec-Fetch-Dest" to "video",
            "Sec-Fetch-Mode" to "cors",
            "Sec-Fetch-Site" to "cross-site"
        )
    }

    fun buildDataSourceFactory(context: Context): DefaultDataSource.Factory {
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(DEFAULT_USER_AGENT)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(20000)
            .setReadTimeoutMs(30000)
            .setDefaultRequestProperties(getStreamHeaders())

        return DefaultDataSource.Factory(context, httpDataSourceFactory)
    }

    fun createPlayer(
        context: Context,
        onStateChanged: ((isLoading: Boolean, isPlaying: Boolean) -> Unit)? = null,
        onError: ((error: PlaybackException) -> Unit)? = null
    ): ExoPlayer {
        val dataSourceFactory = buildDataSourceFactory(context)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(15000, 50000, 1500, 3000)
            .build()

        val player = ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .setLoadControl(loadControl)
            .build()

        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                val isLoading = playbackState == Player.STATE_BUFFERING
                onStateChanged?.invoke(isLoading, player.isPlaying)
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                onStateChanged?.invoke(player.playbackState == Player.STATE_BUFFERING, isPlaying)
            }

            override fun onPlayerError(error: PlaybackException) {
                onError?.invoke(error)
            }
        })

        return player
    }

    fun playVideo(
        context: Context,
        player: ExoPlayer,
        videoUrl: String,
        subtitleUrl: String? = null,
        startPositionMs: Long = 0L,
        autoPlay: Boolean = true
    ) {
        if (videoUrl.isBlank()) return

        try {
            val mediaItemBuilder = MediaItem.Builder()
                .setUri(videoUrl)

            if (!subtitleUrl.isNullOrEmpty()) {
                val isVtt = subtitleUrl.contains(".vtt", ignoreCase = true)
                val subMime = if (isVtt) MimeTypes.TEXT_VTT else MimeTypes.APPLICATION_SUBRIP

                val subtitleConfig = MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitleUrl))
                    .setMimeType(subMime)
                    .setLanguage("id")
                    .setLabel("Bahasa Indonesia")
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                    .build()

                mediaItemBuilder.setSubtitleConfigurations(listOf(subtitleConfig))
            }

            val mediaItem = mediaItemBuilder.build()
            player.setMediaItem(mediaItem, startPositionMs)
            player.prepare()
            if (autoPlay) {
                player.play()
            }
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    fun switchResolution(
        context: Context,
        player: ExoPlayer,
        newVideoUrl: String,
        subtitleUrl: String? = null
    ) {
        if (newVideoUrl.isBlank()) return
        try {
            val currentPos = player.currentPosition
            val isCurrentlyPlaying = player.isPlaying
            playVideo(
                context = context,
                player = player,
                videoUrl = newVideoUrl,
                subtitleUrl = subtitleUrl,
                startPositionMs = currentPos,
                autoPlay = isCurrentlyPlaying
            )
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    fun playLocalVideo(
        player: ExoPlayer,
        filePath: String,
        autoPlay: Boolean = true
    ) {
        if (filePath.isBlank()) return
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) return
            val fileUri = Uri.fromFile(file)
            val mediaItem = MediaItem.fromUri(fileUri)
            player.setMediaItem(mediaItem)
            player.prepare()
            if (autoPlay) {
                player.play()
            }
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }
}
