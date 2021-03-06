import Konva from "konva";
import { MoleculeEditor } from "../main";
import { Edge, EdgeOrientation, EdgeShape, EdgeTopology } from "./Edge";
import { AtomicCoords, ScreenCoords, Vertex, VertexTopology } from "./Vertex";

type Rect = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

class Graph {
    vertices: Array<Vertex>;
    edges: Array<Edge>;
    group: Konva.Group | null;
    controller: MoleculeEditor | null;
    ringsystems: Array<Graph>;

    constructor() {
        this.controller = null;
        this.vertices = [];
        this.edges = [];
        this.group = null;
        this.ringsystems = [];
    }

    // provide a detached copy of the graph, maintaining connectivity and order of vertices and edges in the lists
    copy() {
        const r = new Graph();
        r.vertices = this.vertices.map( e => e.copy() );
        r.edges = this.edges.map( e => {
            const v1 = r.vertices[this.vertices.findIndex( v => v == e.v1 )];
            const v2 = r.vertices[this.vertices.findIndex( v => v == e.v2 )];
            v1.add_neighbor(v2, e.bond_order);
            v2.add_neighbor(v1, e.bond_order);
            return e.copy(v1, v2);
        });
        return r;
    }

    attach(controller: MoleculeEditor) {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        this.vertices.forEach( e => this.group?.add(e.attach(controller)) );
        this.edges.forEach( e => this.group?.add(e.attach(controller)) );
    }

    detach() {
        this.vertices.forEach( e => e.detach() );
        this.edges.forEach( e => e.detach() );
        this.group = null;
        this.controller = null;
    }

    load_mol_string(mol_str: string) : void {
        this.clear();
        const lines = mol_str.split("\n");
        if (lines.length < 5) {
            throw Error("The mol string is invalid.");
        }
        // discard lines 0,1,2
        let offset = 3;
        let atom_count;
        let bond_count;
        try {
            atom_count = parseInt(lines[offset].substring(0,3));
            bond_count = parseInt(lines[offset].substring(3,6));
        }
        catch {
            throw Error("String header block counts line does not match molfile specification");
        }
        if (lines.length < atom_count + bond_count + 5) {
            throw Error("Unexpected length of mol string");
        }
        offset += 1;
        for (let i = offset; i < offset+atom_count; i++) {
            const match_object = lines[i].match(/^\s*(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)\s+(\w{1,2})/);
            if (!match_object)
                throw Error(`Error in line ${i}, unable to parse atom declaration`);
            const x = parseFloat(match_object[1]);
            const y = -parseFloat(match_object[3]);
            const element = match_object[7];
            this.add_vertex({x: x, y: y}, element);
        }
        offset += atom_count;
        for (let i = offset; i < offset+bond_count; i++) {
            let atom_index1: number;
            let atom_index2: number;
            let bond_type: number;
            let stereo: number;
            try {
                // mol files use base-1 unlike arrays that are base-0
                atom_index2 = parseInt(lines[i].substring(0,3)) - 1;
                atom_index1 = parseInt(lines[i].substring(3,6)) - 1;
                bond_type = parseInt(lines[i].substring(6,9));
                stereo = parseInt(lines[i].substring(9,12));
            }
            catch {
                throw Error(`Error in line ${i}, unable to parse bond declaration`);
            }
            const edge = this.bind_vertices(this.vertices[atom_index2], this.vertices[atom_index1], EdgeShape.Single, false);
            edge.bond_type = bond_type;
            edge.bond_stereo = stereo;
        }
        offset += bond_count;
        for (let i = offset; i < lines.length; i++) {
            if (lines[i].match(/\s*M\s+END\s*$/))
                break;
            if (lines[i].match(/\s*M\s+CHG\s+.+/)) {
                const match_object = lines[i].match(/\s*M\s+CHG\s+(\d+)(.+)$/);
                if (!match_object)
                    throw Error("Charge line inconsistent.");
                const count = parseInt(match_object[1]);
                const atom_charges = match_object[2].trim().split(/\s+/);
                if (count*2 != atom_charges.length)
                    throw Error("Charge line inconsistent - count does not match data.");
                for (let j = 0; j < count; j++) {
                    const v_index = parseInt(atom_charges[j*2]) - 1;
                    const charge = parseInt(atom_charges[j*2 + 1]);
                    this.vertices[v_index].charge = charge;
                }
            }
        }

        if (this.controller != null) {
            const c = this.controller;
            this.vertices.forEach( e=> { this.group?.add(e.attach(c)); });
            this.edges.forEach( e=> { this.group?.add(e.attach(c)); e.z_index = 0; } );
        }
        this.update_topology();
    }

