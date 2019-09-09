# fnbot-server
fnbot-server stores Fortnite locale strings, textures and assets. It should be used with [fnbot-client](https://github.com/Terax235/fnbot-client).

#### Discord
https://discord.gg/WWSTpbb
> Note that the server is new so probably there won't be that many people on it.

## Installation
> If you don't have much experience with [Node.js](https://nodejs.org/en/), you should not try to setup this server since it requires you to have some experience.

#### Requirements
- [Node.js](https://nodejs.org/en/) (Recommended: Version 10.X / Version 12.X)
- [Build tools](https://github.com/nodejs/node-gyp)
- [Git](https://git-scm.com/downloads)

### Setup
1. Open a terminal and clone this repository. `git clone https://github.com/Terax235/fnbot-server.git`
2. Go to the folder using the terminal. `cd fnbot-server`
3. Fill out `config.example.json` with all the required information.
   - If you just want to host an instance of the server and you don't want to edit the routes (endpoints), don't edit any value in `routeinit`.
   - `assetdumping`: These values are used for asset dumping. This only works on Windows. `pakpath` should contain the path to the Fortnite pak folders, like that: `<DISK>:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Content\\Paks`
   - `builddumping`: These values are used for build information dumping (netCL, buildID, UserAgent etc.).
     - `fnlogs`: Path to `FortniteGame.log`, like `<DISK>:\\Users\\<USERNAME>\\AppData\\Local\\FortniteGame\\Saved\\Logs\\FortniteGame.log`
     - `launcherlogs`: Path to `EpicGamesLauncher.log`, like `<DISK>:\\Users\\<USERNAME>\\AppData\\Local\\EpicGamesLauncher\\Saved\\Logs\\EpicGamesLauncher.log`
   - You must run the server at least one time on Windows, so assets and builds can get dumped. After that, you can just skip all the dumping by providing `-sd` as an argument (e.g. `node index.js -sd`) (so you can run the server on other platforms than Windows)
4. Install all required packages by running `npm install`.
5. Run the script for the first time. `node index.js`
> You **have** to do that on Windows, because you'll have to dump the assets and builds from Fortnites files. After you've dumped the files, you can run the server on any platform, but you must copy `storage/*` to the platform you want to host the server on. Also make sure to add the argument `-sd` every time you start the bot without wanting to dump assets and builds, so that will get skipped.
6. You should now be able to explore endpoints. The endpoints have a structure like this: `http://localhost:<config.server.port>/<config.routeInit.baseUrl>/{version}/{endpoint}`
   - Default values:
     - `config.server.port`: `8080`
     - `config.routeInit.baseUrl`: `/api/`
   > Try opening up http://localhost:<config.server.port>/ and if the result is an object, everything worked.
7. Now you can use the url as `server_url` for [fnbot-client](https://github.com/Terax235/fnbot-client.git).

## Dependencies
#### npm
- [express](https://www.npmjs.com/package/express)
- [node-fetch](https://www.npmjs.com/package/node-fetch)
- [node-wick](https://www.npmjs.com/package/node-wick)

#### Other
- [benbotfn API](http://benbotfn.tk:8080/api/docs) (used to get Fortnite encryption keys)