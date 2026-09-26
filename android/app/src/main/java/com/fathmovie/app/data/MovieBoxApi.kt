package com.fathmovie.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.DecimalFormat

object MovieBoxApi {

    private const val BASE_URL = "https://h5-api.aoneroom.com/wefeed-h5api-bff"
    private const val DEFAULT_UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

    @Volatile
    private var cachedToken: String? = null
    @Volatile
    private var tokenExpiresAt: Long = 0

    suspend fun getHome(lang: String = "id"): Result<HomeData> = withContext(Dispatchers.IO) {
        runCatching {
            val url = "$BASE_URL/home"
            val headers = mapOf(
                "X-Request-Lang" to lang,
                "Origin" to "https://themoviebox.xyz",
                "Referer" to "https://themoviebox.xyz/$lang"
            )
            val json = getJson(url, headers)
            val dataObj = json.optJSONObject("data") ?: JSONObject()
            val operatingList = dataObj.optJSONArray("operatingList") ?: JSONArray()

            var heroItem: MovieItem? = null
            val categories = mutableListOf<CategorySection>()
            val seenTitles = mutableSetOf<String>()

            for (i in 0 until operatingList.length()) {
                val op = operatingList.optJSONObject(i) ?: continue
                val opType = op.optString("type")

                if (opType == "BANNER" && heroItem == null) {
                    val banners = op.optJSONArray("banners") ?: JSONArray()
                    if (banners.length() > 0) {
                        val b0 = banners.optJSONObject(0) ?: JSONObject()
                        val s0 = b0.optJSONObject("subject") ?: JSONObject()
                        val subType = s0.optInt("subjectType", b0.optInt("subjectType", 1))
                        val dur = s0.optInt("duration", 0)
                        val relDate = s0.optString("releaseDate", "")
                        val year = if (relDate.contains("-")) relDate.split("-")[0] else ""

                        heroItem = MovieItem(
                            subjectId = s0.optString("subjectId", b0.optString("subjectId", "")),
                            subjectType = subType,
                            typeLabel = parseTypeLabel(subType),
                            title = b0.optString("title", s0.optString("title", "")),
                            description = s0.optString("description", ""),
                            releaseDate = relDate,
                            year = year,
                            duration = dur,
                            durationFormatted = if (subType == 1) formatDuration(dur) else "",
                            genre = parseGenreList(s0.optString("genre")),
                            coverUrl = s0.optJSONObject("cover")?.optString("url") ?: "",
                            stillsUrl = b0.optJSONObject("image")?.optString("url")
                                ?: s0.optJSONObject("stills")?.optString("url") ?: "",
                            imdbRating = s0.optString("imdbRatingValue", "8.5"),
                            detailPath = s0.optString("detailPath", b0.optString("detailPath", ""))
                        )
                    }
                }

                if (opType == "SUBJECTS_MOVIE") {
                    val subjects = op.optJSONArray("subjects") ?: JSONArray()
                    val title = op.optString("title", "").trim()
                    if (title.isNotEmpty() && !seenTitles.contains(title) && subjects.length() > 0) {
                        seenTitles.add(title)
                        val items = mutableListOf<MovieItem>()
                        for (j in 0 until subjects.length()) {
                            val s = subjects.optJSONObject(j) ?: continue
                            items.add(parseSubjectItem(s))
                        }
                        if (items.isNotEmpty()) {
                            categories.add(CategorySection(title, items))
                        }
                    }
                }
            }

            HomeData(heroItem, categories)
        }
    }

    suspend fun getTrending(
        page: Int = 1,
        perPage: Int = 20,
        lang: String = "id"
    ): Result<List<MovieItem>> = withContext(Dispatchers.IO) {
        runCatching {
            val url = "$BASE_URL/subject/trending?page=$page&perPage=$perPage"
            val headers = mapOf(
                "X-Request-Lang" to lang,
                "Origin" to "https://themoviebox.xyz",
                "Referer" to "https://themoviebox.xyz/$lang"
            )
            val json = getJson(url, headers)
            val dataObj = json.optJSONObject("data") ?: JSONObject()
            val subjectList = dataObj.optJSONArray("subjectList") ?: JSONArray()

            val list = mutableListOf<MovieItem>()
            for (i in 0 until subjectList.length()) {
                val s = subjectList.optJSONObject(i) ?: continue
                list.add(parseSubjectItem(s))
            }
            list
        }
    }

