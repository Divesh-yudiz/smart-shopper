import { assets } from "../utils/assets";

class SoundManager {
    constructor(oScene) {
        this.scene = oScene;
        this.isSound = true;
        this.isMusic = true;
    }
    playSound(key, loop) {
        if (this.isSound && key) {
            key.play();
            key.loop = loop;
        }
    }
    playMusic(key, loop) {
        if (this.isMusic && key) {
            key?.play();
            key.loop = loop;
        }
    }
    stopSound(key, loop) {
        if (key) {
            key.loop = loop
            key?.stop();
        }
    }
}

export default SoundManager;