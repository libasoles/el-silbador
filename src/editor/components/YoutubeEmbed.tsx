import { extractYoutubeVideoId } from "../youtubeUrl";

interface YoutubeEmbedProps {
  url: string;
}

/** Renders the YouTube link an admin attached to a song (see App.tsx's action-toolbar button) as
 *  an embedded player. Nothing is shown for a URL that no longer resolves to a video id, rather
 *  than passing an untrusted string straight into an iframe `src`. */
export function YoutubeEmbed({ url }: YoutubeEmbedProps) {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  return (
    <div className="youtube-embed">
      <iframe
        className="youtube-embed__frame"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="Video de YouTube"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
