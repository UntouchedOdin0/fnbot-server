const fetch = require("node-fetch");

const ENDPOINTS = {
    fortnite: {
        server_status: "https://lightswitch-public-service-prod06.ol.epicgames.com/lightswitch/api/service/bulk/status?serviceId=Fortnite",
    },
};

class API {
    static getFortniteServerStatus() {
        return new Promise((resolve, reject) => {
            fetch(ENDPOINTS.fortnite.server_status).then(res => res.json()).catch(err => { return resolve({ online: false }) }).then(res => {
                if (!res || !res[0] || !res[0].serviceInstanceId || res[0].serviceInstanceId !== "fortnite") return resolve({ online: false });
                if (res[0].banned) return resolve({ online: false, banned: true });
                if (res[0].status == "UP") return resolve({ online: true });
                return resolve({ online: false });
            });
        });
    };
};

module.exports = API;