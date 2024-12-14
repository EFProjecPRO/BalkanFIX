const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios"); // Paket za HTTP zahteve (moraš instalirati: npm install axios)

// URL ka movies.json na serveru
const MOVIES_URL = "https://efproject.pro/GleyPro/movie/movies.json"; // Zameni s tvojim URL-om

let movies = [];

// Funkcija za preuzimanje movies.json sa servera
const fetchMovies = async () => {
    try {
        const response = await axios.get(MOVIES_URL);
        movies = response.data;
        console.log("Movies data fetched successfully!");
    } catch (error) {
        console.error("Error fetching movies.json:", error);
    }
};

// Pokreni preuzimanje movies.json prilikom pokretanja dodatka
fetchMovies();

// Definisanje manifestacije dodatka
const manifest = {
    id: "com.efprojectpro.balkanflix",
    version: "1.0.0",
    name: "BalkanFlix",
    description: "Addon with manually added movies, cartoons, and series",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
        {
            type: "movie",
            id: "custom_movies",
            name: "Gley: Filmovi",
        },
        {
            type: "movie",
            id: "custom_cartoons",
            name: "Gley: Crtani",
        },
        {
            type: "series",
            id: "custom_series",
            name: "Gley: Serije",
        },
    ],
    background: "https://i.postimg.cc/tgbg5QPW/wallpapers.jpg",
    logo: "https://i.postimg.cc/Dfp8KNk3/ic-stremio-logo.png",
};

// Kreiranje dodatka
const builder = new addonBuilder(manifest);

// Funkcija za kreiranje stream objekta
const createStream = (streamUrl) => {
    console.log("Processing stream URL:", streamUrl);  // Dodatni log za dijagnostiku

    // Provera za YouTube linkove
    if (streamUrl.includes("youtube.com") || streamUrl.includes("youtu.be")) {
        console.log("YouTube URL detected:", streamUrl);

        let videoId = null;

        // Pokušaj da izvučeš ID sa youtube.com/watch?v=VIDEO_ID ili youtu.be/VIDEO_ID
        if (streamUrl.includes("youtube.com")) {
            const match = streamUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
            if (match) {
                videoId = match[1];
            }
        } else if (streamUrl.includes("youtu.be")) {
            const match = streamUrl.split("/").pop(); // izdvaja ID nakon /
            if (match) {
                videoId = match;
            }
        }

        if (videoId) {
            console.log("Generated YouTube stream with video ID:", videoId);  // Dodatni log
            return {
                title: "Watch on YouTube",
                ytId: videoId, // povratak sa YouTube ID-om
            };
        } else {
            console.error("Invalid YouTube URL format:", streamUrl);
        }
    }

    // Ako nije YouTube, onda jednostavno vratimo drugi stream URL
    console.log("Returning stream for non-YouTube URL:", streamUrl); // Dodatni log
    return {
        title: "Watch Now",
        url: streamUrl,
    };
};

// Ruta za katalog
builder.defineCatalogHandler((args) => {
    console.log("CatalogHandler args:", args);

    if (args.type === "movie" && args.id === "custom_movies") {
        const movieMetas = movies
            .filter((m) => m.type === "movie" && !m.isCartoon)
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return Promise.resolve({ metas: movieMetas });
    }

    if (args.type === "movie" && args.id === "custom_cartoons") {
        const cartoonMetas = movies
            .filter((m) => m.type === "movie" && m.isCartoon)
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return Promise.resolve({ metas: cartoonMetas });
    }

    if (args.type === "series" && args.id === "custom_series") {
        const seriesMetas = movies
            .filter((m) => m.type === "series")
            .map((m) => ({
                id: m.id,
                type: m.type,
                name: m.name,
                poster: m.poster,
                description: m.description,
            }));
        return Promise.resolve({ metas: seriesMetas });
    }

    return Promise.resolve({ metas: [] });
});

// Ruta za strimove
builder.defineStreamHandler((args) => {
    console.log("StreamHandler args:", args);

    if (args.type === "movie") {
        const movie = movies.find((m) => m.id === args.id && m.type === "movie");
        console.log("Found movie:", movie);

        if (movie) {
            const stream = createStream(movie.stream);
            console.log("Generated stream object:", stream);

            return Promise.resolve({
                streams: [stream],
            });
        }
    }

    if (args.type === "series") {
        const [seriesId, seasonNumber, episodeId] = args.id.split(":");
        const series = movies.find((m) => m.id === seriesId && m.type === "series");
        console.log("Found series:", series);

        if (series) {
            const season = series.seasons.find(
                (s) => s.number === parseInt(seasonNumber)
            );
            console.log("Found season:", season);

            if (season) {
                const episode = season.episodes.find((e) => e.id === episodeId);
                console.log("Found episode:", episode);

                if (episode) {
                    const stream = createStream(episode.stream);
                    console.log("Generated stream object for episode:", stream);

                    return Promise.resolve({
                        streams: [stream],
                    });
                }
            }
        }
    }

    console.log("No streams found for args:", args);
    return Promise.resolve({ streams: [] });
});

// Pokretanje servera
serveHTTP(builder.getInterface(), { port: 7001 });
console.log("Addon running on http://localhost:7001");
