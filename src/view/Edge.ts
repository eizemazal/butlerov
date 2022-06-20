import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Bond, BondType } from "../model/Bond";
import { Stylesheet } from "./Stylesheet";
import { Vertex } from "./Vertex";

enum EdgeShape {
    Single,
    Double,
    Triple,
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
    constructor (v1: Vertex, v2: Vertex, stylesheet: Stylesheet, shape: EdgeShape) {
        this.v1 = v1;
        this.v2 = v2;
        this._bond = new Bond(Edge.edge_shape_to_bond_type(shape));
        this._shape = shape;
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

    public set bond(bond: Bond) {
        this._bond = bond;
    }

    public get bond() {
        return this._bond;
    }

    static bond_type_to_edge_shape(bond_type: BondType): EdgeShape {
        switch( bond_type ) {
        case BondType.Single:
            return EdgeShape.Single;
        case BondType.Double:
            return EdgeShape.Double;
        case BondType.Triple:
            return EdgeShape.Triple;
        }
        return EdgeShape.Single;
    }

    static edge_shape_to_bond_type(edge_shape: EdgeShape):BondType  {
        switch( edge_shape ) {
        case EdgeShape.Single:
            return BondType.Single;
        case EdgeShape.Double:
            return BondType.Double;
        case EdgeShape.Triple:
            return BondType.Triple;
        }
    }

    public get active() {
        return this.is_active;
    }

    public set active(active: boolean) {
        if (this.stylesheet.bond_active_color == this.stylesheet.bond_stroke_color)
            return;
        this.is_active = active;
        if (active)
            this.group.children?.forEach(e => e.setAttr("stroke", this.stylesheet.bond_active_color));
        else
            this.group.children?.forEach(e => e.setAttr("stroke", this.stylesheet.bond_stroke_color));
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

    _draw_single() {
        const line = this.group.findOne("#bond_line") ||
            new Konva.Line({
                stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
                strokeWidth: this.stylesheet.bond_thickness_px,
                hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
                id: "bond_line",
            });
        this.group.findOne("#bond_line2")?.destroy();
        this.group.findOne("#bond_line3")?.destroy();
        line.setAttr("x", this.x1);
        line.setAttr("y", this.y1);
        line.setAttr("points", [ 0, 0, -this.length*Math.sin(this.alfa), this.length*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line);
    }

    _draw_double() {
        this.group.findOne("#bond_line3")?.destroy();
        const line = this.group.findOne("#bond_line") ||
        new Konva.Line({
            stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
            strokeWidth: this.stylesheet.bond_thickness_px,
            hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
            id: "bond_line",
        });
        line.setAttr("x", this.x1);
        line.setAttr("y", this.y1);
        line.setAttr("points", [ 0, 0, -this.length*Math.sin(this.alfa), this.length*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line);

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
        const line = this.group.findOne("#bond_line") ||
        new Konva.Line({
            stroke: this.is_active ? this.stylesheet.bond_active_color : this.stylesheet.bond_stroke_color,
            strokeWidth: this.stylesheet.bond_thickness_px,
            hitStrokeWidth: Math.max(this.stylesheet.bond_thickness_px, this.stylesheet.hit_stroke_width),
            id: "bond_line",
        });
        line.setAttr("x", this.x1);
        line.setAttr("y", this.y1);
        line.setAttr("points", [ 0, 0, -this.length*Math.sin(this.alfa), this.length*Math.cos(this.alfa) ]);
        this.group.add(<Konva.Line>line);

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
        this._shape = Edge.bond_type_to_edge_shape(this.bond.bond_type);
        this.calculate_coordinates();
        switch(this._shape) {
        case EdgeShape.Single:
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

    as_group(): Konva.Group {
        return this.group;
    }

}

export { Edge, EdgeShape };