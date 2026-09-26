package com.fathmovie.app.data

data class MovieItem(
    val subjectId: String,
    val subjectType: Int, // 1: Movie, 2: Series, 7: Short Drama
    val typeLabel: String,
    val title: String,
    val description: String,
    val releaseDate: String,
    val year: String,
    val duration: Int,
    val durationFormatted: String,
    val genre: List<String>,
    val coverUrl: String,
    val imdbRating: String,
    val detailPath: String,
    val trailerMp4: String = "",
    val stillsUrl: String = ""
)

data class HomeData(
    val heroItem: MovieItem?,
    val categories: List<CategorySection>
)

data class CategorySection(
    val title: String,
    val items: List<MovieItem>
)

data class SeasonEpisodeInfo(
    val seasonNumber: Int,
    val maxEpisode: Int,
    val allEpisodes: List<Int>,
    val resolutions: List<Int>
)

data class DubInfo(
    val subjectId: String,
    val language: String,
    val code: String,
    val isOriginal: Boolean,
    val detailPath: String
)

data class MovieDetail(
    val subjectId: String,
    val subjectType: Int,
    val typeLabel: String,
    val totalEpisodes: Int,
    val isEpisodic: Boolean,
    val title: String,
    val description: String,
    val releaseDate: String,
    val year: String,
    val duration: Int,
    val durationFormatted: String,
    val genre: List<String>,
    val coverUrl: String,
    val imdbRating: String,
    val imdbRatingCount: Int,
    val countryName: String,
    val subtitles: List<String>,
    val trailerMp4: String,
    val dubs: List<DubInfo>,
    val seasons: List<SeasonEpisodeInfo>,
    val detailPath: String
)

data class VideoStream(
    val format: String,
    val id: String,
    val quality: String, // "360p", "480p", "720p", "1080p"
    val resolution: Int,
    val url: String, // Direct playable Alibaba Cloud CDN URL
    val size: Long,
    val sizeFormatted: String,
    val duration: Int,
    val durationFormatted: String,
    val codec: String,
    val vipLocked: Boolean
)

data class SubtitleItem(
    val id: String,
    val languageCode: String,
    val languageName: String,
    val srtUrl: String,
    val size: Long
)

data class StreamData(
    val subjectId: String,
    val detailPath: String,
    val title: String,
    val isMovie: Boolean,
    val season: Int,
    val episode: Int,
    val streams: List<VideoStream>,
    val subtitles: List<SubtitleItem>,
    val dashUrl: String,
    val hasResource: Boolean
)
