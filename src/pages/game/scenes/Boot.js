import Phaser from "phaser";
// splash
import logo from '../../../assets/images/logo.png';
import home_bg from '../../../assets/images/home_bg.png';
// fonts
// import Avega from '../../../assets/fonts/Avega.otf';

class Boot extends Phaser.Scene {
    constructor() {
        super("Boot");
    }
    preload() {
        this.load.image('logo', logo);
        this.load.image('home_bg', home_bg);
        // this.load.font('Avega', Avega);
    }
    create() {
        this.scene.stop('Boot');
        this.scene.start('Preload');
    }
}

export default Boot;