import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Bond, BondType, StereoType } from "../model/Bond";
import { Stylesheet } from "./Stylesheet";
import { Vertex } from "./Vertex";

enum EdgeShape {
    Single,
    Double,
    Triple,
    SingleUp,
    SingleDown,
}

class Edge {
    v1: Vertex;
    v2: Vertex;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    _shape: EdgeShape;
    group: Konva.Group;
    length: number;
    stylesheet: Stylesheet;
    protected is_active: boolean;
    // angle between y and line directed from vertex1 to vertex2
    alfa: number;
    _bond: Bond;

    // create edge between vertices, if there is no bond provided between atoms, create it between atoms
    constructor (v1: Vertex, v2: Vertex, stylesheet: Stylesheet, shape = EdgeShape.Single) {
        this.v1 = v1;
        this.v2 = v2;
        this._bond = new Bond();
        this._shape = EdgeShape.Single;
        // set and recompute bond type
        this.shape = shape;
        this.stylesheet = stylesheet;
        this.group = new Konva.Group();
        this.x1 = 0;
        this.x2 = 0;
        this.y1 = 0;
        this.y2 = 0;
        this.length = 0;
        this.alfa = 0;
        this.is_active = false;
        this.update();
    }

    on(event: string, f: (a: Edge, b: KonvaEventObject<MouseEvent>) => void) {
        this.group.on(event, (evt: KonvaEventObject<MouseEvent>) => { f(this, evt); } );
    }

    public get bond_type(): BondType {
        return this._bond.bond_type;
    }

    public set bond_type(bond_type: BondType) {
        this._bond.bond_type = bond_type;
        this.recompute_shape();
    }

    public get bond_stereo(): StereoType {
        return this._bond.stereo;
    }

    public set bond_stereo(stereo: StereoType) {
        this._bond.stereo = stereo;
        this.recompute_shape();
    }

    private recompute_shape(): void {
        switch( this._bond.bond_type ) {
        case BondType.Single:
            switch(this._bond.stereo) {
            case StereoType.Up:
                this._shape = EdgeShape.SingleUp;
                return;
            case StereoType.Down:
                this._shape = EdgeShape.SingleDown;
                return;
            default:
                this._shape = EdgeShape.Single;
                return;
            }
        case BondType.Double:
            this._shape = EdgeShape.Double;
            return;
        case BondType.Triple:
            this._shape = EdgeShape.Triple;
            return;
        }
        this._shape = EdgeShape.Single;
    }

    public get shape() {
        return this._shape;
    }

