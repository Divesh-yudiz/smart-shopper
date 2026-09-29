import Phaser from "phaser";
import { useEffect, useRef } from "react";
import config from "./utils/config.js";
import { waitForCauseFonts } from "./utils/loadFonts.js";
import Boot from "./scenes/Boot.js";
import Home from "./scenes/Home.js";
import Preload from "./scenes/Preload.js";
import Level from "./scenes/Level.js";

/** Keep --vh in sync for mobile browser chrome (used as 100vh fallback). */
function syncViewportUnit() {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
}

function GamePlay() {
    const gameRef = useRef(null);
    useEffect(() => {
        let game;
        let cancelled = false;

        syncViewportUnit();

        // Explicitly download every Cause weight before Phaser boots.
        // `document.fonts.ready` alone can resolve while faces are still unused
        // (and therefore not fetched), which makes canvas text fall back.
        // Guarded with `cancelled` because this resolves after React 18 StrictMode's
        // dev-mode mount→cleanup→mount cycle — without it, two Game instances get
        // created and stack in the same div.
        waitForCauseFonts().then(() => {
            if (cancelled || !gameRef.current) return;
            const gameConfig = {
                type: Phaser.AUTO,
                width: config.width,
                height: config.height,
                parent: gameRef.current,
                transparent: true,
                title: 'Smart Shopper',
                backgroundColor: '#1a1028',
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                    width: config.width,
                    height: config.height,
                },
            };

            game = new Phaser.Game(gameConfig);

            const refreshScale = () => {
                syncViewportUnit();
                // Defer so layout has applied new viewport metrics first.
                requestAnimationFrame(() => game?.scale?.refresh());
            };
            window.addEventListener('resize', refreshScale);
            window.addEventListener('orientationchange', refreshScale);
            window.visualViewport?.addEventListener('resize', refreshScale);
            game._ssRefreshScale = refreshScale;

            game.scene.add("Boot", Boot, true);
            game.scene.add("Home", Home);
            game.scene.add("Preload", Preload);
            game.scene.add("Level", Level);
        });

        return () => {
            cancelled = true;
            if (game?._ssRefreshScale) {
                window.removeEventListener('resize', game._ssRefreshScale);
                window.removeEventListener('orientationchange', game._ssRefreshScale);
                window.visualViewport?.removeEventListener('resize', game._ssRefreshScale);
            }
            game?.destroy(true);
        };
    }, []);


    return <div id="game-division" ref={gameRef} />;
}

export default GamePlay;
