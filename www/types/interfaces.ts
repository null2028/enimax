type ExitFullscreen = typeof document.exitFullscreen
type RequestFullscreen = typeof document.documentElement.requestFullscreen
type TypeFunc = (res: Response) => Promise<string>
type anilistType = "9anime" | "Zoro" | "Gogoanime" | "Mangadex" | "MangaFire"
type anilistStatus = "CURRENT" | "PLANNING" | "COMPLETED" | "DROPPED" | "PAUSED" | "REPEATING";
type AnilistLinks = { link: string, progress: number, aniID: number, anilistCategory: string, result?: extensionInfo }[];
interface Document {
    webkitExitFullscreen: ExitFullscreen;
    mozCancelFullScreen: ExitFullscreen;
    msExitFullscreen: ExitFullscreen;
}

interface HTMLElement {
    webkitRequestFullscreen: RequestFullscreen;
    mozRequestFullScreen: RequestFullscreen;
    msRequestFullscreen: RequestFullscreen;
}

interface DiscoverData {
    id: string,
    image: string,
    name: string,
    label: string
}

interface createElementConfig {
    isClickable?: boolean,
    shouldAdd?: boolean,
    element?: string,
    attributes?: { [key: string]: string },
    style?: { [key: string]: string },
    class?: string,
    id?: string,
    innerText?: string,
    innerHTML?: string,
    children?: createElementConfig[]
    listeners?: { [key: string]: Function },
    obj?: Object,
    key?: string
}

interface menuItemConfig {
    open?: string,
    attributes?: { [key: string]: string },
    classes?: Array<string>,
    iconID?: string,
    hideArrow?: boolean,
    callback?: Function,
    selected?: boolean,
    highlightable?: boolean,
    id?: string,
    text?: string,
    html?: string,
    altText?: string,
    textBox?: boolean,
    numberBox?: boolean,
    slider?: boolean,
    sliderConfig?: sliderConfig;
    value?: string,
    onInput?: Function,
    toggle?: boolean,
    color?: boolean,
    on?: boolean,
    toggleOn?: Function,
    toggleOff?: Function,
    selectedValue?: string,
    valueDOM?: HTMLElement,
    triggerCallbackIfSelected?: boolean,
    DOM?: HTMLElement
}

interface sliderConfig {
    max: number,
    min: number,
    step: number
}

interface menuSceneConfig {
    config?: menuItemConfig,
    id: string,
    selectableScene?: boolean,
    scrollIntoView?: boolean,
    scrollOffset? : number,
    heading?: menuItemConfig,
    items: Array<menuItemConfig>,
    element?: HTMLElement
}

interface skipData {
    start: number,
    end: number
}

interface videoSource {
    name: string,
    type: string,
    url: string,
    castURL?: string,
    skipIntro?: skipData
}

interface videoSubtitle {
    file: string,
    label: string
}

interface videoData {
    next?: string | null,
    prev?: string | null,
    sources: Array<videoSource>,
    episode: number,
    name: string,
    nameWSeason: string,
    subtitles: Array<videoSubtitle>
    engine?: number,
    ogURL: string
}

interface mangaData extends extensionMangaSource{
    engine: number,
    ogURL: string,
}

interface videoDoubleTapEvent extends CustomEvent {
    detail: {
        DTType: string
    }
}

interface videoOpenSettingsEvent extends CustomEvent {
    detail: {
        translate: number
    }
}

interface videoChangedFillModeEvent extends CustomEvent {
    detail: {
        fillMode: string
    }
}

interface cordovaServerRequest {
    headers: string;
    method: string;
    path: string;
    requestId: string;
    query: string,
}
interface cordovaWindow extends Window {
    ApkUpdater: any,
    openWebview: typeof openWebview;
    getCachedAvatar: typeof getCachedAvatar;
    resetCachedAvatar: typeof resetCachedAvatar;
    checkForUpdate: typeof checkForUpdate;
    AnilistHelperFunctions: typeof AnilistHelperFunctions;
    anilistToMal: typeof anilistToMal;
    fixTitle(title: string, extension?: extension): string,
    Dialogs: {
        confirm: typeof DialogsClass.confirm
        alert: typeof DialogsClass.alert,
        prompt: typeof DialogsClass.prompt
    },
    screen: any,
    getEstimatedState: Function,
    handleUpperBar: Function,
    toggleCastState: Function,
    getCurrentCastState: Function,
    updateCastTime: Function,
    webserver: any,
    getLocalIP: any,
    chrome: any,
    castVid: (data: any, requiresWebServer: boolean) => Promise<boolean>,
    destroySession: () => Promise<boolean>,
    isCasting: () => boolean,
    cordova: any,
    handleFullscreen: () => void;
    returnAnilistStatus: () => anilistStatus[],
    addRoom: Function,
    anilist: extension,
    makeLocalRequest: Function,
    normalise: Function,
    apiCall: Function,
    returnExtensionList: Function,
    XMLHttpRequest: any,
    returnExtensionNames: Function,
    returnDownloadQueue: Function,
    returnExtensionDisabled: Function,
    returnExtensionTypes: Function,
    getAnilistTrending: Function,
    listDir: Function,
    getWebviewHTML: typeof getWebviewHTML,
    back: Function,
    sendBatchReqs: Function,
    secondsToHuman: Function,
    removeDirectory: Function,
    extractKey: Function,
    saveAsImport: Function,
    saveImage: typeof saveImage,
    plugins: any,
    updateImage: Function,
    getMetaByAniID: Function,
    setFmoviesBase: Function,
    findLastNotEpisode: Function,
    updateBackgroundBlur: Function,
    makeRequest: Function,
    MakeFetch: Function,
    resolveLocalFileSystemURL: Function
}