    get_mol_string(): string {
        let r = "";
        r += "Molecule name\n";
        r += "Generated by Butlerov\n";
        r += "[no comment provided]\n";
        const natoms = `${this.vertices.length}`.padStart(3, " ");
        const nbonds = `${this.edges.length}`.padStart(3, " ");
        r += `${natoms}${nbonds}  0  0  0  0  0  0  0  0  1 V2000\n`;
        const charges:Array<string> = [];
        this.vertices.forEach((e,idx) => {
            const x = `${e.atomic_coords.x.toFixed(4)}`.padStart(10, " ");
            const y = `${(-e.atomic_coords.y).toFixed(4)}`.padStart(10, " ");
            const z = "    0.0000";
            const element = `${e.label ? e.label : "C"}`.padEnd(3, " ");
            r += `${x}${y}${z} ${element} 0  0  0  0  0  0  0  0  0  0  0  0\n`;
            if (e.charge)
                charges.push(`${idx+1}`, `${e.charge}`);
        });
        this.edges.forEach( e => {
            const v1index = `${this.vertices.findIndex(v => v == e.v1)+1}`.padStart(3, " ");
            const v2index = `${this.vertices.findIndex(v => v == e.v2)+1}`.padStart(3, " ");
            const bondtype = `${e.bond_type}`.padStart(3, " ");
            const stereo = `${e.bond_stereo}`.padStart(3, " ");
            r += `${v1index}${v2index}${bondtype}${stereo}  0  0  0\n`;
        });
        if (charges.length) {
            r += "M  CHG" + `${charges.length/2}`.padStart(3, " ");
            r += charges.reduce((a, e) => a + e.padStart(4, " "), "") + "\n";
        }
        r += "M  END";
        return r;
    }

    get_average_bond_distance() : number {
        if (!this.edges.length)
            return 1.54; // average CC bond in Angstr??ms
        const total_distance = this.edges.reduce( (p, e) =>
            p + Math.sqrt((e.v1.atomic_coords.x - e.v2.atomic_coords.x)*(e.v1.atomic_coords.x - e.v2.atomic_coords.x)+(e.v1.atomic_coords.y - e.v2.atomic_coords.y)*(e.v1.atomic_coords.y - e.v2.atomic_coords.y)), 0);
        return total_distance / this.edges.length;
    }

    get_molecule_rect() : Rect {
        if (!this.vertices.length)
            return {x1: 0, y1: 0, x2: 100, y2: 100};
        const x_coords = this.vertices.map(e => e.atomic_coords.x);
        const y_coords = this.vertices.map(e => e.atomic_coords.y);
        return {
            x1: Math.min(...x_coords),
            y1: Math.min(...y_coords),
            x2: Math.max(...x_coords),
            y2: Math.max(...y_coords),
        };
    }

    update() : void {
        for (const v of this.vertices) {
            v.update();
        }
        for (const e of this.edges) {
            e.update();
        }
    }

    add_single_vertex(coords: ScreenCoords, label="C"): Graph {
        const graph = new Graph();
        graph.vertices = [this.add_vertex_by_screen_coords(coords, label)];
        this.update();
        return graph;
    }

    private add_vertex_by_screen_coords(coords: ScreenCoords, label = "C"): Vertex {
        if (!this.controller)
            throw("Graph not attached to controller");
        const vertex = new Vertex();
        this.vertices.push(vertex);
        this.group?.add(vertex.attach(this.controller));
        vertex.screen_coords = coords;
        vertex.label = label;
        return vertex;
    }

    add_vertex( coords: AtomicCoords, label = "C"): Vertex {
        const vertex = new Vertex();
        vertex.label = label;
        vertex.atomic_coords = coords;
        this.vertices.push(vertex);
        return vertex;
    }

    find_edges_by_vertex(vertex: Vertex): Array<Edge> {
        return this.edges.filter(e => e.v1 == vertex || e.v2 == vertex);
    }

