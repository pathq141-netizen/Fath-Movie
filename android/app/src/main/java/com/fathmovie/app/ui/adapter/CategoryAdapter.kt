package com.fathmovie.app.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.fathmovie.app.R
import com.fathmovie.app.data.CategorySection
import com.fathmovie.app.data.MovieItem

class CategoryAdapter(
    private var categories: List<CategorySection>,
    private val onMovieClick: (MovieItem) -> Unit
) : RecyclerView.Adapter<CategoryAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvCategoryTitle: TextView = view.findViewById(R.id.tvCategoryTitle)
        val rvHorizontalMovies: RecyclerView = view.findViewById(R.id.rvHorizontalMovies)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_category_row, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val cat = categories[position]
        holder.tvCategoryTitle.text = cat.title

        val layoutManager = LinearLayoutManager(holder.itemView.context, LinearLayoutManager.HORIZONTAL, false)
        holder.rvHorizontalMovies.layoutManager = layoutManager

        val movieAdapter = MovieCardAdapter(cat.items, onMovieClick)
        holder.rvHorizontalMovies.adapter = movieAdapter
    }

    override fun getItemCount(): Int = categories.size

    fun updateData(newCategories: List<CategorySection>) {
        categories = newCategories
        notifyDataSetChanged()
    }
}
