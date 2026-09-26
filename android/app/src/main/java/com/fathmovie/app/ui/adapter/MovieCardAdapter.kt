package com.fathmovie.app.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.fathmovie.app.R
import com.fathmovie.app.data.MovieItem

class MovieCardAdapter(
    private var movies: List<MovieItem>,
    private val onMovieClick: (MovieItem) -> Unit
) : RecyclerView.Adapter<MovieCardAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ivPoster: ImageView = view.findViewById(R.id.ivPoster)
        val tvRating: TextView = view.findViewById(R.id.tvRating)
        val tvType: TextView = view.findViewById(R.id.tvType)
        val tvTitle: TextView = view.findViewById(R.id.tvTitle)
        val tvSubtitle: TextView = view.findViewById(R.id.tvSubtitle)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_movie_card, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val movie = movies[position]

        holder.tvTitle.text = movie.title
        holder.tvSubtitle.text = if (movie.year.isNotEmpty()) movie.year else movie.typeLabel

        val ratingVal = movie.imdbRating.toDoubleOrNull() ?: 0.0
        if (ratingVal > 0) {
            holder.tvRating.visibility = View.VISIBLE
            holder.tvRating.text = "★ ${movie.imdbRating}"
        } else {
            holder.tvRating.visibility = View.GONE
        }

        when (movie.subjectType) {
            2 -> {
                holder.tvType.text = "SERIES"
                holder.tvType.setBackgroundResource(R.drawable.bg_badge_series)
            }
            7 -> {
                holder.tvType.text = "DRAMA"
                holder.tvType.setBackgroundResource(R.drawable.bg_badge_drama)
            }
            else -> {
                holder.tvType.text = "MOVIE"
                holder.tvType.setBackgroundResource(R.drawable.bg_badge_movie)
            }
        }

        Glide.with(holder.itemView.context)
            .load(movie.coverUrl)
            .transition(DrawableTransitionOptions.withCrossFade())
            .placeholder(R.drawable.bg_card_rounded)
            .error(R.drawable.bg_card_rounded)
            .into(holder.ivPoster)

        holder.itemView.setOnClickListener {
            onMovieClick(movie)
        }
    }

    override fun getItemCount(): Int = movies.size

    fun updateData(newMovies: List<MovieItem>) {
        movies = newMovies
        notifyDataSetChanged()
    }
}
