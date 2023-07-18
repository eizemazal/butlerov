import { Edge, EdgeOrientation, EdgeShape } from "../view/Edge";
import { Graph } from "../view/Graph";
import { Coords, Vertex } from "../view/Vertex";

abstract class Action {
    abstract commit() : void;
    abstract rollback() : void;
}

abstract class UpdatableAction extends Action {
    abstract update(action: this): boolean;
}

class UpdateEdgeShapeAction extends Action {
    graph: Graph;
    edge: Edge;
    old_shape: EdgeShape;
    new_shape: EdgeShape;
    old_orientation: EdgeOrientation;
    new_orientation: EdgeOrientation | null;
    constructor(graph: Graph, edge: Edge, edge_shape: EdgeShape, orientation: EdgeOrientation | null = null) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.old_shape = edge.shape;
        this.new_shape = edge_shape;
        this.old_orientation = edge.orientation;
        this.new_orientation = orientation;
    }
    commit() {
        this.edge.shape = this.new_shape;
        if (this.new_orientation === null) {
            this.graph.update_edge_orientation(this.edge);
            this.new_orientation = this.edge.orientation;
        }
        else
            this.edge.orientation = this.new_orientation;
        this.edge.v1.change_neighbor_bond(this.edge.v2, this.edge.bond_order);
        this.edge.v2.change_neighbor_bond(this.edge.v1, this.edge.bond_order);
        this.edge.update();
    }
    rollback() {
        this.edge.shape = this.old_shape;
        this.edge.orientation = this.old_orientation;
        this.edge.v1.change_neighbor_bond(this.edge.v2, this.edge.bond_order);
        this.edge.v2.change_neighbor_bond(this.edge.v1, this.edge.bond_order);
        this.edge.update();
    }
}

class ClearGraphAction extends Action {
    graph: Graph;
    mol: string;
    constructor(graph: Graph) {
        super();
        this.graph = graph;
        this.mol = "";
    }
    commit() {
        this.mol = this.graph.get_mol_string();
        this.graph.clear();
    }
    rollback() {
        this.graph.load_mol_string(this.mol);
        this.graph.update();
    }
}

class DeleteVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    removed: Graph;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.removed = new Graph();
    }

    commit() {
        this.vertex.active = false;
        this.removed = this.graph.delete_vertex(this.vertex);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }

}

class DeleteEdgeAction extends Action {
    graph: Graph;
    edge: Edge;
    removed: Graph;

    constructor(graph: Graph, edge: Edge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.removed = new Graph();
    }

    commit() {
        this.edge.active = false;
        this.removed = this.graph.delete_edge(this.edge, true, false);
    }

    rollback() {
        this.graph.add(this.removed);
        this.graph.update();
    }
}

class AddBoundVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    old_neighbor_coords: Array<Coords>;
    new_neighbor_coords: Array<Coords>;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.added = null;
        // in this action, some neigboring vertices may change coordinates. We need to save and restore them.
        this.old_neighbor_coords = [];
        this.new_neighbor_coords = [];
    }

    commit() {
        if (this.added) {
            this.graph.add(this.added);
            this.vertex.neighbors.forEach( (e, idx) =>  e.vertex.coords = this.new_neighbor_coords[idx]);
            this.graph.update();
        }
        else {
            this.old_neighbor_coords = this.vertex.neighbors.map( e => e.vertex.coords );
            this.added = this.graph.add_bound_vertex_to(this.vertex);
            this.new_neighbor_coords = this.vertex.neighbors.map( e => e.vertex.coords );
        }
    }
    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
        this.vertex.neighbors.forEach( (e, idx) =>  e.vertex.coords = this.old_neighbor_coords[idx]);
        this.graph.update();
    }
}

class AddDefaultFragmentAction extends Action {
    graph: Graph;
    x: number;
    y: number;
    added: Graph | null;

    constructor(graph: Graph, x: number, y: number ) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_default_fragment({x: this.x, y: this.y});
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }

}

class AddSingleVertexAction extends Action {
    graph: Graph;
    x: number;
    y: number;
    added: Graph | null;

    constructor(graph: Graph, x: number, y: number ) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_vertex({x: this.x, y: this.y});
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }

}


class BindVerticesAction extends Action {
    graph: Graph;
    v1: Vertex;
    v2: Vertex;
    edge: Edge | null;

    constructor(graph: Graph, v1: Vertex, v2: Vertex) {
        super();
        this.graph = graph;
        this.v1 = v1;
        this.v2 = v2;
        this.edge = null;
    }

    commit() {
        this.edge = this.graph.bind_vertices(this.v1, this.v2);
        this.edge.update();
        this.v1.update();
        this.v2.update();
    }

    rollback() {
        if (!this.edge)
            return;
        this.graph.delete_edge(this.edge, false, false);
        this.edge = null;
    }
}

class AddChainAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    natoms: number;

    constructor(graph: Graph, vertex: Vertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.add_chain(this.vertex, this.natoms);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class AttachRingAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    natoms: number;
    desaturate: boolean;

    constructor(graph: Graph, vertex: Vertex, natoms: number, desaturate = false) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.desaturate = desaturate;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.attach_ring(this.vertex, this.natoms, this.desaturate);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class FuseRingAction extends Action {
    graph: Graph;
    edge: Edge;
    added: Graph | null;
    natoms: number;
    desaturate: boolean;

    constructor(graph: Graph, edge: Edge, natoms: number, desaturate = false) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.natoms = natoms;
        this.desaturate = desaturate;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.fuse_ring(this.edge, this.natoms, this.desaturate);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}

class StripHAction extends Action {
    graph: Graph;
    removed: Graph | null;

    constructor(graph: Graph) {
        super();
        this.graph = graph;
        this.removed = null;
    }

    commit() {
        if (this.removed)
            this.graph.remove(this.removed);
        else
            this.removed = this.graph.strip_hydrogens();
    }

    rollback() {
        if (!this.removed)
            return;
        this.graph.add(this.removed);
    }
}

class ChangeVertexLabelAction extends UpdatableAction {
    graph: Graph;
    vertex: Vertex;
    old_label: string;
    new_label: string;
    constructor(graph: Graph, vertex: Vertex, label: string) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_label = vertex.label;
        this.new_label = label;
    }
    _set_label(label: string) {
        this.vertex.label = label;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => { this.graph.update_edge_orientation(e, false); e.update(); });
    }
    commit() {
        this._set_label(this.new_label);
    }
    rollback() {
        this._set_label(this.old_label);
    }
    update(action: this): boolean {
        if (this.vertex != action.vertex)
            return false;
        this.new_label = action.new_label;
        this._set_label(this.new_label);
        return true;
    }
}

class MoveVertexAction extends UpdatableAction {
    graph: Graph;
    vertex: Vertex;
    old_coords: Coords;
    new_coords: Coords;

    constructor(graph: Graph, vertex: Vertex, original_coords: Coords | null) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.old_coords = original_coords || this.vertex.coords;
        this.new_coords = this.vertex.coords;
    }

    commit() : void {
        this.vertex.coords = this.new_coords;
        this.vertex.update();
        this.vertex.neighbors.filter(e => e.vertex != this.vertex).forEach(e => e.vertex.update());
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    rollback(): void {
        this.vertex.coords = this.old_coords;
        this.vertex.update();
        this.vertex.neighbors.filter(e => e.vertex != this.vertex).forEach(e => e.vertex.update());
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    update(action: this) : boolean {
        if (action.vertex != this.vertex)
            return false;
        this.new_coords = action.vertex.coords;
        this.vertex.update();
        this.vertex.neighbors.filter(e => e.vertex != this.vertex).forEach(e => e.vertex.update());
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
        return true;
    }
}

class IncrementAtomChargeAction extends UpdatableAction {
    vertex: Vertex;
    old_charge: number;
    increment: number;

    constructor(vertex: Vertex, increment: number) {
        super();
        this.vertex = vertex;
        this.old_charge = vertex.charge;
        this.increment = increment;
    }

    commit() : void {
        this.vertex.charge = this.old_charge + this.increment;
        this.vertex.update();
    }

    rollback(): void {
        this.vertex.charge = this.old_charge;
        this.vertex.update();
    }

    update(action: this) : boolean {
        if (action.vertex != this.vertex)
            return false;
        this.increment += action.increment;
        this.vertex.charge = this.old_charge + this.increment;
        this.vertex.update();
        return true;
    }
}

class SymmetrizeAlongEdgeAction extends Action {
    graph: Graph;
    edge: Edge;
    added: Graph | null;

    constructor(graph: Graph, edge: Edge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.symmetrize_along_edge(this.edge);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}


class SymmetrizeAtVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added: Graph | null;
    order: number;

    constructor(graph: Graph, vertex: Vertex, order: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.order = order;
        this.added = null;
    }

    commit() {
        if (this.added)
            this.graph.add(this.added);
        else
            this.added = this.graph.symmetrize_at_vertex(this.vertex, this.order);
    }

    rollback() {
        if (!this.added)
            return;
        this.graph.remove(this.added);
    }
}




export {
    Action,
    UpdatableAction,
    AddBoundVertexAction,
    AddSingleVertexAction,
    AddChainAction,
    AddDefaultFragmentAction,
    AttachRingAction,
    BindVerticesAction,
    ChangeVertexLabelAction,
    ClearGraphAction,
    DeleteEdgeAction,
    DeleteVertexAction,
    IncrementAtomChargeAction,
    FuseRingAction,
    StripHAction,
    MoveVertexAction,
    UpdateEdgeShapeAction,
    SymmetrizeAlongEdgeAction,
    SymmetrizeAtVertexAction
};