    suspend fun search(
        keyword: String,
        page: Int = 1,
        perPage: Int = 20,
        subjectType: Int = 0,
        lang: String = "id"
    ): Result<List<MovieItem>> = withContext(Dispatchers.IO) {
        runCatching {
            val trimmed = keyword.trim()

            if (subjectType == 7) {
                val homeResult = getHome(lang).getOrNull()
                val dramas = mutableListOf<MovieItem>()
                val seenIds = mutableSetOf<String>()
                homeResult?.categories?.forEach { cat ->
                    cat.items.forEach { item ->
                        if ((item.subjectType == 7 || item.typeLabel == "Short Drama") && !seenIds.contains(item.subjectId)) {
                            if (trimmed.isEmpty() || item.title.contains(trimmed, ignoreCase = true) || item.description.contains(trimmed, ignoreCase = true)) {
                                seenIds.add(item.subjectId)
                                dramas.add(item)
                            }
                        }
                    }
                }
                return@runCatching dramas
            }

            var token = getSessionToken(false)
            val postBody = JSONObject().apply {
                put("keyword", trimmed)
                put("page", page)
                put("perPage", perPage)
                put("subjectType", subjectType)
            }.toString()

            val callApi: (String) -> JSONObject = { t ->
                val encodedKeyword = try {
                    java.net.URLEncoder.encode(trimmed, "UTF-8")
                } catch (e: Exception) {
                    trimmed
                }
                val h = mutableMapOf(
                    "Content-Type" to "application/json",
                    "Accept" to "application/json",
                    "X-Request-Lang" to lang,
                    "X-Client-Info" to JSONObject().put("timezone", "Asia/Jakarta").toString(),
                    "Origin" to "https://themoviebox.xyz",
                    "Referer" to "https://themoviebox.xyz/$lang/web/searchResult?keyword=$encodedKeyword"
                )
                if (t.isNotEmpty()) {
                    h["Authorization"] = "Bearer $t"
                    h["Cookie"] = "mb_token=" + java.net.URLEncoder.encode(JSONObject().put("token", t).toString(), "UTF-8")
                }
                postJson("$BASE_URL/subject/search", postBody, h)
            }

            val json = try {
                callApi(token)
            } catch (e: Exception) {
                token = getSessionToken(true)
                callApi(token)
            }

            val dataObj = json.optJSONObject("data")
            val itemsArr = dataObj?.optJSONArray("items") ?: json.optJSONArray("data") ?: JSONArray()
            val list = mutableListOf<MovieItem>()

            for (i in 0 until itemsArr.length()) {
                val it = itemsArr.optJSONObject(i) ?: continue
                val dur = it.optInt("duration", 0)
                val relDate = it.optString("releaseDate", "")
                val year = if (relDate.contains("-")) relDate.split("-")[0] else ""
                val subType = it.optInt("subjectType", 1)

                list.add(
                    MovieItem(
                        subjectId = it.optString("subjectId", ""),
                        subjectType = subType,
                        typeLabel = parseTypeLabel(subType),
                        title = it.optString("title", ""),
                        description = it.optString("description", ""),
                        releaseDate = relDate,
                        year = year,
                        duration = dur,
                        durationFormatted = if (subType == 1) formatDuration(dur) else "",
                        genre = parseGenreList(it.optString("genre")),
                        coverUrl = it.optJSONObject("cover")?.optString("url") ?: "",
                        imdbRating = it.optString("imdbRatingValue", "0.0"),
                        detailPath = it.optString("detailPath", ""),
                        trailerMp4 = it.optJSONObject("trailer")?.optJSONObject("videoAddress")?.optString("url") ?: "",
                        stillsUrl = it.optJSONObject("stills")?.optString("url") ?: ""
                    )
                )
            }
            list
        }
    }

