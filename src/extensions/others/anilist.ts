
var anilist: extension = {
    baseURL: "https://graphql.anilist.co",
    type: "anime",
    disabled: false,
    name: "Anilist",
    searchApi: async function (query, params) {
        let gqlQuery = `query($type: MediaType`;
        let mediaQuery = `media(type: $type`;

        let values = {};

        if(!params.type){
            params.type = "ANIME";
        }

        values["type"] = params.type.toUpperCase();

        if (params.genres) {
            gqlQuery += ", $genre: String";
            mediaQuery += ", genre: $genre";
            values["genre"] = params.genres;
        }

        if (params.season) {
            gqlQuery += ", $season: MediaSeason";
            mediaQuery += ", season: $season";
            values["season"] = params.season.toUpperCase();
        }

        if (params.year) {
            gqlQuery += ", $year: Int";
            mediaQuery += ", seasonYear: $year";
            values["year"] = params.year;
        }

        if (params.status) {
            gqlQuery += ", $status: MediaStatus";
            mediaQuery += ", status: $status";
            values["status"] = params.status.toUpperCase().split(" ").join("_");
        }

        if (params.sort) {
            gqlQuery += ", $sort: [MediaSort]";
            mediaQuery += ", sort: $sort";
            values["sort"] = this.sortMap[params.sort];
        }

        if (query) {
            gqlQuery += ", $title: String";
            mediaQuery += ", search: $title";
            values["title"] = query;
        }

        gqlQuery += "){";
        mediaQuery += "){";

        try {

            const response = await anilistAPI(
                `${gqlQuery}
                    search: Page(page: 1, perPage: 100){
                        ${mediaQuery}
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage { 
                                extraLarge 
                                large 
                            }
                        }
                    }
                }`, values);

            const data = [];
            for (const anime of response.data.search.media) {
                data.push({
                    "name": anime.title.english ?? (Object.keys(anime.title).length > 0 ? anime.title[Object.keys(anime.title)[0]] : ""),
                    "id": anime.id,
                    "image": anime.coverImage.large,
                    "link": "anilist"
                });
            }

            return {
                data,
                "status": 200,
                type: values["type"],
            };
        } catch (err) {
            return {
                data: err.toString(),
                status: 400
            };
        }
    },
    getAnimeInfo: async function (url, sibling = false, currentID = -1) {
        let response: extensionInfo = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };

        return response;
    },
    getLinkFromUrl: async function (url): Promise<extensionVidSource> {
        const resp: extensionVidSource = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };

        return resp;
    },
    genres: [
        "Any",
        "Action",
        "Adventure",
        "Comedy",
        "Drama",
        "Ecchi",
        "Fantasy",
        "Horror",
        "Mahou Shoujo",
        "Mecha",
        "Music",
        "Mystery",
        "Psychological",
        "Romance",
        "Sci-Fi",
        "Slice of Life",
        "Sports",
        "Supernatural",
        "Thriller",
    ],
    seasons: [
        "Any",
        "Winter",
        "Spring",
        "Summer",
        "Fall"
    ],
    status: [
        "Any",
        "Cancelled",
        "Finished",
        "Releasing",
        "Not Yet Released"
    ],
    mediaType: [
        "Anime",
        "Manga"
    ],
    sortBy: [
        "Title",
        "Popularity",
        "Score",
        "Trending",
        "Release Date"
    ],
    sortMap: {
        "Title": "TITLE_ROMAJI",
        "Popularity": "POPULARITY_DESC",
        "Score": "SCORE_DESC",
        "Trending": ["TRENDING_DESC", "POPULARITY_DESC"],
        "Release Date": "START_DATE_DESC"
    }
};