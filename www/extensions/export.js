// @ts-ignore
const extensionList = [wco, animixplay, fmovies, zoro, twitch, nineAnime, fmoviesto, gogo, mangaDex, mangaFire, viewAsian];
// @ts-ignore   
const extensionNames = [];
// @ts-ignore
const extensionDisabled = [];
// @ts-ignore
const extensionTypes = [];
for (const extension of extensionList) {
    extensionNames.push(extension.name);
    extensionDisabled.push(extension.disabled);
    extensionTypes.push(extension.type);
}
