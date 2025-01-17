import Konva from "konva";
import { Controller } from "../controller/Controller";
import { Drawable } from "../types";


export class DrawableBase implements Drawable {
    /**
     * If is drawn on the screen, this will refer to Controller. Otherwise it can be detached from screen
     * @defaultValue null
     */
    controller: Controller | null = null;

    /**
     * Contains all Konva elements that need to be drawn for this Drawable. Or null when Drawable is detached from controller.
     * @defaultValue null
     */
    public group: Konva.Group | null = null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attach_events(controller: Controller) {
        return;
    }

    /**
     * Attach this instance to Controller.
     * @param controller Controller to which attach the instance
     * @returns Konva group
     */
    attach(controller: Controller): Konva.Group {
        this.controller = controller;
        if (!this.group)
            this.group = new Konva.Group();
        this.attach_events(controller);
        this.update();
        return this.group;
    }

    /**
     * Detach the instance from the controller. Only data will be kept, rendering will be destroyed.
     */
    detach() {
        this.group?.destroy();
        this.controller = null;
    }

    /**
     * Perform drawing. Should be overriden in derived classes. Should perform minimalistic drawing to avoid unnecessary re-rendering of elements already rendered.
     * @returns
     */
    update(): void {
        return;
    }

    /**
     * Force redraw
     */
    draw(): void {
        this.group?.draw();
    }

    /**
     * Get x position of the group
     * @returns coordinate
     */
    public get x(): number {
        return this.group ? this.group.x() : 0;
    }

    /**
     * Set x position of the group
     * @param x coordinate
     */
    public set x(x: number) {
        this.group?.x(x);
    }

    /**
    * Get y position of the group
    * @returns coordinate
    */
    public get y(): number {
        return this.group ? this.group.y() : 0;
    }

    /**
     * Set y position of the group
     * @param y coordinate
     */
    public set y(y: number) {
        this.group?.y(y);
    }

    /**
    * Get rotation position of the group
    * @returns rotation in degrees
    */
    public get rotation(): number {
        return this.group ? this.group.rotation() : 0;
    }

    /**
     * Set rotation of the group
     * @param rotation in degrees
     */
    public set rotation(rotation: number) {
        this.group?.rotation(rotation);
    }

    public get scale_x(): number {
        return this.group ? this.group.scaleX() : 1;
    }

    public set scale_x(scale_x: number) {
        this.group?.scaleX(scale_x);
    }

    public get scale_y(): number {
        return this.group ? this.group.scaleY() : 1;
    }

    public set scale_y(scale_y: number) {
        this.group?.scaleY(scale_y);
    }

    public get visible(): boolean {
        return this.group ? this.group.visible() : false;
    }

    public set visible(visible: boolean) {
        this.group?.visible(visible);
    }
}