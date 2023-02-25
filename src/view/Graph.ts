import Konva from "konva";
import { MoleculeEditor } from "../main";
import { BondType, Edge, EdgeOrientation, EdgeShape, EdgeTopology } from "./Edge";
import { Coords, Vertex, VertexTopology } from "./Vertex";

/**
 * Class to specify rectangle by two opposite points
 */
type Rect = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/**
 * Graph is a representation molecular structure. It is undirected, disconnected graph consisting of vertices and edges,
 * representing atoms (or superatoms), and chemical bonds.
 * Graph can be attached to controller (that is responsible for UI), or detached (just to represent data).
 * Operations on Graph, such as addition and removal of vertices and edges, are implemented as methods that return
 * detached Graphs internally referring to the same @see Vertex and @see Edge objects that are present in original Graph.
 * This allows to implement operation history (Undo and Redo) easily.
 */
class Graph {
    /**
     * List of @see Vertex objects representing atoms
     */
    vertices: Array<Vertex>;
    /**
     * List of @see Edge objects representing bonds
     */
    edges: Array<Edge>;
    /**
     * konva group object is only relevant for attached Graph
     */
    group: Konva.Group | null;
    /**
     * controller object for user interaction. null for detached. @default null
     */
    controller: MoleculeEditor | null;
    /**
     * Array of subgraphs representing ringsystems in the graph. This value is populated when @see update_topology is called.
     * @default []
     * This property is used internally to compute edge orientation for double bonds (i.e. in benzene all double bonds must be inside)
     */
    ringsystems: Array<Graph>;

    /**
     * Screen coordinates are used internally, but usually something like atomic coords are written to mol file. This is a scaling factor.
     * The value is updated when
     * 1) controller is attached (in this case, it is set to 1.54 / default bond length, or
     * 2) when mol file is read (to preserve existing coordinates from the file, set to average bond distance / default bond length)
     * @default 1 when graph is created
     */
    mol_scaling_factor: number;

    constructor() {
        this.controller = null;
        this.vertices = [];
        this.edges = [];
        this.group = null;
        this.ringsystems = [];
        this.mol_scaling_factor = 1;
    }

