import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Atom } from "../model/Atom";
import { Stylesheet } from "./Stylesheet";

class Vertex {
    protected group: Konva.Group;
    protected text: Konva.Text | null;
    protected circle: Konva.Circle | null;
    protected active_box: Konva.Rect | null;
    protected _label: string;
    protected _atom: Atom;
    protected stylesheet: Stylesheet;
    protected _neighbors: Array<Vertex>;
    protected is_active: boolean;

    constructor(atom: Atom, stylesheet: Stylesheet) {
        this._atom = atom;
        this.stylesheet = stylesheet;
        this.group = new Konva.Group({
            draggable: true,
        });
        this.text = null;
        this.circle = null;
        this.active_box = null;
        this._label = "";
        this.is_active = false;
        this._neighbors = [];
        this.update();
    }

    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        this.is_active = active;
        this.update();
    }

    update() {
        this.group.draggable(this._neighbors.length <= 1);
        this.group.setAttr("x", this.atom.x*this.stylesheet.scale + this.stylesheet.offset_x);
        this.group.setAttr("y", this.atom.y*this.stylesheet.scale + this.stylesheet.offset_y);
        this._label = this.atom.label == "C" && this.neighbors.length ? "" : this.atom.label;
        if (this._label) {
            this.group.findOne("#circle")?.destroy();
            this.group.findOne("#active_box")?.destroy();
            this.active_box = null;
            this.circle = null;
            this.text = <Konva.Text>this.group.findOne("#text") || new Konva.Text({
                x: 0,
                y: 0,
                fontFamily: this.stylesheet.atom_font_family,
                fontSize: this.stylesheet.atom_font_size_px,
                id: "text",
            });
            this.text.setAttr("text", this._label);
            this.text.setAttr("fill", this.is_active ? this.stylesheet.atom_active_label_color : this.stylesheet.atom_label_color);
            this._center_text();
            this.group.add(this.text);
        }
        else {
            this.group.findOne("#text")?.destroy();
            this.text = null;
            this.circle = <Konva.Circle>this.group.findOne("#circle") || new Konva.Circle({
                x: 0,
                y: 0,
                fill: this.stylesheet.bond_stroke_color,
                id: "circle",
            });
            this.circle.setAttr("radius", this._neighbors.length > 1 ? this.stylesheet.bond_thickness_px/2 : 0);
            this.group.add(this.circle);
            this.active_box = <Konva.Rect>this.group.findOne("#active_box") || new Konva.Rect({
                x: -5,
                y: -5,
                width: 10,
                height: 10,
                stroke: this.stylesheet.atom_active_box_color,
                strokeWidth: 1,
                id: "active_box",
            });
            this.active_box.setAttr("strokeWidth", this.is_active ? 1 : 0);
            this.group.add(this.active_box);
        }
    }

    on(event: string, f: (a: Vertex, b: KonvaEventObject<MouseEvent>) => void) {
        this.group.on(event, (evt: KonvaEventObject<MouseEvent>) => { f(this, evt); } );
    }

    // this is called back to set coordinates on drag
    on_drag(snap_to_angle: boolean) {
        if (this._neighbors.length != 1)
            return;
        const neighbor = this._neighbors[0];
        let alfa = Math.atan2(this.y - neighbor.y, this.x - neighbor.x);
        if (snap_to_angle)
            alfa = Math.round((alfa * 180 / Math.PI) / this.stylesheet.bond_snap_degrees)*this.stylesheet.bond_snap_degrees * Math.PI/180;
        this.x = neighbor.x + Math.cos(alfa) * this.stylesheet.bond_length_px;
        this.y = neighbor.y + Math.sin(alfa) * this.stylesheet.bond_length_px;
        this.atom.x = (this.x - this.stylesheet.offset_x) / this.stylesheet.scale;
        this.atom.y = (this.y - this.stylesheet.offset_y) / this.stylesheet.scale;
    }

    _center_text() {
        this.text?.setAttr("x", -this.text.width() / 2);
        this.text?.setAttr("y", -this.text.height() / 2);
    }

    public get x() {
        return this.group.getAttr("x");
    }

    public set x(x: number) {
        this.group.setAttr("x", x);
    }

    public get y() {
        return this.group.getAttr("y");
    }

    public set y(x: number) {
        this.group.setAttr("y", x);
    }

    public get label() {
        return this._label;
    }

    public set label(label: string) {
        this._label = label;
        this.update();
    }

    public get width() {
        return this.text ? this.text.width() + this.stylesheet.atom_label_horizontal_clearance_px : 0;
    }

    public get height() {
        return this.text ? this.text.height() + this.stylesheet.atom_label_vertical_clearance_px : 0;
    }

    public get atom() {
        return this._atom;
    }

    public get neighbors() {
        return this._neighbors;
    }

    public add_neighbor(vertex: Vertex) {
        this._neighbors.push(vertex);
        this.update();
    }

    public remove_neighbor(vertex: Vertex) {
        const index = this._neighbors.findIndex(e => e == vertex);
        if (index == -1)
            return;
        this._neighbors.splice(index, 1);
        this.update();
    }

    as_group(): Konva.Group {
        return this.group;
    }
}

export { Vertex };