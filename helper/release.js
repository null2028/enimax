const { Octokit } = require("octokit");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const version = JSON.parse(fs.readFileSync(path.join(__dirname, "../version.json"))).version;

(async () => {
    const response = await octokit.rest.repos.createRelease({
        owner: "enimax-anime",
        repo: "enimax",
        tag_name: version,
        target_commitish: `v${version}`,
        name: version,
        body: fs.readFileSync(path.join(__dirname, "./releasenotes.txt"), "utf-8"),
        draft: false,
        prerelease: false,
        generate_release_notes: true,
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    const id = response.data.id;

    await octokit.rest.repos.uploadReleaseAsset({
        owner: "enimax-anime",
        repo: "enimax",
        release_id: id,
        name: `enimax_v${version}.apk`,
        data: fs.readFileSync(path.join(__dirname, "../../app-release.apk")),
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });
})();

