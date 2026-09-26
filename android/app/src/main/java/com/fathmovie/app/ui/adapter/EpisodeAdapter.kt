package com.fathmovie.app.ui.adapter

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.fathmovie.app.R

class EpisodeAdapter(
    private var episodes: List<Int>,
    private var selectedEpisode: Int,
    private val onEpisodeClick: (Int) -> Unit
) : RecyclerView.Adapter<EpisodeAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val layoutEpisodeItem: LinearLayout = view.findViewById(R.id.layoutEpisodeItem)
        val tvEpisodeNumber: TextView = view.findViewById(R.id.tvEpisodeNumber)
        val tvEpisodeLabel: TextView = view.findViewById(R.id.tvEpisodeLabel)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_episode_badge, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val ep = episodes[position]
        holder.tvEpisodeNumber.text = "$ep"
        holder.tvEpisodeLabel.text = "Episode"

        val isSelected = ep == selectedEpisode
        if (isSelected) {
            holder.layoutEpisodeItem.setBackgroundResource(R.drawable.bg_ep_card_active)
            holder.tvEpisodeNumber.setTextColor(Color.WHITE)
            holder.tvEpisodeLabel.setTextColor(Color.WHITE)
        } else {
            holder.layoutEpisodeItem.setBackgroundResource(R.drawable.bg_ep_card_inactive)
            holder.tvEpisodeNumber.setTextColor(Color.parseColor("#E2E8F0"))
            holder.tvEpisodeLabel.setTextColor(Color.parseColor("#64748B"))
        }

        holder.itemView.setOnClickListener {
            if (selectedEpisode != ep) {
                val oldIndex = episodes.indexOf(selectedEpisode)
                selectedEpisode = ep
                val newIndex = holder.bindingAdapterPosition
                if (oldIndex >= 0) notifyItemChanged(oldIndex)
                if (newIndex >= 0) notifyItemChanged(newIndex)
            }
            onEpisodeClick(ep)
        }
    }

    override fun getItemCount(): Int = episodes.size

    fun updateList(newEpisodes: List<Int>, newSelectedEp: Int) {
        episodes = newEpisodes
        selectedEpisode = newSelectedEp
        notifyDataSetChanged()
    }

    fun setSelected(ep: Int) {
        if (selectedEpisode != ep) {
            val oldIndex = episodes.indexOf(selectedEpisode)
            selectedEpisode = ep
            val newIndex = episodes.indexOf(ep)
            if (oldIndex >= 0) notifyItemChanged(oldIndex)
            if (newIndex >= 0) notifyItemChanged(newIndex)
        }
    }
}
