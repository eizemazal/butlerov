import Konva from "konva";
import { MenuButton } from "./MenuButton";

const HPADDING = 5;
const BTN_SPACING = 5;

class Menu {
    _buttons: Array<MenuButton>;
    group: Konva.Group;
    last_zoom: number;
    constructor() {
        this._buttons = [];
        this.group = new Konva.Group({"x": 0, "y": 0});
        this.update();
        this.last_zoom = 1;
    }
    update() {
        this.group.findOne("#background")?.destroy();
        this.group.removeChildren();
        if (this._buttons.length == 0)
            return;
        const background = new Konva.Rect({
            fill: "#eee",
            stroke: "#ddd",
            opacity: 0.7,
            id: "background",
        });
        background.setAttr("cornerRadius", 3 / this.zoom);
        background.setAttr("strokeWidth", 1 / this.zoom);
        this.group.add(background);
        let y = BTN_SPACING / this.zoom;
        for (const button of this._buttons) {
            const button_group = button.as_group();
            button_group.setAttr("x", HPADDING/this.zoom);
            button_group.setAttr("y", y);
            y += button.height + BTN_SPACING/this.zoom;
            this.group.add(button_group);
        }
        background.setAttr("width", this._buttons[0].width+2*HPADDING/this.zoom);
        background.setAttr("height", y);
    }
    public get x(): number {
        return this.group.getAttr("x");
    }

    public set x(x: number) {
        this.group.setAttr("x", x);
    }

    public get y(): number {
        return this.group.getAttr("y");
    }

    public set y(y: number) {
        this.group.setAttr("y", y);
    }

    public get width() : number {
        return this.group.findOne("#background").width();
    }

    public get height() : number {
        return this.group.findOne("#background").height();
    }

    as_group() {
        return this.group;
    }

    clear_buttons() {
        this.group.destroyChildren();
        this._buttons = [];
    }
    add_button(button: MenuButton): void {
        button.menu = this;
        this._buttons.push(button);
        this.update();
    }

    // this function is called by button when it is toggled
    on_button_fire() {
        this.visible = false;
    }

    public set visible(visible: boolean) {
        if (this._buttons.length == 0) {
            this.group.visible(false);
            return;
        }
        if (visible) {
            // scale changed since opening menu for the last time
            if (this.zoom != this.last_zoom) {
                this.last_zoom = this.zoom;
                this._buttons.forEach(e => e.update());
                this.update();
            }
        }
        this.group.visible(visible);
    }
    public get visible() {
        return this.group.visible();
    }

    public get zoom(): number {
        const stage = this.group.getStage();
        return stage ? stage.scaleX() : 1;
    }

    handle_key(key: string) {
        if (key == "Escape") {
            this.visible = false;
            return;
        }
        for (const btn of this._buttons) {
            if (key.toLowerCase() == btn.key.toLowerCase()) {
                btn.fire();
                return;
            }
        }
    }
}

export {Menu};