interface notiConfig {
    perm: number,
    color: string,
    head: string,
    notiData: string
}

interface sourceConfig {
    skipTo?: number,
    type: string,
    element?: HTMLElement | undefined,
    clicked: boolean,
    url?: string,
    name?: string,
}

interface RelationCardConfig {
    id: string,
    image: string,
    name: string,
    type?: string,
    label?: string
}

interface modifiedString extends String {
    substringAfter: Function,
    substringBefore: Function,
    substringAfterLast: Function,
    substringBeforeLast: Function,
    onlyOnce: Function,
}

interface extension {
    supportsMalsync?: boolean,
    baseURL: string,
    disabled: boolean,
    disableAutoDownload: boolean,
    type: "manga" | "anime" | "tv" | "others",
    name: string,
    searchApi: (query: string, params?: { [key: string]: any }) => Promise<extensionSearch>;
    getAnimeInfo: (url: string, aniID?: string) => Promise<extensionInfo>;
    getLinkFromUrl: (url: any) => Promise<extensionVidSource | extensionMangaSource>;
    discover?: () => Promise<Array<extensionDiscoverData>>;
    fixTitle?: (title: string) => string;
    [key: string]: any;
}

interface extensionMangaSource {
    pages: MangaPage[],
    readerType?: "epub",
    sources? : Array<videoSource>,
    next: string | null,
    nextTitle: string | null,
    prev: string | null,
    prevTitle: string | null,
    name: string,
    chapter: number,
    title?: string,
    type: "manga",
}

interface MangaPage {
    img: string,
    needsDescrambling?: boolean,
    key?: number
}

interface extensionSearchData {
    image: string,
    name: string,
    link: string
}

interface extensionSearch {
    status: number,
    data: Array<extensionSearchData>
}

interface extensionInfo {
    name: string,
    image: string,
    description: string,
    episodes: Array<extensionInfoEpisode>,
    mainName: string
    totalPages?: number
    pageInfo?: Array<PageInfo>
    genres?: Array<string>
    isManga?: boolean
}

interface infoError extends Error {
    url: string,
    message: string
}

interface searchError extends Error {
    url: string,
}

// type BasePageConfig = {
//     hasReload: Boolean,
//     reloadFunc  ?: Function,
//     customConClass?: string,
//     linkClass?: string,
//     isError?: Boolean,
//     positive?: Boolean
// }

// type ErrorPageConfig = BasePageConfig & ({
//     hasLink: false,
// } | {
//     hasLink: true,
//     clickEvent: Function,
// });

type ErrorPageConfig = {
    hasLink: false,
    hasReload: Boolean,
    reloadFunc?: Function,
    customConClass?: string,
    linkClass?: string,
    isError?: Boolean,
    positive?: Boolean
} | {
    hasLink: true,
    hasReload: Boolean,
    reloadFunc?: Function,
    clickEvent: Function,
    customConClass?: string,
    linkClass?: string,
    isError?: Boolean,
    positive?: Boolean
}

interface PageInfo {
    pageSize: number,
    pageName: string
}

interface extensionInfoEpisode {
    isFiller?: boolean,
    link: string,
    title: string,
    id?: string,
    altTitle?: string,
    season?: number,
    altTruncatedTitle?: string,
    sourceID?: string,
    thumbnail?: string,
    description?: string,
    date?: Date,
    number?: number,
}

interface extensionVidSource {
    sources: Array<videoSource>,
    name: string,
    nameWSeason: string,
    episode: string,
    status: number,
    message: string,
    next: string | null,
    prev: string | null,
    title?: string,
    subtitles?: Array<videoSubtitle>,
    type?: "anime",
}

interface extensionDiscoverData {
    image: string,
    name: string,
    link: string | null,
    getLink?: boolean,
}



interface subtitleConfig {
    backgroundColor: string | null,
    shadowColor: string | null,
    shadowOffsetX: number | null,
    shadowOffsetY: number | null,
    shadowBlur: number | null,
    backgroundOpacity: number | null,
    fontSize: number | null,
    lineHeight: number | null,
    color: string | null
}

interface flaggedShows {
    showURL: string,
    currentEp: string,
    dom: HTMLElement,
    name: string
}

interface queueElement {
    data: string,
    anime: extensionInfo,
    downloadInstance?: DownloadVid | DownloadManga,
    mainUrl: string,
    title: string,
    errored?: boolean,
    message?: string
}

interface MessageAction {
    action: number | string,
    data: any,
    [key: string]: any
}


interface SourceDOMAttributes {
    "data-url": string,
    "data-type": string,
    "data-name": string,
    "data-intro"?: string,
    "data-start"?: number,
    "data-end"?: number
}

interface EnimaxConfig {
    "local": boolean,
    "remote": string,
    "remoteWOport": string,
    "chrome": boolean,
    "firefox": boolean,
    "beta": boolean,
    "sockets": boolean,
    "manifest": string
}

interface downloadMapping {
    "fileName": string,
    "uri": string,
    "downloaded": boolean | -1
}

interface LocalMapping {
    "fileName": string,
    "uri": string,
}