    public set shape(shape: EdgeShape) {
        this._shape = shape;
        switch( shape ) {
        case EdgeShape.Single:
            this._bond.bond_type = BondType.Single;
            this._bond.stereo = StereoType.Default;
            break;
        case EdgeShape.SingleUp:
            this._bond.bond_type = BondType.Single;
            this._bond.stereo = StereoType.Up;
            break;
        case EdgeShape.SingleDown:
            this._bond.bond_type = BondType.Single;
            this._bond.stereo = StereoType.Down;
            break;
        case EdgeShape.Double:
            this._bond.bond_type = BondType.Double;
            this._bond.stereo = StereoType.Default;
            break;
        case EdgeShape.Triple:
            this._bond.bond_type = BondType.Triple;
            this._bond.stereo = StereoType.Default;
        }
    }

    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        if (this.stylesheet.bond_active_color == this.stylesheet.bond_stroke_color)
            return;
        this.is_active = active;
        if (active) {
            this.group.children?.forEach(e => e.setAttr("stroke", this.stylesheet.bond_active_color));
            this.group.children?.forEach(e => e.setAttr("fill", this.stylesheet.bond_active_color));
        }
        else {
            this.group.children?.forEach(e => e.setAttr("stroke", this.stylesheet.bond_stroke_color));
            this.group.children?.forEach(e => e.setAttr("fill", this.stylesheet.bond_stroke_color));
        }
    }

    calculate_coordinates() {
        this.x1 = this.v1.x;
        this.x2 = this.v2.x;
        this.y1 = this.v1.y;
        this.y2 = this.v2.y;
        this.length = Math.sqrt((this.x2-this.x1)*(this.x2-this.x1)+(this.y2-this.y1)*(this.y2-this.y1));
        if (!this.length)
            return;
        this.alfa = Math.atan2(this.y2-this.y1, this.x2-this.x1) - Math.PI/2;
        this.x1 += Math.sign(this.x2-this.x1) * Math.min(this.v1.width/2, Math.abs(Math.sin(this.alfa)*this.v1.width/2));
        this.x2 += Math.sign(this.x1-this.x2) * Math.min(this.v2.width/2, Math.abs(Math.sin(this.alfa)*this.v2.width/2));
        this.y1 += Math.sign(this.y2-this.y1) * Math.min(this.v1.height/2, Math.abs(Math.cos(this.alfa)*this.v1.height/2));
        this.y2 += Math.sign(this.y1-this.y2) * Math.min(this.v2.height/2, Math.abs(Math.cos(this.alfa)*this.v2.height/2));
        this.length = Math.sqrt((this.x2-this.x1)*(this.x2-this.x1)+(this.y2-this.y1)*(this.y2-this.y1));
    }

    // draw central line for single, double, triple and triangle shaped wedged bond
    _draw_centerline() {
        const line = this.group.findOne("#bond_line") ||
            new Konva.Line({
                stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
                fill: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
                strokeWidth: this.stylesheet.bond_thickness_px,
                hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
                id: "bond_line",
                closed: true,
            });
        line.setAttr("x", this.x1);
        line.setAttr("y", this.y1);
        if ([EdgeShape.Single, EdgeShape.Double, EdgeShape.Triple].indexOf(this._shape) != -1) {
            line.setAttr("points", [ 0, 0, -this.length*Math.sin(this.alfa), this.length*Math.cos(this.alfa) ]);
            line.setAttr("lineJoin", "miter");
        }
        else if (this._shape == EdgeShape.SingleUp) {
            line.setAttr("points", [
                0, 0,
                -this.length*Math.sin(this.alfa) + this.stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.length*Math.cos(this.alfa) + this.stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
                -this.length*Math.sin(this.alfa) - this.stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.length*Math.cos(this.alfa) - this.stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
            ]);
            line.setAttr("fillEnabled", true);
            line.setAttr("lineJoin", "round");
        }
        else if (this._shape == EdgeShape.SingleDown) {
            line.setAttr("points", [
                0, 0,
                -this.length*Math.sin(this.alfa) + this.stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.length*Math.cos(this.alfa) + this.stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
                -this.length*Math.sin(this.alfa) - this.stylesheet.bond_wedge_px*Math.cos(this.alfa)/2,
                this.length*Math.cos(this.alfa) - this.stylesheet.bond_wedge_px*Math.sin( this.alfa)/2,
            ]);
            line.setAttr("fillEnabled", false);
            line.setAttr("lineJoin", "round");
        }
        this.group.add(<Konva.Line>line);
    }

    _draw_single() {
        this.group.findOne("#bond_line2")?.destroy();
        this.group.findOne("#bond_line3")?.destroy();
        this._draw_centerline();
    }

    _draw_double() {
        this.group.findOne("#bond_line3")?.destroy();
        this._draw_centerline();
        const line2 = this.group.findOne("#bond_line2") ||
        new Konva.Line({
            stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
            strokeWidth: this.stylesheet.bond_thickness_px,
            hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
            id: "bond_line2",
        });
        line2.setAttr("x", this.x1 + this.stylesheet.bond_spacing_px*Math.cos(this.alfa) - this.stylesheet.double_bond_shortening*this.length*Math.sin(this.alfa)/2);
        line2.setAttr("y", this.y1 + this.stylesheet.bond_spacing_px*Math.sin(this.alfa) + this.stylesheet.double_bond_shortening*this.length*Math.cos(this.alfa)/2);
        line2.setAttr("points", [ 0, 0, -this.length*(1-this.stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.length*(1-this.stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line2);
    }

    _draw_triple() {
        this._draw_centerline();
        const line2 = this.group.findOne("#bond_line2") ||
        new Konva.Line({
            stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
            strokeWidth: this.stylesheet.bond_thickness_px,
            hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
            id: "bond_line2",
        });
        line2.setAttr("x", this.x1 + this.stylesheet.bond_spacing_px*Math.cos(this.alfa) - this.stylesheet.double_bond_shortening*this.length*Math.sin(this.alfa)/2);
        line2.setAttr("y", this.y1 + this.stylesheet.bond_spacing_px*Math.sin(this.alfa) + this.stylesheet.double_bond_shortening*this.length*Math.cos(this.alfa)/2);
        line2.setAttr("points", [ 0, 0, -this.length*(1-this.stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.length*(1-this.stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line2);

        const line3 = this.group.findOne("#bond_line3") ||
        new Konva.Line({
            stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
            strokeWidth: this.stylesheet.bond_thickness_px,
            hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
            id: "bond_line3",
        });
        line3.setAttr("x", this.x1 - this.stylesheet.bond_spacing_px*Math.cos(this.alfa) - this.stylesheet.double_bond_shortening*this.length*Math.sin(this.alfa)/2);
        line3.setAttr("y", this.y1 - this.stylesheet.bond_spacing_px*Math.sin(this.alfa) + this.stylesheet.double_bond_shortening*this.length*Math.cos(this.alfa)/2);
        line3.setAttr("points", [ 0, 0, -this.length*(1-this.stylesheet.double_bond_shortening)*Math.sin(this.alfa), this.length*(1-this.stylesheet.double_bond_shortening)*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line3);
    }

    update() {
        this.recompute_shape();
        this.calculate_coordinates();
        switch(this._shape) {
        case EdgeShape.Single:
        case EdgeShape.SingleUp:
        case EdgeShape.SingleDown:
            this._draw_single();
            break;
        case EdgeShape.Double:
            this._draw_double();
            break;
        case EdgeShape.Triple:
            this._draw_triple();
            break;
        }
    }

    erase() {
        this.group.destroyChildren();
    }

    as_group(): Konva.Group {
        return this.group;
    }

}

export { Edge, EdgeShape };