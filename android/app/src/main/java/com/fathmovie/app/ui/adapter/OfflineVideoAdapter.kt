package com.fathmovie.app.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.fathmovie.app.R
import com.fathmovie.app.data.DownloadedVideo

class OfflineVideoAdapter(
    private var videos: List<DownloadedVideo>,
    private val onPlayClick: (DownloadedVideo) -> Unit,
    private val onDeleteClick: (DownloadedVideo) -> Unit
) : RecyclerView.Adapter<OfflineVideoAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvOfflineTitle: TextView = view.findViewById(R.id.tvOfflineTitle)
        val tvOfflineMeta: TextView = view.findViewById(R.id.tvOfflineMeta)
        val tvOfflineDate: TextView = view.findViewById(R.id.tvOfflineDate)
        val btnOfflineDelete: ImageView = view.findViewById(R.id.btnOfflineDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_offline_video, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = videos[position]
        holder.tvOfflineTitle.text = item.title
        val isHidden = item.file.name.startsWith(".")
        val privacyLabel = if (isHidden) "🔒 Tersembunyi" else "👁 Galeri"
        val folderName = if (item.path.contains("Movies")) "Movies/FathMovie" else "Download/FathMovie"
        holder.tvOfflineMeta.text = "$privacyLabel • $folderName • ${item.sizeFormatted}"
        holder.tvOfflineDate.text = item.dateFormatted

        holder.itemView.setOnClickListener {
            onPlayClick(item)
        }

        holder.btnOfflineDelete.setOnClickListener {
            onDeleteClick(item)
        }
    }

    override fun getItemCount(): Int = videos.size

    fun updateList(newList: List<DownloadedVideo>) {
        videos = newList
        notifyDataSetChanged()
    }
}
