// RIP
var animixplay = {
    baseURL: "https://animixplay.to",
    type: "anime",
    disabled: true,
    name: "Animixplay",
    searchApi: async function (query) {
        const response = [];
        alert("Animixplay has been shut down.");
        return { status: 400, data: response };
    },
    getAnimeInfo: async function (url) {
        alert("Animixplay has been shut down.");
        return {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };
    },
    getLinkFromUrl: async function (url) {
        alert("Animixplay has been shut down.");
        return {
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
    }
};
