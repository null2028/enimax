async function updateEpWatched(anilistID: any, epNum: any) {
    const accessToken = localStorage.getItem("anilist-token");
    
    if(!accessToken || isNaN(parseInt(anilistID)) || isNaN(parseInt(epNum))){
        return;
    }

    const mediaId = anilistID;
    const progress = epNum;
    const query = `mutation ($mediaId: Int, $progress: Int) {
                        SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                            id
                            status
                            progress
                        }
                    }`;

    const variables = {
        mediaId: mediaId,
        progress: progress
    };

    await MakeFetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    });
}