    suspend fun getDetail(
        detailPath: String,
        lang: String = "id"
    ): Result<MovieDetail> = withContext(Dispatchers.IO) {
        runCatching {
            val clean = detailPath.trim().removePrefix("/").substringAfterLast("/")
            val url = "$BASE_URL/detail?detailPath=${URLEncoder.encode(clean, "UTF-8")}"
            val headers = mapOf(
                "X-Request-Lang" to lang,
                "Origin" to "https://themoviebox.xyz",
                "Referer" to "https://themoviebox.xyz/$lang"
            )
            val json = getJson(url, headers)
            val dataObj = json.optJSONObject("data") ?: JSONObject()
            val subject = dataObj.optJSONObject("subject") ?: JSONObject()
            val resource = dataObj.optJSONObject("resource") ?: JSONObject()

            val subType = subject.optInt("subjectType", 1)
            val dur = subject.optInt("duration", 0)
            val relDate = subject.optString("releaseDate", "")
            val year = if (relDate.contains("-")) relDate.split("-")[0] else ""

            val rawSeasons = resource.optJSONArray("seasons") ?: JSONArray()
            val parsedSeasons = mutableListOf<SeasonEpisodeInfo>()
            var totalEps = 0

            for (i in 0 until rawSeasons.length()) {
                val s = rawSeasons.optJSONObject(i) ?: continue
                val seNum = s.optInt("se", s.optInt("seasonNumber", i + 1))
                val maxEp = s.optInt("maxEp", s.optInt("maxEpisode", 0))

                val epList = mutableListOf<Int>()
                val allEpStr = s.optString("allEp", "")
                val allEpArr = s.optJSONArray("allEpisodes")

                if (allEpStr.isNotEmpty()) {
                    allEpStr.split(",").forEach { n -> n.trim().toIntOrNull()?.let { epList.add(it) } }
                } else if (allEpArr != null && allEpArr.length() > 0) {
                    for (k in 0 until allEpArr.length()) epList.add(allEpArr.optInt(k))
                } else if (maxEp > 0) {
                    for (k in 1..maxEp) epList.add(k)
                } else {
                    epList.add(1)
                }

                val resArr = s.optJSONArray("resolutions") ?: JSONArray()
                val resList = mutableListOf<Int>()
                for (r in 0 until resArr.length()) {
                    val rObj = resArr.opt(r)
                    if (rObj is JSONObject) resList.add(rObj.optInt("resolution", 0))
                    else (rObj as? Number)?.let { resList.add(it.toInt()) }
                }

                val count = if (maxEp > 0) maxEp else epList.size
                totalEps += count
                parsedSeasons.add(SeasonEpisodeInfo(seNum, count, epList, resList))
            }

            val rawDubs = subject.optJSONArray("dubs") ?: JSONArray()
            val dubsList = mutableListOf<DubInfo>()
            for (i in 0 until rawDubs.length()) {
                val d = rawDubs.optJSONObject(i) ?: continue
                dubsList.add(
                    DubInfo(
                        subjectId = d.optString("subjectId", ""),
                        language = d.optString("lanName", ""),
                        code = d.optString("lanCode", ""),
                        isOriginal = d.optBoolean("original", false),
                        detailPath = d.optString("detailPath", "")
                    )
                )
            }

            val rawSubsStr = subject.optString("subtitles", "")
            val subsList = if (rawSubsStr.isNotEmpty()) rawSubsStr.split(",").map { it.trim() } else emptyList()
            val trailerUrl = subject.optJSONObject("trailer")?.optJSONObject("videoAddress")?.optString("url") ?: ""

            MovieDetail(
                subjectId = subject.optString("subjectId", ""),
                subjectType = subType,
                typeLabel = parseTypeLabel(subType),
                totalEpisodes = totalEps,
                isEpisodic = subType == 2 || subType == 7,
                title = subject.optString("title", ""),
                description = subject.optString("description", ""),
                releaseDate = relDate,
                year = year,
                duration = dur,
                durationFormatted = if (subType == 1) formatDuration(dur) else "",
                genre = parseGenreList(subject.optString("genre")),
                coverUrl = subject.optJSONObject("cover")?.optString("url") ?: "",
                imdbRating = subject.optString("imdbRatingValue", "0.0"),
                imdbRatingCount = subject.optInt("imdbRatingCount", 0),
                countryName = subject.optString("countryName", ""),
                subtitles = subsList,
                trailerMp4 = trailerUrl,
                dubs = dubsList,
                seasons = parsedSeasons,
                detailPath = clean
            )
        }
    }

