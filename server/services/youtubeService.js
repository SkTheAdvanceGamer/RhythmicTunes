const buildYouTubeSearchUrl = (query, maxResults = 12) => {
  const params = new URLSearchParams({
    part: "snippet",
    q: `${query} official audio`,
    type: "video",
    maxResults: String(Math.min(Math.max(maxResults * 2, 1), 25)),
    key: process.env.YOUTUBE_API_KEY || "",
    videoEmbeddable: "true",
    videoCategoryId: "10",
    videoDuration: "medium",
  });

  return `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
};

const buildYouTubeVideoDetailsUrl = (ids = []) => {
  const params = new URLSearchParams({
    part: "contentDetails,snippet",
    id: ids.join(","),
    key: process.env.YOUTUBE_API_KEY || "",
  });
  return `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`;
};

const parseIsoDurationToSeconds = (iso = "") => {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

const searchYouTubeSongs = async (query, maxResults = 12) => {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is missing in server/.env");
  }

  const searchResponse = await fetch(buildYouTubeSearchUrl(query, maxResults));
  if (!searchResponse.ok) {
    throw new Error("Failed to fetch YouTube search results");
  }

  const searchData = await searchResponse.json();
  const items = Array.isArray(searchData.items) ? searchData.items : [];
  const videoIds = items
    .map((item) => item?.id?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return [];

  const detailsResponse = await fetch(buildYouTubeVideoDetailsUrl(videoIds));
  if (!detailsResponse.ok) {
    throw new Error("Failed to fetch YouTube video details");
  }

  const detailsData = await detailsResponse.json();
  const detailsById = new Map(
    (detailsData.items || []).map((item) => [item.id, item])
  );

  return items
    .map((item) => {
      const videoId = item?.id?.videoId;
      if (!videoId) return null;

      const detail = detailsById.get(videoId);
      const snippet = item.snippet || {};
      const detailSnippet = detail?.snippet || {};
      const thumbnails = snippet.thumbnails || detailSnippet.thumbnails || {};

      const coverUrl =
        thumbnails.maxres?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        "";

      const duration = parseIsoDurationToSeconds(
        detail?.contentDetails?.duration || ""
      );

      return {
        _id: `yt-${videoId}`,
        title: snippet.title || "Unknown Title",
        artistName: snippet.channelTitle || "YouTube Artist",
        coverUrl,
        youtubeVideoId: videoId,
        duration,
        source: "youtube",
      };
    })
    .filter((song) => {
      // Avoid ultra-short clips/shorts that create bad looping experience.
      return Number(song?.duration || 0) >= 90;
    })
    .sort((a, b) => {
      // Prefer exact-ish title match with the search term.
      const queryText = String(query || "").toLowerCase();
      const aTitle = String(a?.title || "").toLowerCase();
      const bTitle = String(b?.title || "").toLowerCase();
      const aScore = aTitle.includes(queryText) ? 1 : 0;
      const bScore = bTitle.includes(queryText) ? 1 : 0;
      return bScore - aScore;
    })
    .slice(0, Math.min(Math.max(maxResults, 1), 25))
    .filter(Boolean);
};

module.exports = {
  searchYouTubeSongs,
};