    /**
     * Provide a detached copy of the graph, maintaining connectivity and order of vertices and edges in the @see vertices and @see edges.
     * @returns Copy constructed detached @see Graph
     */
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
        r.mol_scaling_factor = this.mol_scaling_factor;
        return r;
    }

    /**
    * Attach @see Graph to controller.
    * @param controller an object of @see MoleculeEditor class
    * @returns an object of Konva.Group type depicting Graph
    */
    attach(controller: MoleculeEditor): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        if (!this.vertices.length)
            this.mol_scaling_factor = 1.54 / this.controller.stylesheet.bond_length_px;
        this.vertices.forEach( e => this.group?.add(e.attach(controller)) );
        this.edges.forEach( e => { this.group?.add(e.attach(controller)); e.z_index = 0; } );
        return this.group;
    }

    /**
     * Detach @see Graph from the controller.
    */
    detach() {
        this.vertices.forEach( e => e.detach() );
        this.edges.forEach( e => e.detach() );
        this.group?.destroyChildren();
        this.controller = null;
    }

    /**
     * Load string of CTAB (Chemical tabular format aka .mol file) into @see Graph
     * @param mol_str string with CTAB, for example, .mol file that is read from disk
     */
    load_mol_string(mol_str: string) : void {
        this.clear();
        const controller = this.controller;
        if (controller)
            this.detach();
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
            this._add_vertex({x: x, y: y}, element);
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
            const edge = this.bind_vertices(this.vertices[atom_index2], this.vertices[atom_index1], EdgeShape.Single);
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
        if (controller) {
            this.mol_scaling_factor = this.get_average_bond_distance() / controller.stylesheet.bond_length_px;
            this.vertices.forEach( e => {
                e.coords = { x: e.coords.x / this.mol_scaling_factor, y: e.coords.y / this.mol_scaling_factor };
            });
            this.attach(controller);
        }
        this.update_topology();
        this.edges.forEach(e => {this.update_edge_orientation(e);});
    }

    /**
     * Get a string of CTAB format (aka .mol file) from the @see Graph.
     * @returns string. First thee lines of CTAB with metadata are unused, and auto generated.
     */
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
            const mol_rect = this.get_molecule_rect();
            const scaled_x = (e.coords.x - mol_rect.x1) * this.mol_scaling_factor;
            const scaled_y = (e.coords.y - mol_rect.y1) * this.mol_scaling_factor;
            const x = `${scaled_x.toFixed(4)}`.padStart(10, " ");
            const y = `${(-scaled_y).toFixed(4)}`.padStart(10, " ");
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

    /**
     * Compute average bond distance.
     * For empty @see Graph, returns 1.54 (this is average CC bond in Angstrøms)
     * @returns average distance between bound vertices in whatever units are used
     */
    get_average_bond_distance() : number {
        if (!this.edges.length)
            return 1.54; // average CC bond in Angstrøms
        const total_distance = this.edges.reduce( (p, e) =>
            p + Math.sqrt((e.v1.coords.x - e.v2.coords.x)*(e.v1.coords.x - e.v2.coords.x)+(e.v1.coords.y - e.v2.coords.y)*(e.v1.coords.y - e.v2.coords.y)), 0);
        return total_distance / this.edges.length;
    }

    /**
     * Compute rectangular area that contains all vertices of the @see Graph.
     * If there are no vertices, arbitrary area {0,0,100,100} is returned.
     * @returns @see Rect
     */
    get_molecule_rect() : Rect {
        if (!this.vertices.length)
            return {x1: 0, y1: 0, x2: 100, y2: 100};
        const x_coords = this.vertices.map(e => e.coords.x);
        const y_coords = this.vertices.map(e => e.coords.y);
        return {
            x1: Math.min(...x_coords),
            y1: Math.min(...y_coords),
            x2: Math.max(...x_coords),
            y2: Math.max(...y_coords),
        };
    }

    /**
     * Perform update operations of vertices and edges in the graph, i.e. minimalistic actions
     * to redraw the renderings of atoms and bonds.
     */
    update() : void {
        for (const v of this.vertices) {
            v.update();
        }
        for (const e of this.edges) {
            e.update();
        }
    }
    /**
     * Add single vertex by screen coordinates. Used to add single atom to the drawing via UI.
     * @param coords Screen coordinates for the new @see Vertex
     * @param label Vertex label, @default `C` (carbon atoms are only rendered by default if not connected to other atoms)
     * @returns @see Graph object containing added vertex
     */
    add_vertex(coords: Coords, label="C"): Graph {
        const graph = new Graph();
        graph.vertices = [this._add_vertex(coords, label)];
        this.update();
        return graph;
    }

    /**
     * Internal function to add vertex to the graph. Attaches it to controller if the graph is attached.
     * @param coords Coordinates of the vertex
     * @param label Label of the vertex
     * @returns object of @see Vertex class
     */
    private _add_vertex(coords: Coords, label = "C"): Vertex {
        const vertex = new Vertex();
        this.vertices.push(vertex);
        vertex.coords = coords;
        vertex.label = label;
        if (this.controller)
            this.group?.add(vertex.attach(this.controller));
        return vertex;
    }

    /**
     * Find edges that are connected to the specified vertex
     * @param vertex an object of @see Vertex class
     * @returns an array of @see Edge class objects that are connected to the vertex
     */
    find_edges_by_vertex(vertex: Vertex): Array<Edge> {
        return this.edges.filter(e => e.v1 == vertex || e.v2 == vertex);
    }

    /**
     * Return array of edges that adjacent to given edge, i.e. edges of the edge.v1 and edge.v2 excluding given edge.
     * @param edge An edge in graph
     * @returns Array of @see Edge.
     */
    adjacent_edges(edge: Edge): Array<Edge> {
        return [...this.find_edges_by_vertex(edge.v1), ...this.find_edges_by_vertex(edge.v2)].filter(e => e != edge);
    }

    /**
     * Check if two vertices in the graph are connected.
     * @param v1 Object of @see Vertex class
     * @param v2 Another object of @see Vertex class
     * @returns true if there is a bond connecting vertices, or false otherwise
     */
    vertices_are_connected(v1: Vertex, v2: Vertex): boolean {
        return this.edges.findIndex( e => (e.v1 == v1 && e.v2 == v2) || (e.v1 == v2 && e.v2 == v1) ) != -1;
    }


    /**
     * Merge another graph into current one. It will check for duplicates, and filter them out.
     * If the graph is attached, all the added vertices and edges will be attached.
     * @param graph object of @see Graph class to merge into the current graph.
     */
    add(graph: Graph): void {
        this.vertices.push(...graph.vertices.filter( e => this.vertices.indexOf(e) == -1));
        this.edges.push(...graph.edges.filter( e => this.edges.indexOf(e) == -1));
        this.edges.forEach(e => { e.v1.add_neighbor(e.v2, e.bond_order); e.v2.add_neighbor(e.v1, e.bond_order); });
        if (this.controller) {
            const controller = this.controller;
            graph.vertices.forEach(e => { this.group?.add(e.attach(controller)); });
            graph.edges.forEach(e => { this.group?.add(e.attach(controller)); e.z_index = 0; } );
        }
        this.update();
    }

    /**
     * Remove the specified subgraph from the Graph. All the vertices and edges will be detached.
     * @param graph subgraph to remove.
     */
    remove(graph: Graph) : void {
        graph.vertices.forEach( e  => e.detach() );
        graph.edges.forEach( e  => e.detach() );
        this.vertices = this.vertices.filter(e => graph.vertices.indexOf(e) == -1);
        this.edges = this.edges.filter( e => graph.edges.indexOf(e) == -1);
        graph.edges.forEach( e => { e.v1.remove_neighbor(e.v2); e.v2.remove_neighbor(e.v1); });
        this.update();
    }

    /**
     * Create an edge between vertices. The method is responsible for the update of neighbor properties of vertices.
     * If the graph is attached, the edge is also attached to controller, and topology of the graph is updated to recompute edge orientations.
     * @param v1 first @see Vertex
     * @param v2 second @see Vertex
     * @param edge_shape Shape of the edge, @see EdgeShape, @default EdgeShape.Single
     * @returns newly created @see Edge
     */
    bind_vertices(v1: Vertex, v2: Vertex, edge_shape: EdgeShape = EdgeShape.Single): Edge {
        const edge = new Edge(v1, v2);
        edge.shape = edge_shape;
        v1.add_neighbor(v2, edge.bond_order);
        v2.add_neighbor(v1, edge.bond_order);
        this.edges.push(edge);
        if (this.controller) {
            this.group?.add(edge.attach(this.controller));
            // edges of bonds are below vertices of atoms, put them back
            edge.z_index = 0;
            this.update_topology();
        }
        return edge;
    }

    /**
     * Delete vertex from graph. Removes all edges that are connected to this vertex. This may cause other vertices
     * to be removed as well (single dangling vertices will be removed too)
     * @param vertex @see Vertex to remove
     * @returns Graph with all removed vertices and edges.
     */
    delete_vertex(vertex: Vertex): Graph {
        const r: Graph = new Graph();
        const edges = this.find_edges_by_vertex(vertex);
        edges.forEach(e => { const s = this.delete_edge(e); r.vertices.push(...s.vertices); r.edges.push(...s.edges); });
        vertex.detach();
        this.vertices = this.vertices.filter( e => e != vertex);
        return r;
    }

    /**
     * Removes edge from the graph. The method is responsible for updating neighbors properties of the vertices.
     * @param edge An @see Edge to remove.
     * @param drop_dangling_vertices whether it is needed to remove single dangling vertices after the removal of the edge. @default true
     * @returns Graph containing all removed edges and vertices.
     */
    delete_edge(edge: Edge, drop_dangling_vertices = true, skip_topology_update  = true): Graph {
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
        if (!skip_topology_update)
            this.update_topology();
        return r;
    }

    /**
     * Get a list of all vertices so that edges exist between each of them and the given vertex.
     * @param vertex a @see Vertex to probe
     * @returns an array of @see Vertex objects, each of them has an edge connecting it with the given vertex
     */
    neighboring_vertices(vertex: Vertex): Array<Vertex> {
        const r : Array<Vertex> = [];
        this.edges.filter( e => e.v1 == vertex).forEach(e => r.push(e.v2));
        this.edges.filter( e => e.v2 == vertex).forEach(e => r.push(e.v1));
        return r;
    }

    /**
     * For any point in space, calculate metric to measure "crowding" around this point. This is proportional to sum of
     * inversed squared distances to proximate vertices
     * @param point coordinates a point which we probe against the graph
     * @param filtering_factor vertices that are farther than filtering_factor * average bond distance will not be considered.
     * @default 3. A value of 0 means that all vertices are considered (computationally intense)
     * @param coalesence_factor vertices that are closer to point will not be considered. This is for cases
     * of algorithms that will cause coalescence of new vertices with existing ones. @default 0.1. A value of 0 disables coalescence filtering.
     * @returns "repulsion potential" which is a sum of square distances to neighboring vertices
     */
    private crowding_potential(point: Coords, filtering_factor = 3, coalesence_factor = 0.1): number {
        const avg_bond_distance = this.get_average_bond_distance();
        // exclude distance calculation to remove vertices
        const proximate_vertices =
        this.vertices.filter( e =>
            filtering_factor == 0 || (
                Math.abs(e.coords.x - point.x) < filtering_factor * avg_bond_distance
                && Math.abs(e.coords.y - point.y) < filtering_factor * avg_bond_distance
            )
        );
        return proximate_vertices.reduce( (acc, e) => {
            const distance = Math.sqrt((e.coords.x-point.x)*(e.coords.x-point.x) + (e.coords.y-point.y)*(e.coords.y-point.y));
            return distance > coalesence_factor*avg_bond_distance ? acc + 1 / Math.pow(distance, 2) : acc;
        },
        0 );
    }

    /**
     * For a given set of points, get the one that is farthest all the vertices of the graph.
     * This @see crowding_potential function to calculate
     * @param points an array of @see Coords, each one representing 2D point
     * @returns one point selected from points, that is the most remote from the vertices of the graph
     */
    least_crowded_point(points: Array<Coords>): Coords {
        // garbage in garbage out
        if (!points.length)
            return {x: 0, y: 0};
        let best_potential: number | null = null;
        let best_point: Coords = points[0];
        for (const point of points) {
            const potential = this.crowding_potential(point);
            if (best_potential === null || potential < best_potential) {
                best_potential = potential;
                best_point = point;
            }
        }
        return best_point;
    }

    /**
     * Adds a bound vertex to existing vertex in the graph. The positioning of the vertex is selected to be visually appealing:
     * - edge length is taken from @see stylesheet.bond_length_px if controller is attached, otherwise from @see get_average_bond_distance
     * - least crowded, regular angles are selected
     * - other vertices around given vertex may be moved (only if they have no other neighbors other than the given vertex) to produce a good drawing
     * @param vertex A vertex to which attach a new edge and a vertex.
     * @returns A Graph containing newly created @see Edge and @see Vertex.
     */
    add_bound_vertex_to(vertex: Vertex): Graph {
        const r = new Graph();
        const neighbors = this.neighboring_vertices(vertex);
        const bond_len = this.controller ? this.controller.stylesheet.bond_length_px : this.get_average_bond_distance();
        if (neighbors.length == 0) {
            // make a new bond to 60 deg up and right
            const new_vertex = this._add_vertex({
                x: vertex.coords.x + bond_len * Math.cos(Math.PI/6),
                y: vertex.coords.y - bond_len * Math.sin(Math.PI/6)
            });
            r.edges = [this.bind_vertices(vertex, new_vertex)];
            r.vertices = [new_vertex];
            return r;
        }
        // for atoms with only one neighbor, add atom and bond at 120 deg to existing bond with the same distance
        if (neighbors.length == 1) {
            const delta_x = neighbors[0].coords.x - vertex.coords.x;
            const delta_y = neighbors[0].coords.y - vertex.coords.y;
            const alfa = Math.atan2(delta_y, delta_x);
            const bond_len = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
            let coordinates: Coords;
            if (this.find_edges_by_vertex(vertex)[0].bond_order == 3) {
                coordinates = {
                    x: vertex.coords.x + bond_len * Math.cos(alfa+Math.PI),
                    y: vertex.coords.y + bond_len * Math.sin(alfa+Math.PI)
                };
            }
            else {
                coordinates = this.least_crowded_point([
                    {
                        x: vertex.coords.x + bond_len * Math.cos(alfa+Math.PI/1.5),
                        y: vertex.coords.y + bond_len * Math.sin(alfa+Math.PI/1.5)
                    },
                    {
                        x: vertex.coords.x + bond_len * Math.cos(alfa-Math.PI/1.5),
                        y: vertex.coords.y + bond_len * Math.sin(alfa-Math.PI/1.5)
                    },
                ]);
            }
            const new_vertex = this._add_vertex(coordinates);
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
        angles = fixed_neighbors.map(e => Math.atan2(e.coords.y-vertex.coords.y, e.coords.x-vertex.coords.x));
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

        const new_vertex = this._add_vertex({
            x: vertex.coords.x + bond_len,
            y: vertex.coords.y
        });
        r.edges = [this.bind_vertices(vertex, new_vertex)];
        r.vertices = [new_vertex];
        movable_neighbors.push(new_vertex);

        for (let i = 0; i < movable_neighbors.length; i++) {
            const neighbor_to_move = movable_neighbors[i];
            // divide the largest angle by half, convert to degress, round the result to 15 deg, and convert back to radians
            const alfa =  Math.PI * Math.round( (angle1 + largest_diff*(i+1)/(movable_neighbors.length + 1))*180/(Math.PI*15) )*15 / 180;
            neighbor_to_move.coords = {
                x: vertex.coords.x + bond_len * Math.cos(alfa),
                y: vertex.coords.y + bond_len * Math.sin(alfa)
            };
            this.edges.find(e => e.v1 == neighbor_to_move || e.v2 == neighbor_to_move)?.update();
        }
        return r;
    }

    /**
     * Removes all vertices and edges, and clears the drawing if it exists.
     */
    clear() : void {
        this.vertices = [];
        this.edges = [];
        this.group?.destroyChildren();
    }

    /**
     * Add default fragment to the graph, i.e. two vertices bound by an edge. This is used when user clicks on empty space in drawing.
     * @param coords Coordinates of the first vertex
     * @returns Graph containing newly created vertices and edge
     */
    add_default_fragment(coords: Coords): Graph {
        const vertex1 = this._add_vertex(coords);
        const r = new Graph();
        r.vertices = [vertex1];
        const frag = this.add_bound_vertex_to(vertex1);
        r.vertices = [ ...r.vertices, ...frag.vertices ];
        r.edges = [ ...r.edges, ...frag.edges ];
        return r;
    }

    /**
     * Attach normal chain of vertices and edges to specified vertex. Orientation of the chain is selected to be visually appealing.
     * @param vertex an existing vertex pertaining to the Graph
     * @param nvertices number of vertices to add. Edges are added automatically.
     * @returns a Graph consisting of newly created @see Edge and @see Vertex objects
     */
    add_chain(vertex: Vertex, nvertices: number) : Graph {
        const r = new Graph;
        r.vertices = [vertex];
        for (let i = 0; i < nvertices; i++) {
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

    /**
     * Fuse ring of given resulting size to the specified edge. The ring is drawn as a regular polygon of the given size.
     * Each of the edges has the same length as the specified edge.
     * There are two sides of edge, and the least crowded side is selected to fuse the ring.
     * @param edge an @see Edge pertaining to the Graph
     * @param nvertices number of vertices in the resulting ring
     * @returns a Graph containing newly created edges and vertices
     */
    fuse_ring(edge: Edge, nvertices: number, desaturate = false): Graph {
        const alfa = Math.atan2(edge.v2.coords.y-edge.v1.coords.y, edge.v2.coords.x-edge.v1.coords.x);
        const beta = (nvertices-2) * Math.PI / nvertices;
        const edge_len = Math.sqrt( Math.pow(edge.v1.coords.x - edge.v2.coords.x, 2) + Math.pow(edge.v1.coords.y - edge.v2.coords.y, 2));
        const h = edge_len * Math.tan(beta/2) / 2;
        const l = edge_len / (2* Math.cos(beta / 2));
        type Ring = {
            center_x: number,
            center_y: number,
            coordinates: Array<Coords>,
            crowding: number,
            first_vertex: Vertex,
            last_vertex: Vertex,
        }
        const ring1: Ring = {
            center_x: h * Math.sin(Math.PI - alfa) + (edge.v1.coords.x + edge.v2.coords.x) / 2,
            center_y: h * Math.cos(Math.PI - alfa) + (edge.v1.coords.y + edge.v2.coords.y) / 2,
            coordinates: [],
            crowding: 0,
            first_vertex: edge.v1,
            last_vertex: edge.v2,
        };
        const ring2: Ring = {
            center_x: -h * Math.sin(Math.PI - alfa) + (edge.v1.coords.x + edge.v2.coords.x) / 2,
            center_y: -h * Math.cos(Math.PI - alfa) + (edge.v1.coords.y + edge.v2.coords.y) / 2,
            coordinates: [],
            crowding: 0,
            first_vertex: edge.v2,
            last_vertex: edge.v1,
        };

        for (let i = 1; i <= nvertices - 2; i++) {
            const angle = Math.PI - beta/2 + alfa + 2*i*Math.PI / nvertices;
            const coords1: Coords = {x: ring1.center_x + l * Math.cos(angle), y: ring1.center_y + l * Math.sin(angle)};
            ring1.coordinates.push(coords1);
            ring1.crowding += this.crowding_potential(coords1);
            const coords2: Coords = {x: ring2.center_x - l * Math.cos(angle), y: ring2.center_y - l * Math.sin(angle)};
            ring2.coordinates.push(coords2);
            ring2.crowding += this.crowding_potential(coords2);
        }
        const r = new Graph();
        const selected_ring = ring1.crowding < ring2.crowding ? ring1 : ring2;
        let last_vertex = selected_ring.first_vertex;
        let saturated = true;
        if (desaturate && edge.shape == EdgeShape.Single && edge.v1.h_count > 1)
            saturated = false;
        for (const coordinate of selected_ring.coordinates) {
            const vertex = this._add_vertex(coordinate, "C");
            r.vertices.push(vertex);
            r.edges.push(this.bind_vertices(vertex, last_vertex, saturated ? EdgeShape.Single : EdgeShape.Double));
            if (desaturate)
                saturated = !saturated;
            last_vertex = vertex;
        }
        r.edges.push(this.bind_vertices(last_vertex, selected_ring.last_vertex, saturated ? EdgeShape.Single : EdgeShape.Double));
        r.vertices.forEach(e => e.update());
        r.edges.forEach(e => e.update());
        return r;
    }

    /**
     * Attach a ring to the specified vertex. The vertex becomes one of the vertices of the ring.
     * @param vertex an exising vertex in the Graph
     * @param nvertices number of vertices in the resulting ring
     * @returns a Graph containing newly created edges and vertices
     */
    attach_ring(vertex: Vertex, nvertices: number, desaturate = false) : Graph {
        if (vertex.neighbors.length < 2) {
            const r: Graph = this.add_bound_vertex_to(vertex);
            const frag = this.fuse_ring(r.edges[0], nvertices, desaturate);
            r.vertices = [...r.vertices, ...frag.vertices];
            r.edges = [...r.edges, ...frag.edges];
            return r;
        }
        const bond_len = this.controller ? this.controller.stylesheet.bond_length_px : this.get_average_bond_distance();
        const least_crowded_angle = vertex.least_crowded_angle();
        const internal_angle = Math.PI * (nvertices - 2) / nvertices;
        const alfa = least_crowded_angle + internal_angle / 2;
        const vertex2 = this._add_vertex({x: vertex.coords.x + bond_len * Math.cos(alfa), y: vertex.coords.y + bond_len * Math.sin(alfa)});
        const edge = this.bind_vertices(vertex, vertex2);
        const frag = this.fuse_ring(edge, nvertices, desaturate);
        const r = new Graph();
        r.vertices = [ vertex2, ...frag.vertices];
        r.edges = [ edge, ...frag.edges ];
        return r;
    }

    /**
     * Add numbering to the graph edges and vertices to make correlations between the vertices and edges in copy constructed graphs.
     */
    add_numbering(): void {
        this.vertices.forEach( (e,idx) => e.id = `${idx}` );
        this.edges.forEach( (e,idx) => e.id = `${idx}` );
    }

    /**
     * Return an array of subgraphs of the graph, i.e. parts of graphs do not have connected paths between each other.
     * @returns An array of Graphs, each containing subgraph of the current Graph
     */
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

    subgraph_with(vertex: Vertex): Graph {
        const subgraphs = this.subgraphs();
        return subgraphs.find(g => g.vertices.find(v => v == vertex)) || new Graph();
    }

    /**
     * For the given edge, obtain its topology - does it pertain to a ring or not.
     * @param edge an @see Edge to probe
     * @returns @see EdgeTopology, either EdgeTopology.Chain, or EdgeTopology.Ring
     */
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
     * Tell if a point is located to left of the line collinear with the given edge (looking from edge.v1 to edge.v2 as usual)
     * @param edge An edge
     * @param point A point to probe
     * @returns Boolean value
     */
    is_to_left(edge: Edge, point: Coords): boolean {
        return ( (edge.v2.coords.x - edge.v1.coords.x) * (point.y - edge.v1.coords.y) -
                            (edge.v2.coords.y - edge.v1.coords.y) * (point.x - edge.v1.coords.x) < 0);
    }

    /**
     * Re-calculate orientation of bond (left, right, symmetrical) for the specified edge in the graph.
     * This function is dependent on @see ringsystems property that is calculated in @see update_topology method.
     * @param edge Edge whose orientation to be updated.
     * @param update_view Whether to call edge.update() to update view. @default true
     * @returns void
     */
    update_edge_orientation(edge: Edge, update_view = true) : void {
        if (!edge.is_asymmetric)
            return;
        for (const ringsystem of this.ringsystems) {
            if ( ringsystem.edges.findIndex(e => e == edge) == -1)
                continue;
            let v1_neighbors = ringsystem.neighboring_vertices(edge.v1).filter(e => e != edge.v2);
            let v2_neighbors = ringsystem.neighboring_vertices(edge.v2).filter(e => e != edge.v1);
            const left_count = v1_neighbors.filter(e => this.is_to_left(edge, e.coords)).length + v2_neighbors.filter(e => this.is_to_left(edge, e.coords)).length;
            const neighbor_count = v1_neighbors.length + v2_neighbors.length;
            if (left_count > neighbor_count - left_count) {
                edge.orientation = EdgeOrientation.Left;
            }
            else if (neighbor_count - left_count > left_count)
            {
                edge.orientation = EdgeOrientation.Right;
            }
            else {
                // consider neighbors bound having double bonds
                v1_neighbors = v1_neighbors.filter(vertex => this.find_edges_by_vertex(vertex).filter(e => e != edge && [BondType.Double, BondType.Aromatic].includes(e.bond_type)).length );
                v2_neighbors = v2_neighbors.filter(vertex => this.find_edges_by_vertex(vertex).filter(e => e != edge && [BondType.Double, BondType.Aromatic].includes(e.bond_type)).length );
                const left_count = v1_neighbors.filter(e => this.is_to_left(edge, e.coords)).length + v2_neighbors.filter(e => this.is_to_left(edge, e.coords)).length;
                const neighbor_count = v1_neighbors.length + v2_neighbors.length;
                if (left_count > neighbor_count - left_count) {
                    edge.orientation = EdgeOrientation.Left;
                }
                else {
                    edge.orientation = EdgeOrientation.Right;
                }
            }
            update_view && edge.update();
            return;
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
            this.ringsystems.push(ringsystem);
        }
        if (this.controller) {
            this.ringsystems.forEach( ringsystem =>
                ringsystem.edges.forEach ( edge => this.update_edge_orientation(edge)));
        }
    }

    /**
     * Removes explicit hydrogens from the graph by removing vertices labeled as `H`, and their edges.
     * @returns a Graph containing removed vertices and edges.
     */
    strip_hydrogens(): Graph {
        const hs = new Graph();
        hs.vertices = this.vertices.filter(e => e.element?.symbol == "H");
        hs.vertices.forEach(e => hs.edges.push(...this.find_edges_by_vertex(e)));
        this.remove(hs);
        return hs;
    }

    /**
     * Add vertices and edges to make Graph symmetrical around center of symmetry coincident with the center of edge.
     * For instance, this transfrormation applied to double bond of styrene will produce trans-stilbene from it.
     * @param edge Edge whose center will be coincident with center of symmetry
     * @returns Added vertices and edges
     */

    symmetrize_along_edge(edge: Edge): Graph {
        if ( (edge.v1.neighbors.length == 1) == (edge.v2.neighbors.length == 1) )
            return new Graph();
        const center : Coords = {
            x: (edge.v1.coords.x + edge.v2.coords.x) / 2,
            y: (edge.v1.coords.y + edge.v2.coords.y) / 2,
        };
        this.add_numbering();
        const free_vertex = edge.v1.neighbors.length == 1 ? edge.v1 : edge.v2;
        const bound_vertex = free_vertex == edge.v1 ? edge.v2 : edge.v1;
        const r = this.subgraph_with(edge.v1).copy();
        r.edges = r.edges.filter( e => e.id != edge.id);
        r.edges.forEach(e => {
            if (e.v1.id == bound_vertex.id) {
                e.v2.remove_neighbor(e.v1);
                e.v1 = free_vertex;
                e.v2.add_neighbor(e.v1, e.bond_order);
            }
            if (e.v2.id == bound_vertex.id) {
                e.v1.remove_neighbor(e.v2);
                e.v2 = free_vertex;
                e.v1.add_neighbor(e.v2, e.bond_order);
            }
        });
        r.vertices = r.vertices.filter( e => e.id != edge.v1.id && e.id != edge.v2.id );
        // invert coords around center
        r.vertices.forEach( e => {
            e.coords.x = 2*center.x - e.coords.x;
            e.coords.y = 2*center.y - e.coords.y;
        });
        this.add(r);
        this.update_topology();
        return r;
    }

    /**
     * Apply rotation transformation to the graph
     * @param origin coordinates of rotation origin
     * @param angle angle of rotation in radians, clockwise. Angle 0 is a vector collinear with positive x branch.
     */
    rotate(origin: Coords, angle: number) {
        this.vertices.forEach(e => {
            const dx = e.coords.x - origin.x;
            const dy = e.coords.y - origin.y;
            e.coords = {
                x: origin.x + dx * Math.cos(angle) + dy * Math.sin(angle),
                y: origin.y - dx * Math.sin(angle) + dy * Math.cos(angle)
            };
        });
    }

    /**
     * Add vertices and edges to make graph rotationally symmetrical around specified Vertex.
     * For example, this transformation being applied to aliphatic carbon of toluene, will produce triphenylmethane for order 3
     * or tetraphenylmethane for order 4.
     * @param vertex Vertex which will be coincident with the center of rotational symmetry
     * @param order order of symmetry
     * @returns Graph with all added elements
     */
    symmetrize_at_vertex(vertex: Vertex, order: number): Graph {
        if ( (vertex.neighbors.length != 1) )
            return new Graph();
        this.add_numbering();
        const angle_increment = order == 2 ? 2*Math.PI / 3 : 2 * Math.PI / order;
        const r = new Graph();
        const subgraph = this.subgraph_with(vertex).copy();
        subgraph.vertices = subgraph.vertices.filter(e => e.id != vertex.id);
        subgraph.edges = subgraph.edges.filter(e => e.v1.id != vertex.id && e.v2.id != vertex.id);
        subgraph.vertices.find(e => e.id == vertex.neighbors[0].vertex.id)?.remove_neighbor(vertex);
        for (let i = 1; i < order; i++) {
            const subgraph_copy = subgraph.copy();
            subgraph_copy.rotate(vertex.coords, angle_increment*i);
            const vertex_to_bind = subgraph_copy.vertices.find(e => e.id == vertex.neighbors[0].vertex.id);
            if (!vertex_to_bind)
                throw "This should never happen";
            subgraph_copy.bind_vertices(vertex_to_bind, vertex);
            r.add(subgraph_copy);
        }
        this.add(r);
        this.update_topology();
        return r;
    }
}

export { Graph };