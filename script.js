// DOM elements
const videoContainer = document.getElementById("video-container");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const loadingIndicator = document.getElementById("loading-indicator");
const noResults = document.getElementById("no-results");
const pagination = document.getElementById("pagination");

// Store all videos
let allVideos = [];

// Create skeleton loaders for loading state
function createSkeletons(count = 8) {
  loadingIndicator.innerHTML = "";

  for (let i = 0; i < count; i++) {
    loadingIndicator.innerHTML += `
                    <div class="bg-white rounded-lg shadow-md overflow-hidden">
                        <div class="skeleton bg-gray-300 h-48 w-full"></div>
                        <div class="p-4">
                            <div class="skeleton bg-gray-300 h-4 w-3/4 mb-3 rounded"></div>
                            <div class="skeleton bg-gray-300 h-4 w-1/2 rounded"></div>
                        </div>
                    </div>
                `;
  }
}

// Map video data from API response to our format
function mapVideoData(videoObj) {
  // Check if video object and required nested properties exist
  if (
    !videoObj ||
    !videoObj.items ||
    !videoObj.items.snippet ||
    !videoObj.items.contentDetails ||
    !videoObj.items.statistics
  ) {
    console.error("Invalid video object structure:", videoObj);
    return null;
  }

  const { items } = videoObj;
  const { snippet, contentDetails, statistics } = items;

  // Extract the thumbnail with preference for higher quality
  const thumbnail =
    snippet.thumbnails.maxres?.url ||
    snippet.thumbnails.standard?.url ||
    snippet.thumbnails.high?.url ||
    snippet.thumbnails.medium?.url ||
    snippet.thumbnails.default?.url;

  return {
    id: items.id,
    title: snippet.title,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    thumbnail: thumbnail,
    duration: contentDetails.duration,
    viewCount: statistics.viewCount,
    likeCount: statistics.likeCount,
  };
}

// Process the entire API response
function processApiResponse(apiResponse) {
  if (
    !apiResponse ||
    !apiResponse.data ||
    !apiResponse.data.data ||
    !Array.isArray(apiResponse.data.data)
  ) {
    console.error("Invalid API response structure:", apiResponse);
    return [];
  }

  // Extract pagination info
  const paginationInfo = {
    currentPage: apiResponse.data.page,
    totalPages: apiResponse.data.totalPages,
    previousPage: apiResponse.data.previousPage,
    nextPage: apiResponse.data.nextPage,
    totalItems: apiResponse.data.totalItems,
  };

  // Map videos
  const videos = apiResponse.data.data
    .map((videoObj) => mapVideoData(videoObj))
    .filter((video) => video !== null); // Filter out any failed mappings

  // Update pagination UI
  updatePagination(paginationInfo);

  return videos;
}

// Fetch videos from API
async function fetchVideos(page = 1) {
  try {
    createSkeletons();
    loadingIndicator.classList.remove("hidden");
    videoContainer.classList.add("hidden");
    pagination.classList.add("hidden");

    const response = await fetch(
      `https://api.freeapi.app/api/v1/public/youtube/videos?page=${page}`
    );
    const data = await response.json();

    if (data.success) {
      allVideos = processApiResponse(data);
      displayVideos(allVideos);
    } else {
      throw new Error(
        "API request failed: " + (data.message || "Unknown error")
      );
    }
  } catch (error) {
    console.error("Error fetching videos:", error);
    loadingIndicator.innerHTML = `
                    <div class="col-span-full text-center py-10">
                        <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                        <h2 class="text-2xl font-semibold text-gray-700">Failed to load videos</h2>
                        <p class="text-gray-500 mt-2">${
                          error.message || "Please try again later"
                        }</p>
                        <button id="retry-button" class="mt-4 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
                            Retry
                        </button>
                    </div>
                `;
    document
      .getElementById("retry-button")
      .addEventListener("click", () => fetchVideos(page));
  } finally {
    loadingIndicator.classList.add("hidden");
    videoContainer.classList.remove("hidden");
    pagination.classList.remove("hidden");
  }
}