    suspend fun getStream(
        detailPath: String,
        subjectId: String = "",
        season: Int = 0,
        episode: Int = 0,
        lang: String = "id"
    ): Result<StreamData> = withContext(Dispatchers.IO) {
        runCatching {
            val clean = detailPath.trim().removePrefix("/").substringAfterLast("/")
            var subId = subjectId.trim()
            var isMovie = season == 0 && episode == 0
            var title = ""

            // Only fetch detail if subjectId is empty
            if (subId.isEmpty()) {
                val d = getDetail(clean, lang).getOrThrow()
                subId = d.subjectId
                isMovie = d.subjectType == 1
                title = d.title
                if (!isMovie && episode == 0 && d.seasons.isNotEmpty()) {
                    val curSe = d.seasons.find { it.seasonNumber == season } ?: d.seasons[0]
                    val se = curSe.seasonNumber
                    val ep = curSe.allEpisodes.firstOrNull() ?: 1
                    return@runCatching fetchStreamInternal(subId, clean, title, isMovie, se, ep, lang)
                }
            }

            val se = if (isMovie) 0 else season
            val ep = if (isMovie) 0 else episode

            fetchStreamInternal(subId, clean, title, isMovie, se, ep, lang)
        }
    }

    private fun fetchStreamInternal(
        subId: String,
        clean: String,
        title: String,
        isMovie: Boolean,
        season: Int,
        episode: Int,
        lang: String
    ): StreamData {
        var se = season
        var ep = episode
        var playRes = fetchPlay(subId, se, ep, clean, lang)

        if (playRes.streams.isEmpty() && (se != 0 || ep != 0)) {
            val fb0 = fetchPlay(subId, 0, 0, clean, lang)
            if (fb0.streams.isNotEmpty()) {
                playRes = fb0
                se = 0
                ep = 0
            }
        } else if (playRes.streams.isEmpty() && se == 0 && ep == 0) {
            val fb1 = fetchPlay(subId, 1, 1, clean, lang)
            if (fb1.streams.isNotEmpty()) {
                playRes = fb1
                se = 1
                ep = 1
            }
        }

        val subItems = mutableListOf<SubtitleItem>()
        val firstStreamId = playRes.streams.firstOrNull()?.id ?: ""
        if (firstStreamId.isNotEmpty() && subId.isNotEmpty()) {
            try {
                val caps = fetchCaptions(subId, firstStreamId, clean, lang)
                subItems.addAll(caps)
            } catch (e: Exception) {
                // Ignore subtitle errors
            }
        }

        val rawDash = playRes.rawDash
        val dashUrl = if (rawDash.length() > 0) rawDash.optJSONObject(0)?.optString("url") ?: "" else ""

        return StreamData(
            subjectId = subId,
            detailPath = clean,
            title = title,
            isMovie = isMovie,
            season = se,
            episode = ep,
            streams = playRes.streams,
            subtitles = subItems,
            dashUrl = dashUrl,
            hasResource = playRes.hasResource
        )
    }

