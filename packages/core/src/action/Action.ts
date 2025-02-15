
export enum ActionDirection {
    DO,
    UPDATE,
    UNDO,
    REDO
}

export abstract class Action {
    abstract commit() : void;
    abstract rollback() : void;
}

export abstract class UpdatableAction extends Action {
    abstract update(action: this): boolean;
}