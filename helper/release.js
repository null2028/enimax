const { Octokit } = require("octokit");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");
const CryptoJS = require('crypto-js');

dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

// "stable" || "beta" || "dev"
const releaseType = process.env.TYPE;

if (releaseType === "beta" && JSON.parse(fs.readFileSync(path.join(__dirname, "./data.json"))).isBeta !== true) {
    process.exit(0);
}

const version = JSON.parse(fs.readFileSync(path.join(__dirname, "../version.json"))).version;

const repoName = releaseType === "stable" ? "enimax" : `enimax-${releaseType}`;
const targetBranch = releaseType === "stable" ? `v${version}` : "main";
const tag = releaseType === "stable" ? version : `${version}-${Date.now()}`;
const fileToUpload = path.join(__dirname, "../../app-release.apk");
const currentTimestamp = parseInt(fs.readFileSync(path.join(__dirname, "./time.txt")));

const hash = CryptoJS.MD5(CryptoJS.lib.WordArray.create(fs.readFileSync(fileToUpload))).toString(CryptoJS.enc.Hex);
let releaseNotes = "";

switch (releaseType) {
    case "stable":
        releaseNotes = fs.readFileSync(path.join(__dirname, "./releasenotes.local.text"), "utf-8");
        break;

    case "beta":
        releaseNotes = fs.readFileSync(path.join(__dirname, "./releasenotes.txt"), "utf-8");
        break;

    case "dev":
        releaseNotes = process.env.MESSAGE;
        break;
}


(async () => {
    const response = await octokit.rest.repos.createRelease({
        owner: "enimax-anime",
        repo: repoName,
        tag_name: tag,
        target_commitish: targetBranch,
        name: version,
        body: releaseNotes,
        draft: false,
        prerelease: false,
        generate_release_notes: releaseType === "stable" ? true : false,
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    const id = response.data.id;

    await octokit.rest.repos.uploadReleaseAsset({
        owner: "enimax-anime",
        repo: repoName,
        release_id: id,
        name: `enimax_v${version}.apk`,
        data: fs.readFileSync(fileToUpload),
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    await octokit.rest.repos.uploadReleaseAsset({
        owner: "enimax-anime",
        repo: repoName,
        release_id: id,
        name: `data.json`,
        data: JSON.stringify({checksum: hash, timestamp: currentTimestamp}),
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

})();