    vertices_are_bound(v1: Vertex, v2: Vertex): boolean {
        return this.edges.findIndex( e => (e.v1 == v1 && e.v2 == v2) || (e.v1 == v2 && e.v2 == v1) ) != -1;
    }

    add(graph: Graph): void {
        this.vertices.push(...graph.vertices);
        this.edges.push(...graph.edges);
        this.edges.forEach(e => { e.v1.add_neighbor(e.v2, e.bond_order); e.v2.add_neighbor(e.v1, e.bond_order); });
        if (this.controller) {
            const controller = this.controller;
            graph.vertices.forEach(e => { this.group?.add(e.attach(controller)); });
            graph.edges.forEach(e => { this.group?.add(e.attach(controller)); e.z_index = 0; } );
        }
        this.update();
    }

    remove(graph: Graph) : void {
        graph.vertices.forEach( e  => e.detach() );
        graph.edges.forEach( e  => e.detach() );
        this.vertices = this.vertices.filter(e => graph.vertices.indexOf(e) == -1);
        this.edges = this.edges.filter( e => graph.edges.indexOf(e) == -1);
        graph.edges.forEach( e => { e.v1.remove_neighbor(e.v2); e.v2.remove_neighbor(e.v1); });
        this.update();
    }

    bind_vertices(v1: Vertex, v2: Vertex, edge_shape: EdgeShape = EdgeShape.Single, attach = true): Edge {
        const edge = new Edge(v1, v2);
        edge.shape = edge_shape;
        v1.add_neighbor(v2, edge.bond_order);
        v2.add_neighbor(v1, edge.bond_order);
        this.edges.push(edge);
        if (attach && this.controller) {
            this.group?.add(edge.attach(this.controller));
            // edges of bonds are below vertices of atoms, put them back
            edge.z_index = 0;
            this.update_topology();
        }
        return edge;
    }

    delete_vertex(vertex: Vertex): Graph {
        const r: Graph = new Graph();
        const edges = this.find_edges_by_vertex(vertex);
        edges.forEach(e => { const s = this.delete_edge(e); r.vertices.push(...s.vertices); r.edges.push(...s.edges); });
        vertex.detach();
        this.vertices = this.vertices.filter( e => e != vertex);
        return r;
    }