// Update pagination UI
function updatePagination(paginationInfo) {
  if (!paginationInfo) return;

  const { currentPage, totalPages, previousPage, nextPage } = paginationInfo;

  pagination.innerHTML = "";

  // Create previous button
  const prevBtn = document.createElement("button");
  prevBtn.className = `px-4 py-2 mx-1 rounded ${
    previousPage
      ? "bg-white text-gray-700 hover:bg-gray-100"
      : "bg-gray-200 text-gray-400 cursor-not-allowed"
  }`;
  prevBtn.disabled = !previousPage;
  prevBtn.innerHTML = '<i class="fas fa-chevron-left mr-1"></i> Previous';
  if (previousPage) {
    prevBtn.addEventListener("click", () => fetchVideos(currentPage - 1));
  }
  pagination.appendChild(prevBtn);

  // Create page numbers
  const pageRange = getPageRange(currentPage, totalPages);
  pageRange.forEach((page) => {
    const pageBtn = document.createElement("button");
    if (page === "...") {
      pageBtn.className = "px-4 py-2 mx-1 text-gray-700";
      pageBtn.textContent = page;
    } else {
      pageBtn.className = `px-4 py-2 mx-1 rounded ${
        page === currentPage
          ? "bg-red-600 text-white"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`;
      pageBtn.textContent = page;
      if (page !== currentPage) {
        pageBtn.addEventListener("click", () => fetchVideos(page));
      }
    }
    pagination.appendChild(pageBtn);
  });

  // Create next button
  const nextBtn = document.createElement("button");
  nextBtn.className = `px-4 py-2 mx-1 rounded ${
    nextPage
      ? "bg-white text-gray-700 hover:bg-gray-100"
      : "bg-gray-200 text-gray-400 cursor-not-allowed"
  }`;
  nextBtn.disabled = !nextPage;
  nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right ml-1"></i>';
  if (nextPage) {
    nextBtn.addEventListener("click", () => fetchVideos(currentPage + 1));
  }
  pagination.appendChild(nextBtn);
}

// Get page range for pagination
function getPageRange(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages - 1, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      2,
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

// Display videos in the container
function displayVideos(videos) {
  videoContainer.innerHTML = "";

  if (videos.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");

  videos.forEach((video) => {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const channelUrl = `https://www.youtube.com/channel/${video.channelId}`;

    const videoElement = document.createElement("div");
    videoElement.className =
      "bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-xl hover:-translate-y-1";
    videoElement.innerHTML = `
                    <a href="${videoUrl}" target="_blank" class="block">
                        <div class="relative">
                            <img 
                                src="${video.thumbnail}" 
                                alt="${video.title}" 
                                class="w-full h-48 object-cover"
                                onerror="this.onerror=null; this.src='/api/placeholder/320/180';"
                            >
                            <div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                ${formatDuration(video.duration)}
                            </div>
                        </div>
                    </a>
                    <div class="p-4">
                        <a href="${videoUrl}" target="_blank" class="block">
                            <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2 hover:text-red-600">${
                              video.title
                            }</h3>
                        </a>
                        <a href="${channelUrl}" target="_blank" class="text-sm text-gray-600 hover:text-red-600">
                            ${video.channelTitle}
                        </a>
                        <div class="flex items-center mt-2 text-xs text-gray-500">
                            <span class="mr-3">${formatViewCount(
                              video.viewCount
                            )} views</span>
                            <span>${formatPublishedTime(
                              video.publishedAt
                            )}</span>
                        </div>
                    </div>
                `;

    videoContainer.appendChild(videoElement);
  });
}

// Format video duration
function formatDuration(duration) {
  if (!duration) return "0:00";

  // Convert ISO 8601 duration to seconds
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = match[1] ? parseInt(match[1].slice(0, -1)) : 0;
  const minutes = match[2] ? parseInt(match[2].slice(0, -1)) : 0;
  const seconds = match[3] ? parseInt(match[3].slice(0, -1)) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// Format view count
function formatViewCount(viewCount) {
  if (!viewCount) return "0";

  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return count.toString();
  }
}

// Format published time
function formatPublishedTime(publishedAt) {
  if (!publishedAt) return "";

  const published = new Date(publishedAt);
  const now = new Date();
  const diffSeconds = Math.floor((now - published) / 1000);

  if (diffSeconds < 60) {
    return "Just now";
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else if (diffSeconds < 2592000) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  } else if (diffSeconds < 31536000) {
    const months = Math.floor(diffSeconds / 2592000);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = Math.floor(diffSeconds / 31536000);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
}

// Search videos
function searchVideos(query) {
  if (!query.trim()) {
    displayVideos(allVideos);
    return;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const filteredVideos = allVideos.filter(
    (video) =>
      video.title.toLowerCase().includes(normalizedQuery) ||
      video.channelTitle.toLowerCase().includes(normalizedQuery)
  );

  displayVideos(filteredVideos);
}

// Event listeners
searchButton.addEventListener("click", () => {
  searchVideos(searchInput.value);
});

searchInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    searchVideos(searchInput.value);
  }
});

// Debounce function for search input
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

// Live search as user types
searchInput.addEventListener(
  "input",
  debounce(() => {
    searchVideos(searchInput.value);
  }, 300)
);

// Initialize app
createSkeletons();
fetchVideos();
