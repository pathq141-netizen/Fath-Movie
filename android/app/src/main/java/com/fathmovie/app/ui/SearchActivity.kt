package com.fathmovie.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.fathmovie.app.R
import com.fathmovie.app.data.MovieBoxApi
import com.fathmovie.app.ui.adapter.MovieCardAdapter
import kotlinx.coroutines.launch

class SearchActivity : AppCompatActivity() {

    private lateinit var btnSearchBack: ImageView
    private lateinit var etSearchQuery: EditText
    private lateinit var btnSearchSubmit: ImageView
    private lateinit var searchProgressBar: ProgressBar
    private lateinit var rvSearchResults: RecyclerView
    private lateinit var tvEmptySearch: TextView

    // Filter pills
    private lateinit var searchTabAll: TextView
    private lateinit var searchTabMovies: TextView
    private lateinit var searchTabSeries: TextView
    private lateinit var searchTabDrama: TextView

    private var currentType: Int = 0 // 0: All, 1: Movie, 2: Series, 7: Short Drama
    private var movieAdapter: com.fathmovie.app.ui.adapter.SearchCardAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_search)

        initViews()
        setupListeners()

        val initialQuery = intent.getStringExtra("EXTRA_QUERY") ?: ""
        if (initialQuery.isNotEmpty()) {
            etSearchQuery.setText(initialQuery)
            performSearch()
        }
    }

    private fun initViews() {
        btnSearchBack = findViewById(R.id.btnSearchBack)
        etSearchQuery = findViewById(R.id.etSearchQuery)
        btnSearchSubmit = findViewById(R.id.btnSearchSubmit)
        searchProgressBar = findViewById(R.id.searchProgressBar)
        rvSearchResults = findViewById(R.id.rvSearchResults)
        tvEmptySearch = findViewById(R.id.tvEmptySearch)

        searchTabAll = findViewById(R.id.searchTabAll)
        searchTabMovies = findViewById(R.id.searchTabMovies)
        searchTabSeries = findViewById(R.id.searchTabSeries)
        searchTabDrama = findViewById(R.id.searchTabDrama)

        rvSearchResults.layoutManager = GridLayoutManager(this, 3)
        movieAdapter = com.fathmovie.app.ui.adapter.SearchCardAdapter(emptyList()) { movie ->
            val intent = Intent(this, DetailActivity::class.java).apply {
                putExtra("EXTRA_DETAIL_PATH", movie.detailPath)
            }
            startActivity(intent)
            overridePendingTransition(R.anim.slide_in_right, R.anim.slide_out_left)
        }
        rvSearchResults.adapter = movieAdapter
    }

    private fun setupListeners() {
        btnSearchBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
        }

        btnSearchSubmit.setOnClickListener {
            performSearch()
        }

        etSearchQuery.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                performSearch()
                true
            } else {
                false
            }
        }

        searchTabAll.setOnClickListener { selectType(0) }
        searchTabMovies.setOnClickListener { selectType(1) }
        searchTabSeries.setOnClickListener { selectType(2) }
        searchTabDrama.setOnClickListener { selectType(7) }
    }

    private fun selectType(type: Int) {
        currentType = type
        resetPills()

        when (type) {
            0 -> searchTabAll.setBackgroundResource(R.drawable.bg_pill_active)
            1 -> searchTabMovies.setBackgroundResource(R.drawable.bg_pill_active)
            2 -> searchTabSeries.setBackgroundResource(R.drawable.bg_pill_active)
            7 -> searchTabDrama.setBackgroundResource(R.drawable.bg_pill_active)
        }

        if (etSearchQuery.text.toString().trim().isNotEmpty()) {
            performSearch()
        }
    }

    private fun resetPills() {
        val inactive = R.drawable.bg_pill_inactive
        searchTabAll.setBackgroundResource(inactive)
        searchTabMovies.setBackgroundResource(inactive)
        searchTabSeries.setBackgroundResource(inactive)
        searchTabDrama.setBackgroundResource(inactive)
    }

    private fun performSearch() {
        val query = etSearchQuery.text.toString().trim()
        if (query.isEmpty()) return

        searchProgressBar.visibility = View.VISIBLE
        tvEmptySearch.visibility = View.GONE

        lifecycleScope.launch {
            val result = MovieBoxApi.search(
                keyword = query,
                page = 1,
                perPage = 30,
                subjectType = currentType,
                lang = "id"
            )
            searchProgressBar.visibility = View.GONE

            result.onSuccess { list ->
                if (list.isEmpty()) {
                    tvEmptySearch.text = "Tidak ada hasil untuk \"$query\""
                    tvEmptySearch.visibility = View.VISIBLE
                    movieAdapter?.updateData(emptyList())
                } else {
                    tvEmptySearch.visibility = View.GONE
                    movieAdapter?.updateData(list)
                }
            }.onFailure { err ->
                Toast.makeText(this@SearchActivity, "Gagal mencari: ${err.message}", Toast.LENGTH_SHORT).show()
                tvEmptySearch.text = "Gagal memuat pencarian: ${err.message}"
                tvEmptySearch.visibility = View.VISIBLE
            }
        }
    }
}
