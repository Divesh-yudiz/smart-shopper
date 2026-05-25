class GameManager {
    constructor(scene) {
        this.scene = scene;
        this.tweens = scene.tweens;
        this.input = scene.input;
    }
    btnAnimation({ button, onPointerDown = () => { }, onPointerUp = () => { } }) {
        const scaleIncrease = 0.05;
        try {
            const scale = button.scale;
            button.on('pointerdown', () => {
                this.tweens.add({
                    targets: button,
                    scaleX: scale - scaleIncrease,
                    scaleY: scale - scaleIncrease,
                    duration: 40,
                    onComplete: () => {
                        onPointerDown();
                    }
                })
            });
            button.on('pointerup', () => {
                this.tweens.add({
                    targets: button,
                    scaleX: scale,
                    scaleY: scale,
                    duration: 40,
                    onComplete: () => {
                        button.setScale(scale);
                        onPointerUp();
                    }
                })
            });
            button.on('pointerover', () => {
                this.input.setDefaultCursor('pointer');
                this.tweens.add({
                    targets: button,
                    scaleX: scale + scaleIncrease,
                    scaleY: scale + scaleIncrease,
                    duration: 40,
                })
            })
            button.on('pointerout', () => {
                this.input.setDefaultCursor('default');
                this.tweens.add({
                    targets: button,
                    scaleX: scale,
                    scaleY: scale,
                    duration: 40,
                    onComplete: () => {
                        button.setScale(scale);
                    }
                })
            })
        }
        catch (e) {
            console.log(e);
            onPointerUp();
            onPointerDown();
        }
    }
    setTexture(profile, url, username = 'username', size) {
        profile.setVisible(false);
        const setDefaultTexture = (profile, size) => {
            profile.setTexture('avatar_0');
            profile.setVisible(true);
            size && profile.setDisplaySize(size.width, size.height);
        }
        if (url) {
            const textureKey = `avatar_${username}_${Date.now()}`;
            if (this.scene.textures.exists(textureKey)) {
                this.scene.textures.remove(textureKey);
            }
            this.scene.load.image(textureKey, url);
            this.scene.load.once('complete', () => {
                if (this.scene.textures.exists(textureKey)) {
                    try {
                        profile.setTexture(textureKey);
                        profile.setVisible(true);
                        size && profile.setDisplaySize(size.width, size.height);
                    } catch (error) {
                        console.error('Error setting texture:', error);
                        setDefaultTexture(profile, size);
                    }
                } else {
                    console.error('Texture does not exist after loading:', textureKey);
                    setDefaultTexture(profile, size);
                }
            });
            this.scene.load.once('loaderror', (file) => {
                console.error('Error loading image:', file.src);
                setDefaultTexture(profile, size);
            });
            this.scene.load.start();
        } else {
            console.warn('No profile image URL provided for:', url);
            setDefaultTexture(profile, size);
        }
    }
}

export default GameManager;