import Phaser from 'phaser';
import { assets } from '../../utils/assets.js';
import config from '../../utils/config.js';

export default class Popup extends Phaser.GameObjects.Container {
    constructor(scene, x = 0, y = 0) {
        super(scene, x, y);
        scene.add.existing(this);
        this.scene = scene;
        this.setScale(0);
        this.setVisible(false);

        this.bg = scene.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.5).setVisible(false);
        this.bg.setInteractive().on('pointerdown', () => { });
        this.add(this.bg);

        const popup = scene.add.image(0, 0, assets.popup_bg).setScale(1.1, 0.7);
        popup.setInteractive().on('pointerdown', () => { });
        popup.setInteractive().on('pointerup', () => { });
        this.add(popup);

        this.title = scene.add.text(0, -250, '', {
            align: 'center', fontFamily: config.fonts.text, fontSize: '74px', fontStyle: 'bold', stroke: '#4f4f8f', strokeThickness: 4, 'shadow.offsetY': 5, 'shadow.color': '#8f8cd3', 'shadow.blur': 2, 'shadow.stroke': true,
        });
        this.title.setWordWrapWidth(popup.displayWidth - 150, true);
        this.title.setOrigin(0.5, 0.5);
        this.add(this.title);

        this.message = scene.add.text(0, -25, '', {
            fontSize: '50px', fontFamily: config.fonts.text, color: '#ffffff', align: 'center',
        });
        this.message.setOrigin(0.5, 0.5);
        this.message.setWordWrapWidth(popup.displayWidth - 190, true);
        this.add(this.message);

        this.container_confirm = scene.add.container(0, 0);
        this.add(this.container_confirm);
        this.container_prpmpt = scene.add.container(0, 0);
        this.add(this.container_prpmpt);

        const btn_yes = scene.add.image(-150, 195, assets.btn_green);
        btn_yes.setInteractive().on('pointerdown', () => {
            this.scene?.oSoundManager?.playSound(this.scene?.oSoundManager?.btn_sound, false);
            this?.onConfirm();
            this.close();
        }).setScale(0.8);
        this.container_confirm.add(btn_yes);

        const btn_yes_text = scene.add.text(btn_yes.x, btn_yes.y - 5, ' Yes ', {
            fontFamily: config.fonts.text, fontSize: '60px', align: 'center'
        });
        btn_yes_text.setOrigin(0.5, 0.5);
        this.container_confirm.add(btn_yes_text);

        const btn_no = scene.add.image(150, 195, assets.btn_red);
        btn_no.setInteractive().on('pointerdown', () => {
            this.scene?.oSoundManager?.playSound(this.scene?.oSoundManager?.btn_sound, false);
            this?.onCancel();
            this.close();
        }).setScale(0.8);
        this.container_confirm.add(btn_no);

        const btn_no_text = scene.add.text(btn_no.x, btn_no.y - 5, ' No ', {
            fontFamily: config.fonts.text, fontSize: '60px', align: 'center'
        });
        btn_no_text.setOrigin(0.5, 0.5);
        this.container_confirm.add(btn_no_text);

        const btn_okay = scene.add.image(0, 195, assets.btn_green);
        btn_okay.setInteractive().on('pointerdown', () => {
            this.scene?.oSoundManager?.playSound(this.scene?.oSoundManager?.btn_sound, false);
            this?.onConfirm();
            this.close();
        }).setScale(0.8);
        this.container_prpmpt.add(btn_okay);

        const btn_okay_text = scene.add.text(btn_okay.x, btn_okay.y - 5, ' Okay ', {
            fontFamily: config.fonts.text, fontSize: '60px', align: 'center'
        });
        btn_okay_text.setOrigin(0.5, 0.5);
        this.container_prpmpt.add(btn_okay_text);
    }
    open({ confirm = false, title = '', message = '', onConfirm = () => { }, onCancel = () => { } }) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        if (confirm) {
            this.container_confirm.setVisible(true);
            this.container_prpmpt.setVisible(false);
        } else {
            this.container_confirm.setVisible(false);
            this.container_prpmpt.setVisible(true);
        }
        this.title.setText(title);
        this.message.setText(message);

        this.setVisible(true);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Elastic.easeOut',
            easeParams: [1.1, 0.9],
            onComplete: () => {
                this.bg.setVisible(true);
            }
        })
    }
    close() {
        this.setVisible(false);
        this.setScale(0);
        this.bg.setVisible(false);
    }
}