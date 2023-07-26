
var anilist: extension = {
    baseURL: "https://graphql.anilist.co",
    type: "anime",
    disableAutoDownload: false,
    disabled: false,
    name: "Anilist",
    shortenedName: "Ani",
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

        if (params.tags) {
            gqlQuery += ", $tags: [String]";
            mediaQuery += ", tag_in: $tags";
            values["tags"] = [params.tags];
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
    getAnimeInfo: async function () {
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
    },
    tags: [
        "Any",
        "4-koma",
        "Achromatic",
        "Achronological Order",
        "Acting",
        "Adoption",
        "Advertisement",
        "Afterlife",
        "Age Gap",
        "Age Regression",
        "Agender",
        "Agriculture",
        "Airsoft",
        "Alchemy",
        "Aliens",
        "Alternate Universe",
        "American Football",
        "Amnesia",
        "Anachronism",
        "Angels",
        "Animals",
        "Anthology",
        "Anthropomorphism",
        "Anti-Hero",
        "Archery",
        "Artificial Intelligence",
        "Asexual",
        "Assassins",
        "Astronomy",
        "Athletics",
        "Augmented Reality",
        "Autobiographical",
        "Aviation",
        "Badminton",
        "Band",
        "Bar",
        "Baseball",
        "Basketball",
        "Battle Royale",
        "Biographical",
        "Bisexual",
        "Body Horror",
        "Body Swapping",
        "Boxing",
        "Boys' Love",
        "Bullying",
        "Butler",
        "Calligraphy",
        "Cannibalism",
        "Card Battle",
        "Cars",
        "Centaur",
        "CGI",
        "Cheerleading",
        "Chibi",
        "Chimera",
        "Chuunibyou",
        "Circus",
        "Classic Literature",
        "Clone",
        "College",
        "Coming of Age",
        "Conspiracy",
        "Cosmic Horror",
        "Cosplay",
        "Crime",
        "Crossdressing",
        "Crossover",
        "Cult",
        "Cultivation",
        "Cute Boys Doing Cute Things",
        "Cute Girls Doing Cute Things",
        "Cyberpunk",
        "Cyborg",
        "Cycling",
        "Dancing",
        "Death Game",
        "Delinquents",
        "Demons",
        "Denpa",
        "Desert",
        "Detective",
        "Dinosaurs",
        "Disability",
        "Dissociative Identities",
        "Dragons",
        "Drawing",
        "Drugs",
        "Dullahan",
        "Dungeon",
        "Dystopian",
        "E-Sports",
        "Economics",
        "Educational",
        "Elf",
        "Ensemble Cast",
        "Environmental",
        "Episodic",
        "Ero Guro",
        "Espionage",
        "Fairy",
        "Fairy Tale",
        "Family Life",
        "Fashion",
        "Female Harem",
        "Female Protagonist",
        "Femboy",
        "Fencing",
        "Firefighters",
        "Fishing",
        "Fitness",
        "Flash",
        "Food",
        "Football",
        "Foreign",
        "Found Family",
        "Fugitive",
        "Full CGI",
        "Full Color",
        "Gambling",
        "Gangs",
        "Gender Bending",
        "Ghost",
        "Go",
        "Goblin",
        "Gods",
        "Golf",
        "Gore",
        "Guns",
        "Gyaru",
        "Handball",
        "Henshin",
        "Heterosexual",
        "Hikikomori",
        "Historical",
        "Homeless",
        "Ice Skating",
        "Idol",
        "Isekai",
        "Iyashikei",
        "Josei",
        "Judo",
        "Kaiju",
        "Karuta",
        "Kemonomimi",
        "Kids",
        "Kuudere",
        "Lacrosse",
        "Language Barrier",
        "LGBTQ+ Themes",
        "Lost Civilization",
        "Love Triangle",
        "Mafia",
        "Magic",
        "Mahjong",
        "Maids",
        "Makeup",
        "Male Harem",
        "Male Protagonist",
        "Marriage",
        "Martial Arts",
        "Medicine",
        "Memory Manipulation",
        "Mermaid",
        "Meta",
        "Military",
        "Mixed Gender Harem",
        "Monster Boy",
        "Monster Girl",
        "Mopeds",
        "Motorcycles",
        "Musical",
        "Mythology",
        "Necromancy",
        "Nekomimi",
        "Ninja",
        "No Dialogue",
        "Noir",
        "Non-fiction",
        "Nudity",
        "Nun",
        "Office Lady",
        "Oiran",
        "Ojou-sama",
        "Orphan",
        "Otaku Culture",
        "Outdoor",
        "Pandemic",
        "Parkour",
        "Parody",
        "Philosophy",
        "Photography",
        "Pirates",
        "Poker",
        "Police",
        "Politics",
        "Post-Apocalyptic",
        "POV",
        "Primarily Adult Cast",
        "Primarily Child Cast",
        "Primarily Female Cast",
        "Primarily Male Cast",
        "Primarily Teen Cast",
        "Prison",
        "Puppetry",
        "Rakugo",
        "Real Robot",
        "Rehabilitation",
        "Reincarnation",
        "Religion",
        "Revenge",
        "Robots",
        "Rotoscoping",
        "Rugby",
        "Rural",
        "Samurai",
        "Satire",
        "School",
        "School Club",
        "Scuba Diving",
        "Seinen",
        "Shapeshifting",
        "Ships",
        "Shogi",
        "Shoujo",
        "Shounen",
        "Shrine Maiden",
        "Skateboarding",
        "Skeleton",
        "Slapstick",
        "Slavery",
        "Software Development",
        "Space",
        "Space Opera",
        "Spearplay",
        "Steampunk",
        "Stop Motion",
        "Succubus",
        "Suicide",
        "Sumo",
        "Super Power",
        "Super Robot",
        "Superhero",
        "Surfing",
        "Surreal Comedy",
        "Survival",
        "Swimming",
        "Swordplay",
        "Table Tennis",
        "Tanks",
        "Tanned Skin",
        "Teacher",
        "Teens' Love",
        "Tennis",
        "Terrorism",
        "Time Manipulation",
        "Time Skip",
        "Tokusatsu",
        "Tomboy",
        "Torture",
        "Tragedy",
        "Trains",
        "Transgender",
        "Travel",
        "Triads",
        "Tsundere",
        "Twins",
        "Urban",
        "Urban Fantasy",
        "Vampire",
        "Video Games",
        "Vikings",
        "Villainess",
        "Virtual World",
        "Volleyball",
        "VTuber",
        "War",
        "Werewolf",
        "Witch",
        "Work",
        "Wrestling",
        "Writing",
        "Wuxia",
        "Yakuza",
        "Yandere",
        "Youkai",
        "Yuri",
        "Zombie"
    ]
};