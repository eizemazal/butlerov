import Konva from "konva";
import { MoleculeEditor } from "../main";
import { KonvaEventObject } from "konva/lib/Node";
import { Atom } from "../model/Atom";
import { Edge, EdgeShape } from "./Edge";
import { Stylesheet } from "./Stylesheet";
import { Vertex } from "./Vertex";

class Graph {
    vertices: Array<Vertex>;
    edges: Array<Edge>;
    group: Konva.Group;
    stylesheet: Stylesheet;
    controller: MoleculeEditor;

    constructor(stylesheet: Stylesheet, controller: MoleculeEditor) {
        this.controller = controller;
        this.stylesheet = stylesheet;
        this.vertices = [];
        this.edges = [];
        this.controller.stage.width();
        this.group = new Konva.Group();
    }

    load_mol_string(mol_str: string) {
        this.clear();
        const lines = mol_str.split("\n");
        if (lines.length < 5) {
            throw Error("The mol string is invalid.");
        }
        // discard lines 0,1,2
        let offset = 3;
        let match_object = lines[offset].match(/^\s*(\d+)\s*(\d+)/);
        if (!match_object) {
            throw Error("String header block counts line does not match molfile specification");
        }
        const atom_count = parseInt(match_object[1]);
        const bond_count = parseInt(match_object[2]);
        if (lines.length < atom_count + bond_count + 5) {
            throw Error("Unexpected length of mol string");
        }
        offset += 1;
        for (let i = offset; i < offset+atom_count; i++) {
            match_object = lines[i].match(/^\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(\w{1,2})/);
            if (!match_object)
                throw Error(`Error in line ${i}, unable to parse atom declaration`);
            const x = parseFloat(match_object[1]);
            const y = -parseFloat(match_object[3]);
            const element = match_object[7];
            const atom = new Atom(x, y, element);
            this.add_vertex_for_atom(atom);
        }
        offset += atom_count;
        for (let i = offset; i < offset+bond_count; i++) {
            match_object = lines[i].match(/^\s*(\d+)\s+(\d+)\s+(\d+)/);
            if (!match_object)
                throw Error(`Error in line ${i}, unable to parse bond declaration`);

            // mol files use base-1 unlike arrays that are base-0
            const atom_index1 = parseInt(match_object[1])-1;
            const atom_index2 = parseInt(match_object[2])-1;
            const bond_type = parseInt(match_object[3]);
            this.bind_vertices(this.vertices[atom_index1], this.vertices[atom_index2], Edge.bond_type_to_edge_shape(bond_type));
        }
    }

