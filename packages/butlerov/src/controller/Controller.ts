import Konva from "konva";
import { Stylesheet } from "./Stylesheet";
import { Action, UpdatableAction, ActionDirection } from "../action/Action";
import { Drawable } from "../drawable/Drawable";

/**
 * This is a base class for controller. It performs basic actions like keeping track of the stage,
 * undo and redo
 */
export class Controller {
    stage: Konva.Stage;
    stylesheet: Stylesheet;
    action_stack: Array<Action> = [];
    actions_rolled_back = 0;
    _on_change: (() => void) | null = null;

    constructor(stage: Konva.Stage, autofocus = true) {
        this.stage = stage;
        this.stylesheet = new Stylesheet();
        const container = this.stage.container();
        container.tabIndex = 1;
        autofocus && container.focus();
    }

    /**
     *  Create instance of Controller from DOM element
     * @param el - DOM element or selector (string)
     * @param autofocus whether enable focus on element after loading
     * @returns instance of Controller
     */
    static from_html_element<T extends Controller>(
        this: {new(stage: Konva.Stage, autofocus: boolean): T},
        el: HTMLDivElement,
        autofocus = true) {

        const stage = new Konva.Stage({
            container: el,
            width: el.clientWidth,
            height: el.clientHeight
        });
        return new this(stage, autofocus);

    }

    /**
     * Commit action to history and execute changes
     * @param action @see Action to commit
     */
    commit_action(action: Action): void {
        // find last action that has not been rolled back, and throw away history after it
        for (let i = 0; i < this.actions_rolled_back; i++) {
            this.action_stack.pop();
        }
        this.actions_rolled_back = 0;
        if (this.action_stack.length) {
            const last_action = this.action_stack[this.action_stack.length - 1];
            if (last_action instanceof UpdatableAction && action.constructor == last_action.constructor) {
                if (last_action.update(<UpdatableAction>action)) {
                    this.on_action(ActionDirection.UPDATE);
                    if (this._on_change)
                        this._on_change();
                    return;
                }
            }
        }
        this.action_stack.push(action);
        action.commit();
        this.on_action(ActionDirection.DO);
        if (this._on_change)
            this._on_change();
    }

    /**
     * Rollback actions from history
     * @param count number of actions to rollback
     */
    rollback_actions(count: number): void {
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back >= this.action_stack.length)
                return;
            this.actions_rolled_back += 1;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].rollback();
        }
        this.on_action(ActionDirection.UNDO);
        if (this._on_change)
            this._on_change();
    }

    /**
     * Recommit (Redo) as many actions in history as possible up to count.
     * @param count number of actions to recommit
     */
    recommit_actions(count: number): void {
        for (let i = 0; i < count; i++) {
            if (this.actions_rolled_back < 1 )
                return;
            this.action_stack[this.action_stack.length - this.actions_rolled_back].commit();
            this.actions_rolled_back -= 1;
        }
        this.on_action(ActionDirection.UNDO);
        if (this._on_change)
            this._on_change();
    }

    /**
     * Clear action history.
     */
    clear_actions(): void {
        this.actions_rolled_back = 0;
        this.action_stack = [];
    }

    /**
     * Set callback function for change event
     */
    public set onchange(handler: () => void) {
        this._on_change = handler;
    }


    /**
     * For the use in derived classes: callback method for actions.
     * @param direction whether action is performed for the first time (DO), updated (UPDATE), rolled back, or recommitted.
     * @returns
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected on_action(direction: ActionDirection ): void {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public dispatch(entity: Drawable, evt: Konva.KonvaEventObject<MouseEvent>)  {
        return;
    }
}