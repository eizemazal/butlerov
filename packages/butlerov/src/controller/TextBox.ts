import { Coords } from "../lib/common";
import { Controller } from "./Controller";

export class TextBox {
    coords: Coords = {x: 0, y: 0};
    controller: Controller;
    input: HTMLInputElement | null = null;
    value = "";
    // in case we change and cancel
    old_value = "";
    width = 60;

    onchange: ((value: string) => void) | null = null;
    onclose: (() => void) | null = null;

    private _x = 0;
    private _y = 0;

    constructor(controller: Controller) {
        this.controller = controller;

    }

    public get x(): number {
        return this._x;
    }

    public set x(x: number) {
        this._x = x;
    }

    public get y(): number {
        return this._y;
    }

    public set y(y: number) {
        this._y = y;
    }

    public get visible() {
        return this.input !== null;
    }

    handle_keydown(evt: KeyboardEvent) {
        if (evt.key == "Escape") {
            this.value = this.old_value;
            this.close();
        }
        if (evt.key == "Enter") {
            this.close();
        }
        return;
    }

    open() {
        const stage_elem = this.controller.stage.container();
        if (!this.input) {
            this.input = document.createElement("input");
            stage_elem.append(this.input);
        }
        this.old_value = this.value;
        const rect = stage_elem.getBoundingClientRect();
        rect.x += window.scrollX;
        rect.y += window.scrollY;
        const x = rect.x  + this._x;
        const y = rect.y + this._y;
        const font_size = this.controller.stylesheet.atom_font_size_px;
        const color = this.controller.stylesheet.atom_active_label_color;
        const height = font_size + 2;
        let style = `position: absolute; z-index: 2; left: ${x - font_size / 2}px; top: ${y - height/2}px;`;
        style += `width: ${this.width}px; height: ${height}px;`;
        style +=  `color: ${color}`;
        style += "border-color: 0; outline: 0;";
        const font_family = this.controller.stylesheet.atom_font_family;
        style += `font-family: ${font_family}; font-size: ${font_size}`;

        this.input.setAttribute("style", style);
        this.input.value  = this.value;
        this.input.focus();
        this.input.select();
        this.input.oninput = () => {
            this.value = this.input?.value || "";
        };
    }

    cancel() {
        this.value = this.old_value;
        this.close();
    }

    close() {
        if (this.input) {
            this.input.remove();
            this.input = null;
            if (this.onchange !== null && this.value != this.old_value)
                this.onchange(this.value);
            if (this.onclose !== null)
                this.onclose();
        }
    }
}