    delete_edge(edge: Edge, drop_dangling_vertices = true): Graph {
        const r: Graph = new Graph();
        r.edges.push(edge);
        edge.detach();
        this.edges = this.edges.filter( e => e != edge);
        edge.v1.remove_neighbor(edge.v2);
        edge.v2.remove_neighbor(edge.v1);
        // delete lone vertices
        if (drop_dangling_vertices && edge.v1.neighbors.length == 0) {
            edge.v1.detach();
            r.vertices.push(edge.v1);
            this.vertices = this.vertices.filter( e => e != edge.v1);
        }
        if (drop_dangling_vertices && edge.v2.neighbors.length == 0) {
            edge.v2.detach();
            r.vertices.push(edge.v2);
            this.vertices = this.vertices.filter( e => e != edge.v2);
        }
        return r;
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
    least_crowded_point(points: Array<ScreenCoords>): ScreenCoords {
        // garbage in garbage out
        if (!points.length)
            return {x: 0, y: 0};
        let best_distance: number | null = null;
        let best_point: ScreenCoords = points[0];
        for (const point of points) {
            const distance = this.vertices.reduce( (d, e) => d + (e.screen_coords.x-point.x)*(e.screen_coords.x-point.x) + (e.screen_coords.y-point.y)*(e.screen_coords.y-point.y), 0 );
            if (best_distance === null || distance > best_distance) {
                best_distance = distance;
                best_point = point;
            }
        }
        return best_point;
    }

    add_bound_vertex_to(vertex: Vertex): Graph {
        if (!this.controller)
            throw Error("Graph not attached to controller.");
        const r = new Graph();
        const neighbors = this.neighboring_vertices(vertex);
        const bond_len = this.controller.stylesheet.bond_length_px;
        if (neighbors.length == 0) {
            // make a new bond to 60 deg up and right
            const new_vertex = this.add_vertex_by_screen_coords({
                x: vertex.screen_coords.x + bond_len * Math.cos(Math.PI/6),
                y: vertex.screen_coords.y - bond_len * Math.sin(Math.PI/6)
            });
            r.edges = [this.bind_vertices(vertex, new_vertex)];
            r.vertices = [new_vertex];
            return r;
        }
        // for atoms with only one neighbor, add atom and bond at 120 deg to existing bond with the same distance
        if (neighbors.length == 1) {
            const delta_x = neighbors[0].screen_coords.x - vertex.screen_coords.x;
            const delta_y = neighbors[0].screen_coords.y - vertex.screen_coords.y;
            const alfa = Math.atan2(delta_y, delta_x);
            const bond_len = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
            const coordinates: ScreenCoords = this.least_crowded_point([
                {
                    x: vertex.screen_coords.x + bond_len * Math.cos(alfa+Math.PI/1.5),
                    y: vertex.screen_coords.y + bond_len * Math.sin(alfa+Math.PI/1.5)
                },
                {
                    x: vertex.screen_coords.x + bond_len * Math.cos(alfa-Math.PI/1.5),
                    y: vertex.screen_coords.y + bond_len * Math.sin(alfa-Math.PI/1.5)
                },
            ]);
            const new_vertex = this.add_vertex_by_screen_coords(coordinates);
            r.edges = [this.bind_vertices(vertex, new_vertex)];
            r.vertices = [new_vertex];
            return r;
        }
        // help drawing polysubstituted atoms. We can move vertices which have no other neighbors
        let movable_neighbors = neighbors.filter(e => e.neighbors.length == 1);
        let fixed_neighbors = neighbors.filter(e => e.neighbors.length != 1);
        // list of positive angles between x axis and corresponding neighboring atom, written as [index, angle in radians]
        if (!fixed_neighbors.length)
            fixed_neighbors.push(...movable_neighbors.splice(0, 1));
        let angles: Array<number> = [];
        if (fixed_neighbors.length > 2 || (fixed_neighbors.length == 2 && movable_neighbors.length > 1)) {
            fixed_neighbors = neighbors;
            movable_neighbors = [];
        }
        angles = fixed_neighbors.map(e => Math.atan2(e.screen_coords.y-vertex.screen_coords.y, e.screen_coords.x-vertex.screen_coords.x));
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

        const new_vertex = this.add_vertex_by_screen_coords({
            x: vertex.screen_coords.x + bond_len,
            y: vertex.screen_coords.y
        });
        r.edges = [this.bind_vertices(vertex, new_vertex)];
        r.vertices = [new_vertex];
        movable_neighbors.push(new_vertex);

        for (let i = 0; i < movable_neighbors.length; i++) {
            const neighbor_to_move = movable_neighbors[i];
            // divide the largest angle by half, convert to degress, round the result to 15 deg, and convert back to radians
            const alfa =  Math.PI * Math.round( (angle1 + largest_diff*(i+1)/(movable_neighbors.length + 1))*180/(Math.PI*15) )*15 / 180;
            neighbor_to_move.screen_coords = {
                x: vertex.screen_coords.x + bond_len * Math.cos(alfa),
                y: vertex.screen_coords.y + bond_len * Math.sin(alfa)
            };
            this.edges.find(e => e.v1 == neighbor_to_move || e.v2 == neighbor_to_move)?.update();
        }
        return r;
    }

    as_group(): Konva.Group {
        if (!this.group)
            throw Error("Graph not attached to controller");
        return this.group;
    }

    clear() : void {
        this.vertices = [];
        this.edges = [];
        this.group?.destroyChildren();
    }

    add_default_fragment(coords: ScreenCoords): Graph {
        const vertex1 = this.add_vertex_by_screen_coords(coords);
        const r = new Graph();
        r.vertices = [vertex1];
        const frag = this.add_bound_vertex_to(vertex1);
        r.vertices = [ ...r.vertices, ...frag.vertices ];
        r.edges = [ ...r.edges, ...frag.edges ];
        return r;
    }

    add_chain(vertex: Vertex, natoms: number) : Graph {
        const r = new Graph;
        r.vertices = [vertex];
        for (let i = 0; i < natoms; i++) {
            const fragment = this.add_bound_vertex_to(r.vertices[r.vertices.length-1]);
            r.edges.push(fragment.edges[0]);
            r.vertices.push(fragment.vertices[0]);
        }
        r.edges.forEach(e => e.update());
        r.vertices.forEach(e => e.update());
        // remove vertex that we added initially
        r.vertices = r.vertices.filter(e => e != vertex);
        return r;
    }

    fuse_ring(edge: Edge, natoms: number): Graph {
        const alfa = Math.atan2(edge.v2.screen_coords.y-edge.v1.screen_coords.y, edge.v2.screen_coords.x-edge.v1.screen_coords.x);
        const beta = (natoms-2) * Math.PI / natoms;
        const h = edge.center_length * Math.tan(beta/2) / 2;
        const l = edge.center_length / (2* Math.cos(beta / 2));
        const center_x1 = h * Math.sin(Math.PI - alfa) + (edge.v1.screen_coords.x + edge.v2.screen_coords.x) / 2;
        const center_y1 = h * Math.cos(Math.PI - alfa) + (edge.v1.screen_coords.y + edge.v2.screen_coords.y) / 2;
        const center_x2 = -h * Math.sin(Math.PI - alfa) + (edge.v1.screen_coords.x + edge.v2.screen_coords.x) / 2;
        const center_y2 = -h * Math.cos(Math.PI - alfa) + (edge.v1.screen_coords.y + edge.v2.screen_coords.y) / 2;
        const coordinates: Array<[number, number]> = [];
        let direction = true;
        const least_crowded_center:ScreenCoords = this.least_crowded_point([{x:center_x1, y:center_y1}, {x:center_x2, y:center_y2}]);
        if (least_crowded_center.x == center_x1 && least_crowded_center.y == center_y1) {
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
        const r = new Graph();
        for (const coordinate of coordinates) {
            const vertex = this.add_vertex_by_screen_coords({x: coordinate[0], y:coordinate[1]}, "C");
            r.vertices.push(vertex);
            r.edges.push(this.bind_vertices(vertex, last_vertex));
            last_vertex = vertex;
        }
        r.edges.push(this.bind_vertices(last_vertex, direction ? edge.v2 : edge.v1));
        r.vertices.forEach(e => e.update());
        r.edges.forEach(e => e.update());
        return r;
    }

    attach_ring(vertex: Vertex, natoms: number) : Graph {
        const r: Graph = this.add_bound_vertex_to(vertex);
        const frag = this.fuse_ring(r.edges[0], natoms);
        r.vertices = [...r.vertices, ...frag.vertices];
        r.edges = [...r.edges, ...frag.edges];
        return r;
    }

    add_numbering(): void {
        this.vertices.forEach( (e,idx) => e.id = `${idx}` );
        this.edges.forEach( (e,idx) => e.id = `${idx}` );
    }

    // get subgraphs as separate graphs. Subgraphs do not have connected paths between each other.
    subgraphs(): Array<Graph> {
        const res: Array<Graph> = [];
        const rest_vertices: Set<Vertex> = new Set(this.vertices);
        while (rest_vertices.size) {
            const subgraph_vertices: Set<Vertex> = new Set();
            const to_visit: Set<Vertex> = new Set([rest_vertices.values().next().value]);
            while (to_visit.size) {
                const vertex = to_visit.values().next().value;
                rest_vertices.delete(vertex);
                to_visit.delete(vertex);
                subgraph_vertices.add(vertex);
                for (const neighbor of vertex.neighbors) {
                    if (subgraph_vertices.has(neighbor.vertex))
                        continue;
                    to_visit.add(neighbor.vertex);
                }
            }
            const subgraph = new Graph();
            subgraph.vertices = [...subgraph_vertices];
            subgraph.edges = this.edges.filter(e => subgraph_vertices.has(e.v1) );
            res.push(subgraph);
        }
        return res;
    }

    edge_topology(edge: Edge): EdgeTopology {
        if ( edge.v1.neighbors.length == 1 || edge.v2.neighbors.length == 1)
            return EdgeTopology.Chain;
        const edge_index = this.edges.findIndex(e => e == edge);
        const graph_copy = this.copy();
        const edge_copy = graph_copy.edges[edge_index];
        const nsubgraphs = graph_copy.subgraphs().length;
        graph_copy.delete_edge(edge_copy, false);
        const nsubgraphs2 = graph_copy.subgraphs().length;
        return nsubgraphs == nsubgraphs2 ? EdgeTopology.Ring : EdgeTopology.Chain;
    }

    /**
     * Re-calculate orientation of bond (left, right, symmetrical) for the specified edge in the graph.
     * @param edge Edge whose orientation to be updated.
     * @param update_view Whether to call edge.update() to update view. @default true
     * @returns void
     */
    update_edge_orientation(edge: Edge, update_view = true) : void {
        if (!edge.is_asymmetric)
            return;
        for (const ringsystem of this.ringsystems) {
            if (ringsystem.edges.findIndex(e => e == edge) != -1) {
                const center = {
                    x: ringsystem.vertices.reduce( (p, e) => p + e.screen_coords.x, 0)/ringsystem.vertices.length,
                    y: ringsystem.vertices.reduce( (p, e) => p + e.screen_coords.y, 0)/ringsystem.vertices.length,
                };
                if ( (edge.v2.screen_coords.x - edge.v1.screen_coords.x) * (center.y - edge.v1.screen_coords.y) -
                            (edge.v2.screen_coords.y - edge.v1.screen_coords.y) * (center.x - edge.v1.screen_coords.x) > 0)
                    edge.orientation = EdgeOrientation.Right;
                else
                    edge.orientation = EdgeOrientation.Left;
                update_view && edge.update();
                return;
            }
        }
        // non-cyclic bond with heteroatoms - symmetrical
        if (edge.v1.label || edge.v2.label) {
            edge.orientation = EdgeOrientation.Center;
            update_view && edge.update();
            return;
        }
        // exocyclic double bond - draw symmetrical
        if (edge.v1.topology == VertexTopology.Ring || edge.v2.topology == VertexTopology.Ring) {
            edge.orientation = EdgeOrientation.Center;
            update_view && edge.update();
            return;
        }
        edge.orientation = EdgeOrientation.Left;
        update_view && edge.update();
    }

    update_topology() : void {
        this.vertices.forEach( e => e.topology = VertexTopology.Chain);
        for (const edge of this.edges) {
            edge.topology = this.edge_topology(edge);
            if (edge.topology == EdgeTopology.Ring) {
                edge.v1.topology = VertexTopology.Ring;
                edge.v2.topology = VertexTopology.Ring;
            }
        }
        this.add_numbering();
        const graph_copy = this.copy();
        const chain_edges = graph_copy.edges.filter( e => e.topology == EdgeTopology.Chain);
        chain_edges.forEach( e => graph_copy.delete_edge(e) );
        // remove lone vertices; they might have been present originally
        graph_copy.vertices = graph_copy.vertices.filter( e => e.neighbors.length );
        this.ringsystems = [];
        for (const ringsystem_copy of graph_copy.subgraphs()) {
            const ringsystem = new Graph();
            ringsystem.vertices = <Array<Vertex>>ringsystem_copy.vertices.map( ce => this.vertices.find(e => e.id == ce.id)).filter(e => !!e);
            ringsystem.edges = <Array<Edge>>ringsystem_copy.edges.map( ce => this.edges.find(e => e.id == ce.id)).filter(e => !!e);
            // for attached graph instance, recalculate bond orientations
            if (this.controller) {
                let center:ScreenCoords|null = null;
                ringsystem.edges.forEach ( e => {
                    if (e.is_asymmetric) {
                        // calculate on demand
                        if (!center)
                            center = {
                                x: ringsystem.vertices.reduce( (p, e) => p + e.screen_coords.x, 0)/ringsystem.vertices.length,
                                y: ringsystem.vertices.reduce( (p, e) => p + e.screen_coords.y, 0)/ringsystem.vertices.length,
                            };
                        if ( (e.v2.screen_coords.x - e.v1.screen_coords.x) * (center.y - e.v1.screen_coords.y) -
                            (e.v2.screen_coords.y - e.v1.screen_coords.y) * (center.x - e.v1.screen_coords.x) > 0)
                            e.orientation = EdgeOrientation.Right;
                        else
                            e.orientation = EdgeOrientation.Left;
                        e.update();
                    }
                });
            }
            this.ringsystems.push(ringsystem);
        }
    }

    strip_hydrogens(): Graph {
        const hs = new Graph();
        hs.vertices = this.vertices.filter(e => e.element?.symbol == "H");
        hs.vertices.forEach(e => hs.edges.push(...this.find_edges_by_vertex(e)));
        this.remove(hs);
        return hs;
    }
}

export { Graph };