    get_mol_string(): string {
        let r = "";
        r += "Molecule name\n";
        r += "Generated by Butlerov\n";
        r += "[no comment provided]\n";
        const natoms = `${this.vertices.length}`.padStart(3, " ");
        const nbonds = `${this.edges.length}`.padStart(3, " ");
        r += `${natoms}${nbonds}  0  0  0  0  0  0  0  0  1 V2000\n`;
        this.vertices.forEach(e => {
            const x = `${e.atom.x.toFixed(4)}`.padStart(10, " ");
            const y = `${(-e.atom.y).toFixed(4)}`.padStart(10, " ");
            const z = "    0.0000";
            const element = `${e.atom.label}`.padEnd(3, " ");
            r += `${x}${y}${z} ${element} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
        });
        this.edges.forEach( e => {
            const v1index = `${this.vertices.findIndex(v => v == e.v1)+1}`.padStart(3, " ");
            const v2index = `${this.vertices.findIndex(v => v == e.v2)+1}`.padStart(3, " ");
            const bondtype = `${e.bond.bond_type}`.padStart(3, " ");
            r += `${v1index}${v2index}${bondtype}  0  0  0  0\n`;
        });
        r += "M  END";
        return r;
    }

    get_average_bond_distance() {
        if (!this.edges.length)
            return 1.54; // average CC bond in Angstrøms
        const total_distance = this.edges.reduce( (p, e) =>
            p + Math.sqrt((e.v1.atom.x - e.v2.atom.x)*(e.v1.atom.x - e.v2.atom.x)+(e.v1.atom.y - e.v2.atom.y)*(e.v1.atom.y - e.v2.atom.y)), 0);
        return total_distance / this.edges.length;
    }

    get_molecule_rect() {
        const x_coords = this.vertices.map(e => e.atom.x);
        const y_coords = this.vertices.map(e => e.atom.y);
        return {
            x1: Math.min(...x_coords),
            y1: Math.min(...y_coords),
            x2: Math.max(...x_coords),
            y2: Math.max(...y_coords),
        };
    }

    update() {
        for (const v of this.vertices) {
            v.update();
        }
        for (const e of this.edges) {
            e.update();
        }
    }

    atomic_coords2screen(coordinates: [number, number]): [number, number] {
        return [ coordinates[0]*this.stylesheet.scale + this.stylesheet.offset_x, coordinates[1]*this.stylesheet.scale + this.stylesheet.offset_x ];
    }

    screen_coords2atomic(coordinates: [number, number]): [number, number] {
        return [ (coordinates[0] - this.stylesheet.offset_x ) / this.stylesheet.scale, (coordinates[1] - this.stylesheet.offset_y ) / this.stylesheet.scale ];
    }

    add_vertex(x: number, y: number, label = "C"): Vertex {
        const atom = new Atom( (x - this.stylesheet.offset_x)/this.stylesheet.scale, (y - this.stylesheet.offset_y)/this.stylesheet.scale, label );
        return this.add_vertex_for_atom(atom);
    }

    add_vertex_for_atom(atom: Atom): Vertex {
        const vertex = new Vertex(atom, this.stylesheet);
        vertex.on("dragmove", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => this.controller.on_vertex_dragmove(vertex, evt));
        vertex.on("mouseover", (vertex: Vertex) => this.controller.on_vertex_mouseover(vertex));
        vertex.on("mouseout", (vertex: Vertex) => this.controller.on_vertex_mouseout(vertex));
        vertex.on("click", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => this.controller.on_vertex_click(vertex, evt));
        vertex.on("contextmenu", (vertex: Vertex, evt: KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); this.controller.toggle_menu();} );
        vertex.on("mousedown", (vertex: Vertex) => this.controller.on_vertex_mousedown(vertex));
        vertex.on("mouseup", (vertex: Vertex) => this.controller.on_vertex_mouseup(vertex));
        this.vertices.push(vertex);
        const group = vertex.as_group();
        this.group.add(group);
        return vertex;
    }

    find_vertex_by_atom(atom: Atom) {
        return this.vertices.find(e => e.atom == atom);
    }

    find_edges_by_vertex(vertex: Vertex): Array<Edge> {
        return this.edges.filter(e => e.v1 == vertex || e.v2 == vertex);
    }

    vertices_are_bound(v1: Vertex, v2: Vertex): boolean {
        return this.edges.findIndex( e => (e.v1 == v1 && e.v2 == v2) || (e.v1 == v2 && e.v2 == v1) ) != -1;
    }

    bind_vertices(v1: Vertex, v2: Vertex, edge_shape: EdgeShape = EdgeShape.Single): Edge {
        v1.add_neighbor(v2);
        v2.add_neighbor(v1);
        const edge = new Edge(v1, v2, this.stylesheet, edge_shape);
        edge.on("click", (edge: Edge, evt: KonvaEventObject<MouseEvent>) => this.controller.on_edge_click(edge, evt));
        edge.on("mouseover", (edge: Edge) => this.controller.on_edge_mouseover(edge));
        edge.on("mouseout", (edge: Edge) => this.controller.on_edge_mouseout(edge));
        edge.on("contextmenu", (edge: Edge, evt: KonvaEventObject<MouseEvent>) => { evt.evt.preventDefault(); this.controller.toggle_menu();} );
        this.edges.push(edge);
        const group = edge.as_group();
        this.group.add(group);
        // edges of bonds are below vertices of atoms, put them back
        group.setAttr("zIndex", 0);
        return edge;
    }

    delete_vertex(vertex: Vertex) {
        const edges = this.find_edges_by_vertex(vertex);
        edges.forEach(e => this.delete_edge(e));
        vertex.as_group().destroy();
        this.vertices = this.vertices.filter( e => e != vertex);
    }

    delete_edge(edge: Edge): void {
        edge.as_group().destroy();
        this.edges = this.edges.filter( e => e != edge);
        edge.v1.remove_neighbor(edge.v2);
        edge.v2.remove_neighbor(edge.v1);
        // delete lone vertices
        if (edge.v1.neighbors.length == 0) {
            edge.v1.as_group().destroy();
            this.vertices = this.vertices.filter( e => e != edge.v1);
        }
        if (edge.v2.neighbors.length == 0) {
            edge.v2.as_group().destroy();
            this.vertices = this.vertices.filter( e => e != edge.v2);
        }
    }

    neighboring_vertices(vertex: Vertex): Array<Vertex> {
        const r : Array<Vertex> = [];
        this.edges.filter( e => e.v1 == vertex).forEach(e => r.push(e.v2));
        this.edges.filter( e => e.v2 == vertex).forEach(e => r.push(e.v1));
        return r;
    }

    // for a given set of points, get the one that is farthest all the atoms
    // this is using r2 metric, but this is not perfect sometimes
    // this is computationally intense, use caching to assess only atoms that are near
    least_crowded_point(points: Array<[number, number]>): [number, number] {
        // garbage in garbage out
        if (!points.length)
            return [0,0];
        let best_distance: number | null = null;
        let best_point: [number, number] = points[0];
        for (const point of points) {
            const distance = this.vertices.reduce( (d, e) => d + (e.x-point[0])*(e.x-point[0]) + (e.y-point[1])*(e.y-point[1]), 0 );
            if (best_distance === null || distance > best_distance) {
                best_distance = distance;
                best_point = point;
            }
        }
        return best_point;
    }

    add_bound_vertex_to(vertex: Vertex): Edge {
        const neighbors = this.neighboring_vertices(vertex);
        if (neighbors.length == 0) {
            // make a new bond to 60 deg up and right
            const new_vertex = this.add_vertex(vertex.x + this.stylesheet.bond_length_px*Math.cos(Math.PI/6), vertex.y - this.stylesheet.bond_length_px*Math.sin(Math.PI/6));
            return this.bind_vertices(vertex, new_vertex);
        }
        // for atoms with only one neighbor, add atom and bond at 120 deg to existing bond with the same distance
        if (neighbors.length == 1) {
            const delta_x = neighbors[0].x - vertex.x;
            const delta_y = neighbors[0].y - vertex.y;
            const alfa = Math.atan2(delta_y, delta_x);
            const bond_len = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
            const coordinates = this.least_crowded_point([
                [vertex.x + bond_len * Math.cos(alfa+Math.PI/1.5), vertex.y + bond_len * Math.sin(alfa+Math.PI/1.5)],
                [vertex.x + bond_len * Math.cos(alfa-Math.PI/1.5), vertex.y + bond_len * Math.sin(alfa-Math.PI/1.5)],
            ]);
            const new_vertex = this.add_vertex(coordinates[0], coordinates[1]);
            return this.bind_vertices(vertex, new_vertex);
        }
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        let angles: Array<number> = [];
        angles = neighbors.map(e => Math.atan2(e.y-vertex.y, e.x-vertex.x));
        const bond_len = this.stylesheet.bond_length_px;
        angles.sort( (a,b) => a > b ? 1 : -1);
        let largest_diff = 0;
        let angle1 = 0;
        // find largest angle between adjacent neighbors
        for (let i = 0; i < angles.length; i++) {
            const prev_idx = i == 0 ? angles.length-1 : i-1;
            const diff = i == 0 ? angles[i] - angles[prev_idx] + 2*Math.PI: angles[i] - angles[prev_idx];
            if (diff > largest_diff) {
                largest_diff = diff;
                angle1 = angles[prev_idx];
            }
        }
        // divide the largest angle by half, convert to degress, round the result to 15 deg, and convert back to radians
        const alfa =  Math.PI * Math.round( (angle1 + largest_diff/2)*180/(Math.PI*15) )*15 / 180;
        const new_vertex = this.add_vertex(vertex.x + bond_len * Math.cos(alfa), vertex.y + bond_len * Math.sin(alfa));
        return this.bind_vertices(vertex, new_vertex);
    }

    as_group(): Konva.Group {
        return this.group;
    }

    clear() {
        this.vertices = [];
        this.edges = [];
        this.group.destroyChildren();
    }

    add_chain(vertex: Vertex, natoms: number) {
        const vertices_to_update: Array<Vertex> = [vertex];
        const new_edges: Array<Edge> = [];
        for (let i = 0; i < natoms; i++) {
            const edge = this.add_bound_vertex_to(vertices_to_update[vertices_to_update.length-1]);
            new_edges.push(edge);
            vertices_to_update.push(edge.v2);
        }
        new_edges.forEach(e => e.update());
        vertices_to_update.forEach(e => e.update());
    }

    fuse_ring(edge: Edge, natoms: number) {
        const alfa = Math.atan2(edge.v2.y-edge.v1.y, edge.v2.x-edge.v1.x);
        const beta = (natoms-2) * Math.PI / natoms;
        const h = edge.length * Math.tan(beta/2) / 2;
        const l = edge.length / (2* Math.cos(beta / 2));
        const center_x1 = h * Math.sin(Math.PI - alfa) + (edge.v1.x + edge.v2.x) / 2;
        const center_y1 = h * Math.cos(Math.PI - alfa) + (edge.v1.y + edge.v2.y) / 2;
        const center_x2 = -h * Math.sin(Math.PI - alfa) + (edge.v1.x + edge.v2.x) / 2;
        const center_y2 = -h * Math.cos(Math.PI - alfa) + (edge.v1.y + edge.v2.y) / 2;
        const coordinates: Array<[number, number]> = [];
        let direction = true;
        const least_crowded_center = this.least_crowded_point([[center_x1, center_y1], [center_x2, center_y2]]);
        if (least_crowded_center[0] == center_x1 && least_crowded_center[1] == center_y1) {
            direction = true;
            for (let i = 1; i <= natoms - 2; i++) {
                const angle = Math.PI - beta/2 + alfa + 2*i*Math.PI / natoms;
                const x = center_x1 + l * Math.cos(angle);
                const y = center_y1 + l * Math.sin(angle);
                coordinates.push([x, y]);
            }
        }
        else {
            direction = false;
            for (let i = 1; i <= natoms - 2; i++) {
                const angle = Math.PI - beta/2 + alfa + 2*i*Math.PI / natoms;
                const x = center_x2 - l * Math.cos(angle);
                const y = center_y2 - l * Math.sin(angle);
                coordinates.push([x, y]);
            }
        }
        let last_vertex = direction ? edge.v1 : edge.v2;
        const vertices_to_update: Array<Vertex> = [];
        const edges_to_update: Array<Edge> = [];
        for (const coordinate of coordinates) {
            const vertex = this.add_vertex(coordinate[0], coordinate[1], "C");
            vertices_to_update.push(vertex);
            edges_to_update.push(this.bind_vertices(vertex, last_vertex));
            last_vertex = vertex;
        }
        this.bind_vertices(last_vertex, direction ? edge.v2 : edge.v1);
        vertices_to_update.forEach(e => e.update());
        edges_to_update.forEach(e => e.update());
    }

    attach_ring(vertex: Vertex, natoms: number):void {
        const edge = this.add_bound_vertex_to(vertex);
        this.fuse_ring(edge, natoms);
    }
}

export { Graph };