    private fun fetchCaptions(
        subjectId: String,
        streamId: String,
        detailPath: String,
        lang: String
    ): List<SubtitleItem> {
        val url = "$BASE_URL/subject/caption?format=MP4&id=${URLEncoder.encode(streamId, "UTF-8")}&subjectId=${URLEncoder.encode(subjectId, "UTF-8")}&detailPath=${URLEncoder.encode(detailPath, "UTF-8")}"
        val headers = mapOf(
            "Accept" to "application/json",
            "X-Request-Lang" to lang,
            "Origin" to "https://themoviebox.xyz",
            "Referer" to "https://themoviebox.xyz/$lang/spa/videoPlayPage/movies/$detailPath"
        )
        val json = try {
            getJson(url, headers)
        } catch (e: Exception) {
            JSONObject()
        }
        val dataObj = json.optJSONObject("data") ?: JSONObject()
        val rawCaptions = dataObj.optJSONArray("captions") ?: JSONArray()
        val list = mutableListOf<SubtitleItem>()
        for (i in 0 until rawCaptions.length()) {
            val c = rawCaptions.optJSONObject(i) ?: continue
            val code = c.optString("lan", "")
            val name = c.optString("lanName", code).ifEmpty { "Subtitle" }
            val srtUrl = c.optString("url", "")
            if (srtUrl.isNotEmpty()) {
                list.add(
                    SubtitleItem(
                        id = c.optString("id", ""),
                        languageCode = code,
                        languageName = name,
                        srtUrl = srtUrl,
                        size = c.optLong("size", 0L)
                    )
                )
            }
        }
        return list
    }

    private data class InternalPlayResult(
        val streams: List<VideoStream>,
        val rawDash: JSONArray,
        val hasResource: Boolean
    )

    private fun fetchPlay(
        subjectId: String,
        se: Int,
        ep: Int,
        detailPath: String,
        lang: String
    ): InternalPlayResult {
        val playUrl = "$BASE_URL/subject/play?subjectId=${URLEncoder.encode(subjectId, "UTF-8")}&se=$se&ep=$ep&detailPath=${URLEncoder.encode(detailPath, "UTF-8")}&streamSignType=1"
        val headers = mapOf(
            "X-Request-Lang" to lang,
            "Origin" to "https://themoviebox.xyz",
            "Referer" to "https://themoviebox.xyz/$lang/spa/videoPlayPage/movies/$detailPath"
        )
        val json = try {
            getJson(playUrl, headers)
        } catch (e: Exception) {
            JSONObject()
        }

        val dataObj = json.optJSONObject("data") ?: JSONObject()
        val rawStreams = dataObj.optJSONArray("streams") ?: JSONArray()
        val rawDash = dataObj.optJSONArray("dash") ?: JSONArray()
        val hasResource = dataObj.optBoolean("hasResource", false)

        val streams = mutableListOf<VideoStream>()
        for (i in 0 until rawStreams.length()) {
            val s = rawStreams.optJSONObject(i) ?: continue
            val resNum = s.optString("resolutions", "0").toIntOrNull() ?: 0
            val sizeBytes = s.optLong("size", 0L)
            val dur = s.optInt("duration", 0)
            val quality = if (resNum > 0) "${resNum}p" else "MP4"

            streams.add(
                VideoStream(
                    format = s.optString("format", "MP4"),
                    id = s.optString("id", ""),
                    quality = quality,
                    resolution = resNum,
                    url = s.optString("url", ""),
                    size = sizeBytes,
                    sizeFormatted = formatBytes(sizeBytes),
                    duration = dur,
                    durationFormatted = formatDuration(dur),
                    codec = s.optString("codecName", "h264"),
                    vipLocked = s.optBoolean("vipLocked", false)
                )
            )
        }

        return InternalPlayResult(streams, rawDash, hasResource)
    }

    private fun getSessionToken(forceRefresh: Boolean): String {
        val now = System.currentTimeMillis()
        if (!forceRefresh && cachedToken != null && tokenExpiresAt > now + 60000) {
            return cachedToken!!
        }

        try {
            val url = URL("$BASE_URL/detail?detailPath=the-scandal-mlNU8SlJXV8")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                setRequestProperty("User-Agent", DEFAULT_UA)
                setRequestProperty("X-Request-Lang", "id")
                setRequestProperty("Origin", "https://themoviebox.xyz")
                setRequestProperty("Referer", "https://themoviebox.xyz/id")
                connectTimeout = 15000
                readTimeout = 15000
            }

            val xUser = conn.getHeaderField("x-user")
            if (!xUser.isNullOrEmpty()) {
                val uObj = JSONObject(xUser)
                val tok = uObj.optString("token")
                if (tok.isNotEmpty()) {
                    cachedToken = tok
                    tokenExpiresAt = now + 6 * 3600 * 1000
                    return tok
                }
            }

            val setCookie = conn.getHeaderField("Set-Cookie")
            if (!setCookie.isNullOrEmpty()) {
                val match = Regex("token=([^;]+)").find(setCookie)
                if (match != null) {
                    val tok = match.groupValues[1]
                    cachedToken = tok
                    tokenExpiresAt = now + 6 * 3600 * 1000
                    return tok
                }
            }
        } catch (e: Exception) {
            // ignore
        }

