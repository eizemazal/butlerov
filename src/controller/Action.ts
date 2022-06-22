import { Edge, EdgeShape } from "../view/Edge";
import { Graph, Fragment } from "../view/Graph";
import { Vertex } from "../view/Vertex";

abstract class Action {
    committed: boolean;
    constructor() {
        this.committed = false;
    }
    abstract commit() : void;
    abstract rollback() : void;
}

abstract class UpdatableAction extends Action {
    abstract update(action: this): boolean;
}

class UpdateEdgeShapeAction extends Action {
    edge: Edge;
    old_shape: EdgeShape;
    new_shape: EdgeShape;
    constructor(edge: Edge, edge_shape: EdgeShape) {
        super();
        this.edge = edge;
        this.new_shape = edge_shape;
        this.old_shape = edge.shape;
    }
    commit() {
        this.edge.shape = this.new_shape;
        this.edge.update();
        this.committed = true;
    }
    rollback() {
        this.edge.shape = this.old_shape;
        this.edge.update();
        this.committed = false;
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
        this.committed = true;
    }
    rollback() {
        this.graph.load_mol_string(this.mol);
        this.graph.update();
        this.committed = false;
    }
}

class DeleteVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    removed_fragment: Fragment;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.removed_fragment = {vertices: [], edges: []};
    }

    commit() {
        this.vertex.active = false;
        this.removed_fragment = this.graph.delete_vertex(this.vertex);
        this.committed = true;
    }

    rollback() {
        this.graph.add_fragment(this.removed_fragment);
        this.graph.update();
        this.committed = false;
    }

}

class DeleteEdgeAction extends Action {
    graph: Graph;
    edge: Edge;
    removed_fragment: Fragment;

    constructor(graph: Graph, edge: Edge) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.removed_fragment = {vertices: [], edges: []};
    }

    commit() {
        this.edge.active = false;
        this.removed_fragment = this.graph.delete_edge(this.edge);
        this.committed = true;
    }

    rollback() {
        this.graph.add_fragment(this.removed_fragment);
        this.graph.update();
        this.committed = false;
    }
}

class AddBoundVertexAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added_fragment: Fragment | null;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.added_fragment = null;
    }

    commit() {
        if (this.added_fragment)
            this.graph.add_fragment(this.added_fragment);
        else
            this.added_fragment = this.graph.add_bound_vertex_to(this.vertex);
        this.committed = true;
    }
    rollback() {
        if (!this.added_fragment)
            return;
        this.graph.remove_fragment(this.added_fragment);
        this.committed = false;
    }
}

class AddDefaultFragmentAction extends Action {
    graph: Graph;
    x: number;
    y: number;
    added_fragment: Fragment | null;

    constructor(graph: Graph, x: number, y: number ) {
        super();
        this.graph = graph;
        this.x = x;
        this.y = y;
        this.added_fragment = null;
    }

    commit() {
        if (this.added_fragment)
            this.graph.add_fragment(this.added_fragment);
        else
            this.added_fragment = this.graph.add_default_fragment(this.x, this.y);
        this.committed = true;
    }

    rollback() {
        if (!this.added_fragment)
            return;
        this.graph.remove_fragment(this.added_fragment);
        this.committed = false;
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
        this.committed = true;
    }

    rollback() {
        if (!this.edge)
            return;
        this.graph.delete_edge(this.edge);
        this.edge = null;
        this.committed = false;
    }
}

class AddChainAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added_fragment: Fragment | null;
    natoms: number;

    constructor(graph: Graph, vertex: Vertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added_fragment = null;
    }

    commit() {
        if (this.added_fragment)
            this.graph.add_fragment(this.added_fragment);
        else
            this.added_fragment = this.graph.add_chain(this.vertex, this.natoms);
        this.committed = true;
    }

    rollback() {
        if (!this.added_fragment)
            return;
        this.graph.remove_fragment(this.added_fragment);
        this.committed = false;
    }
}

class AttachRingAction extends Action {
    graph: Graph;
    vertex: Vertex;
    added_fragment: Fragment | null;
    natoms: number;

    constructor(graph: Graph, vertex: Vertex, natoms: number) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.natoms = natoms;
        this.added_fragment = null;
    }

    commit() {
        if (this.added_fragment)
            this.graph.add_fragment(this.added_fragment);
        else
            this.added_fragment = this.graph.attach_ring(this.vertex, this.natoms);
        this.committed = true;
    }

    rollback() {
        if (!this.added_fragment)
            return;
        this.graph.remove_fragment(this.added_fragment);
        this.committed = false;
    }
}

class FuseRingAction extends Action {
    graph: Graph;
    edge: Edge;
    added_fragment: Fragment | null;
    natoms: number;

    constructor(graph: Graph, edge: Edge, natoms: number) {
        super();
        this.graph = graph;
        this.edge = edge;
        this.natoms = natoms;
        this.added_fragment = null;
    }

    commit() {
        if (this.added_fragment)
            this.graph.add_fragment(this.added_fragment);
        else
            this.added_fragment = this.graph.fuse_ring(this.edge, this.natoms);
        this.committed = true;
    }

    rollback() {
        if (!this.added_fragment)
            return;
        this.graph.remove_fragment(this.added_fragment);
        this.committed = false;
    }
}

class ChangeAtomLabelAction extends UpdatableAction {
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
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }
    commit() {
        this._set_label(this.new_label);
        this.committed = true;
    }
    rollback() {
        this._set_label(this.old_label);
        this.committed = false;
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
    old_x: number;
    old_y: number;
    new_x: number;
    new_y: number;

    constructor(graph: Graph, vertex: Vertex) {
        super();
        this.graph = graph;
        this.vertex = vertex;
        this.new_x = this.vertex.x;
        this.new_y = this.vertex.y;
        this.old_x = this.vertex.x;
        this.old_y = this.vertex.y;
    }

    commit() : void {
        this.new_x = this.vertex.x;
        this.new_y = this.vertex.y;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    rollback(): void {
        this.vertex.x = this.old_x;
        this.vertex.y = this.old_y;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
    }

    update(action: this) : boolean {
        if (action.vertex != this.vertex)
            return false;
        this.new_x = action.vertex.x;
        this.new_y = action.vertex.y;
        this.vertex.update();
        this.graph.find_edges_by_vertex(this.vertex).forEach(e => e.update());
        return true;
    }
}

export {
    Action,
    UpdatableAction,
    AddBoundVertexAction,
    AddChainAction,
    AddDefaultFragmentAction,
    AttachRingAction,
    BindVerticesAction,
    ChangeAtomLabelAction,
    ClearGraphAction,
    DeleteEdgeAction,
    DeleteVertexAction,
    FuseRingAction,
    MoveVertexAction,
    UpdateEdgeShapeAction,
};