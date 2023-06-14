async function makeAnilistReq(query, variables, accessToken) {
    try {
        const response = await fetch("https://graphql.anilist.co", {
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
        if (response.status === 400) {
            throw Error("It seems like you are not logged in to anilist, or the session expired. Log in again to get rid of this error.");
        }
        else {
            return await response.text();
        }
    }
    catch (err) {
        if ("mediaId" in variables && "progress" in variables) {
            const variablesString = JSON.stringify(variables);
            if (variablesString !== localStorage.getItem("anilist-last-error")) {
                alert(err);
                localStorage.setItem("anilist-last-error", variablesString);
            }
        }
        else {
            alert(err);
        }
        throw Error("Could not update");
    }
}
async function updateEpWatched(anilistID, epNum) {
    const accessToken = localStorage.getItem("anilist-token");
    if (!accessToken || isNaN(parseInt(anilistID)) || isNaN(parseInt(epNum))) {
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
    await makeAnilistReq(query, variables, accessToken);
}
async function deleteAnilistShow(anilistID) {
    var _a, _b, _c, _d;
    try {
        const accessToken = localStorage.getItem("anilist-token");
        if (!accessToken || isNaN(parseInt(anilistID))) {
            return;
        }
        const query = `query($mediaId:Int){
                        Media(id:$mediaId){
                            mediaListEntry{
                                id
                            }
                        }
                    }`;
        const getIDvariables = {
            mediaId: anilistID
        };
        const listID = (_d = (_c = (_b = (_a = JSON.parse(await makeAnilistReq(query, getIDvariables, accessToken))) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.Media) === null || _c === void 0 ? void 0 : _c.mediaListEntry) === null || _d === void 0 ? void 0 : _d.id;
        if (listID) {
            const deleteQuery = `mutation ($id: Int) {
                        DeleteMediaListEntry (id: $id) {
                            deleted
                        }
                   }`;
            const variables = {
                id: listID
            };
            await makeAnilistReq(deleteQuery, variables, accessToken);
        }
        else {
            throw Error("Could not find the show on your anilist account");
        }
        sendNoti([4, null, "Alert", "Deleted the show from your anilist account"]);
    }
    catch (err) {
        sendNoti([4, "red", "Alert", err]);
    }
}
