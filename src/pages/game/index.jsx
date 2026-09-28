import Phaser from "phaser";
import { useEffect, useRef } from "react";
import config from "./utils/config.js";
import { waitForCauseFonts } from "./utils/loadFonts.js";
import Boot from "./scenes/Boot.js";
import Home from "./scenes/Home.js";
import Preload from "./scenes/Preload.js";
import Level from "./scenes/Level.js";

function GamePlay() {
    const gameRef = useRef(null);
    useEffect(() => {
        let game;
        let cancelled = false;

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
                },
            };

            game = new Phaser.Game(gameConfig);
            game.scene.add("Boot", Boot, true);
            game.scene.add("Home", Home);
            game.scene.add("Preload", Preload);
            game.scene.add("Level", Level);
        });

        return () => {
            cancelled = true;
            game?.destroy(true);
        };
    }, []);


    return <div id="game-division" ref={gameRef} style={{ width: config.width, height: config.height }} />;
}

export default GamePlay;
