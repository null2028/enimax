const { Octokit } = require("octokit");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const version = JSON.parse(fs.readFileSync(path.join(__dirname, "../enimax-firefox-extension/manifest.json"))).version;

const file = fs.readdirSync(path.join(__dirname, "../enimax-firefox-extension/web-ext-artifacts")).find((name) =>{
    return name.includes(`-${version}`);
});

(async () => {
    const response = await octokit.rest.repos.createRelease({
        owner: "enimax-anime",
        repo: "enimax-firefox-extension",
        tag_name: version,
        target_commitish: `main`,
        name: version,
        body: "",
        draft: false,
        prerelease: false,
        generate_release_notes: false,
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    const id = response.data.id;

    await octokit.rest.repos.uploadReleaseAsset({
        owner: "enimax-anime",
        repo: "enimax-firefox-extension",
        release_id: id,
        name: `firefox-extension-${version}.xpi`,
        data: fs.readFileSync(path.join(__dirname, `../enimax-firefox-extension/web-ext-artifacts/${file}`)),
        headers: {
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });
})();

