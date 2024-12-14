const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fs = require("fs");

// Učitavanje podataka iz JSON fajla
const movies = JSON.parse(fs.readFileSync("movies.json", "utf8"));

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
            name: "Balkan: Filmovi"
        },
        {
            type: "movie",
            id: "custom_cartoons",
            name: "Balkan: Crtani"
        },
        {
            type: "series",
            id: "custom_series",
            name: "Balkan: Serije"
        }
    ],
    background: "https://i.postimg.cc/WzFqwrTC/ovopozadina.jpg",
    logo: "https://i.postimg.cc/2jtbpyH0/EFProject-Logo.png"
};

// Kreiranje dodatka
const builder = new addonBuilder(manifest);

// Funkcija za kreiranje stream objekta
const createStream = (streamUrl) => {
    if (streamUrl.includes("youtube.com") || streamUrl.includes("youtu.be")) {
        return {
            title: "Watch on YouTube",
            ytId: streamUrl.split("v=")[1] || streamUrl.split("/").pop(),
        };
    } else {
        return {
            title: "Watch Now",
            url: streamUrl,
        };
    }
};

// Ruta za katalog
builder.defineCatalogHandler((args) => {
    console.log("CatalogHandler args:", args);

    if (args.type === "movie" && args.id === "custom_movies") {
        const movieMetas = movies.filter((m) => m.type === "movie" && !m.isCartoon).map((m) => ({
            id: m.id,
            type: m.type,
            name: m.name,
            poster: m.poster,
            description: m.description
        }));
        return Promise.resolve({ metas: movieMetas });
    }

    if (args.type === "movie" && args.id === "custom_cartoons") {
        const cartoonMetas = movies.filter((m) => m.type === "movie" && m.isCartoon).map((m) => ({
            id: m.id,
            type: m.type,
            name: m.name,
            poster: m.poster,
            description: m.description
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
        if (movie) {
            return Promise.resolve({
                streams: [createStream(movie.stream)],
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
serveHTTP(builder.getInterface(), { port: 7000 });
console.log("Addon running on http://localhost:7000");
