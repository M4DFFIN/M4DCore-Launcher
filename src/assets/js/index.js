/**
 * @author M4DFFIN
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
import { config, database } from './utils.js';
const nodeFetch = require("node-fetch");


class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");
        document.addEventListener('DOMContentLoaded', async () => {
            let databaseLauncher = new database();
            let configClient = await databaseLauncher.readData('configClient');
            let theme = configClient?.launcher_config?.theme || "auto"
            let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
            document.body.className = isDarkTheme ? 'dark global' : 'light global';
            if (process.platform == 'win32') ipcRenderer.send('update-window-progress-load')
            this.startAnimation()
        });
    }

    async startAnimation() {
        let splashes = [
            { "message": "El código es poesía.", "author": "M4DFFIN" },
            { "message": "La creatividad no tiene límites.", "author": "M4DFFIN" },
            { "message": "No hay errores, solo oportunidades para aprender.", "author": "M4DFFIN" },
            { "message": "Un buen café y código, la combinación perfecta.", "author": "M4DFFIN" },
            { "message": "La paciencia es el mejor depurador.", "author": "M4DFFIN" },
            { "message": "Todo bug tiene solución, solo hay que encontrarla.", "author": "M4DFFIN" },
            { "message": "La lógica es el lenguaje del universo.", "author": "M4DFFIN" },
            { "message": "Crear es un arte; el código, el pincel.", "author": "M4DFFIN" },
            { "message": "Nunca subestimes el poder de una línea de código.", "author": "M4DFFIN" },
            { "message": "Los errores nos hacen mejores programadores.", "author": "M4DFFIN" },
            { "message": "Innovar es pensar diferente.", "author": "M4DFFIN" },
            { "message": "El código bien escrito es fácil de entender y difícil de romper.", "author": "M4DFFIN" },
            { "message": "Una mente creativa siempre encuentra soluciones.", "author": "M4DFFIN" },
            { "message": "Cada línea de código cuenta una historia.", "author": "M4DFFIN" },
            { "message": "La programación es resolver problemas de manera creativa.", "author": "M4DFFIN" },
            { "message": "Una buena idea vale más que mil líneas de código.", "author": "M4DFFIN" },
            { "message": "No hay límites en el mundo digital.", "author": "M4DFFIN" },
            { "message": "El conocimiento es poder.", "author": "M4DFFIN" },
            { "message": "La curiosidad impulsa la innovación.", "author": "M4DFFIN" }
        ];
        let splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;
        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus(`Buscando una actualización...`);

        ipcRenderer.invoke('update-app').then().catch(err => {
            return this.shutdown(`error al buscar actualización:<br>${err.message}`);
        });

        ipcRenderer.on('updateAvailable', () => {
            this.setStatus(`¡Actualización disponible!`);
            if (os.platform() == 'win32') {
                this.toggleProgress();
                ipcRenderer.send('start-update');
            }
            else return this.dowloadUpdate();
        })

        ipcRenderer.on('error', (event, err) => {
            if (err) return this.shutdown(`${err.message}`);
        })

        ipcRenderer.on('download-progress', (event, progress) => {
            ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
            this.setProgress(progress.transferred, progress.total);
        })

        ipcRenderer.on('update-not-available', () => {
            console.error("Actualización no disponible");
            this.maintenanceCheck();
        })
    }

    getLatestReleaseForOS(os, preferredFormat, asset) {
        return asset.filter(asset => {
            const name = asset.name.toLowerCase();
            const isOSMatch = name.includes(os);
            const isFormatMatch = name.endsWith(preferredFormat);
            return isOSMatch && isFormatMatch;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    async dowloadUpdate() {
        const repoURL = pkg.repository.url.replace("git+", "").replace(".git", "").replace("https://github.com/", "").split("/");
        const githubAPI = await nodeFetch('https://api.github.com').then(res => res.json()).catch(err => err);

        const githubAPIRepoURL = githubAPI.repository_url.replace("{owner}", repoURL[0]).replace("{repo}", repoURL[1]);
        const githubAPIRepo = await nodeFetch(githubAPIRepoURL).then(res => res.json()).catch(err => err);

        const releases_url = await nodeFetch(githubAPIRepo.releases_url.replace("{/id}", '')).then(res => res.json()).catch(err => err);
        const latestRelease = releases_url[0].assets;
        let latest;

        if (os.platform() == 'darwin') latest = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
        else if (os == 'linux') latest = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);


        this.setStatus(`¡Actualización disponible!<br><div class="download-update">Descargar</div>`);
        document.querySelector(".download-update").addEventListener("click", () => {
            shell.openExternal(latest.browser_download_url);
            return this.shutdown("Descarga en curso...");
        });
    }


    async maintenanceCheck() {
        config.GetConfig().then(res => {
            if (res.maintenance) return this.shutdown(res.maintenance_message);
            this.startLauncher();
        }).catch(e => {
            console.error(e);
            return this.shutdown("No se detectó ninguna conexión a Internet.<br>Vuelve a intentarlo más tarde.");
        })
    }

    startLauncher() {
        this.setStatus(`Iniciando el lanzador`);
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Apagando en 5 segundos`);
        let i = 4;
        setInterval(() => {
            this.setStatus(`${text}<br>Apagando en ${i--}s`);
            if (i < 0) ipcRenderer.send('update-window-close');
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
})
new Splash();