        return cachedToken ?: ""
    }

    private fun getJson(urlStr: String, headers: Map<String, String>): JSONObject {
        val url = URL(urlStr)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            setRequestProperty("User-Agent", DEFAULT_UA)
            setRequestProperty("Accept", "application/json")
            headers.forEach { (k, v) -> setRequestProperty(k, v) }
            connectTimeout = 20000
            readTimeout = 20000
        }

        val code = conn.responseCode
        if (code !in 200..299) throw Exception("HTTP Request failed with status $code")
        val response = conn.inputStream.bufferedReader().use { it.readText() }
        return JSONObject(response)
    }

    private fun postJson(urlStr: String, jsonBody: String, headers: Map<String, String>): JSONObject {
        val url = URL(urlStr)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("User-Agent", DEFAULT_UA)
            setRequestProperty("Accept", "application/json")
            headers.forEach { (k, v) -> setRequestProperty(k, v) }
            connectTimeout = 20000
            readTimeout = 20000
        }

        conn.outputStream.use { os ->
            OutputStreamWriter(os, "UTF-8").use { osw ->
                osw.write(jsonBody)
                osw.flush()
            }
        }

        val code = conn.responseCode
        if (code !in 200..299) throw Exception("HTTP POST Request failed with status $code")
        val response = conn.inputStream.bufferedReader().use { it.readText() }
        return JSONObject(response)
    }

    private fun parseSubjectItem(s: JSONObject): MovieItem {
        val subType = s.optInt("subjectType", 1)
        val dur = s.optInt("duration", 0)
        val relDate = s.optString("releaseDate", "")
        val year = if (relDate.contains("-")) relDate.split("-")[0] else ""

        return MovieItem(
            subjectId = s.optString("subjectId", ""),
            subjectType = subType,
            typeLabel = parseTypeLabel(subType),
            title = s.optString("title", ""),
            description = s.optString("description", ""),
            releaseDate = relDate,
            year = year,
            duration = dur,
            durationFormatted = if (subType == 1) formatDuration(dur) else "",
            genre = parseGenreList(s.optString("genre")),
            coverUrl = s.optJSONObject("cover")?.optString("url") ?: "",
            imdbRating = s.optString("imdbRatingValue", "0.0"),
            detailPath = s.optString("detailPath", ""),
            trailerMp4 = s.optJSONObject("trailer")?.optJSONObject("videoAddress")?.optString("url") ?: "",
            stillsUrl = s.optJSONObject("stills")?.optString("url") ?: ""
        )
    }

    private fun parseTypeLabel(subType: Int): String = when (subType) {
        2 -> "Series"
        7 -> "Short Drama"
        else -> "Movie"
    }

    private fun parseGenreList(genreStr: String?): List<String> {
        if (genreStr.isNullOrEmpty()) return emptyList()
        return genreStr.split(",").map { it.trim() }.filter { it.isNotEmpty() }
    }

    private fun formatDuration(seconds: Int): String {
        if (seconds <= 0) return ""
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        return if (h > 0) "${h} jam ${m} mnt" else "${m} mnt"
    }

    private fun formatBytes(bytes: Long): String {
        if (bytes <= 0) return "0 B"
        val sizes = arrayOf("B", "KB", "MB", "GB", "TB")
        val i = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
        val num = bytes / Math.pow(1024.0, i.toDouble())
        return "${DecimalFormat("#.#").format(num)} ${sizes[i]}"
    }
}
