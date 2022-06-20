import Konva from "konva";
import { Menu } from "./Menu";

const HPADDING=5;
const VPADDING=5;
const LABEL_FONT_SIZE=9;
const KEY_FONT_SIZE=11;
const BTN_WIDTH=100;
const BTN_HEIGHT=20;

class MenuButton {
    key: string;
    label: string;
    callback: () => void;
    group: Konva.Group;
    _menu: Menu | null;
    _active: boolean;
    constructor (key: string, label: string, callback: () => void) {
        this.key = key;
        this.label = label;
        this.callback = callback;
        this._active = false;
        this._menu = null;
        this.group = new Konva.Group();
        this.group.on("click", () => { this.fire(); } );
        this.group.on("mouseover", () => { this.active = true; } );
        this.group.on("mouseout", () => { this.active = false; } );
        this.update();
    }

    update() {
        const btn = this.group.findOne("#btn") || new Konva.Rect({
            id: "btn",
            fill: "#eee",
            stroke: "#777",
            strokeWidth: 1,
            opacity: 0.7,
            width: BTN_WIDTH,
            height: BTN_HEIGHT,
            cornerRadius: 3,
        });
        btn.setAttr("stroke", this._active ? "#000" : "#777");
        btn.setAttr("fill", this._active ? "#ddd" : "#eee");
        const key_caption = this.group.findOne("#key_caption") || new Konva.Text({
            "id": "key_caption",
            fill: "#444",
            fontSize: KEY_FONT_SIZE,
            fontStyle: "bold",
            text: this.key,
        });
        key_caption.setAttr("fill", this._active ? "#333" : "#444");
        key_caption.setAttr("text", this.key);
        key_caption.setAttr("x", btn.getAttr("width") - key_caption.width() - VPADDING);
        key_caption.setAttr("y", VPADDING);
        const label = this.group.findOne("#label") || new Konva.Text({
            "id": "label",
            fill: "#444",
            fontSize: LABEL_FONT_SIZE,
            x: HPADDING,
        });
        label.setAttr("text", this.label);
        label.setAttr("fill", this._active ? "#333" : "#444");
        label.setAttr("x", HPADDING);
        label.setAttr("y", (BTN_HEIGHT - label.height())/2 );
        this.group.add(<Konva.Rect>btn);
        this.group.add(<Konva.Text>key_caption);
        this.group.add(<Konva.Text>label);
    }

    public get height(): number {
        return BTN_HEIGHT;
    }
    public get width(): number {
        return BTN_WIDTH;
    }

    public get active() {
        return this._active;
    }

    public set active(active: boolean) {
        this._active = active;
        this.update();
    }

    public set menu(menu: Menu) {
        this._menu = menu;
    }

    as_group() {
        return this.group;
    }

    fire() {
        if (this._menu)
            this._menu.on_button_fire();
        this.callback();
    }
}

export { MenuButton };