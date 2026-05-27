import Phaser from "phaser";
import { useEffect, useRef } from "react";
import config from "./utils/config.js";
import Boot from "./scenes/Boot.js";
import Home from "./scenes/Home.js";
import Preload from "./scenes/Preload.js";
import Level from "./scenes/Level.js";

function GamePlay() {
    const gameRef = useRef(null);
    useEffect(() => {
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

        const game = new Phaser.Game(gameConfig);
        game.scene.add("Boot", Boot, true);
        game.scene.add("Home", Home);
        game.scene.add("Preload", Preload);
        game.scene.add("Level", Level);

        return () => {
            game.destroy(true);
        };
    }, []);


    return <div id="game-division" ref={gameRef} style={{ width: config.width, height: config.height }} />;
}

export default GamePlay;
