import * as BABYLON from '@babylonjs/core';
import { Utils } from './utils';
import { FollowDomManager } from './DomManager';

export interface SnapOptions {
    scene: BABYLON.Scene,
    clipPlanes?: BABYLON.Plane[];
    tolerance?: number;
}

export class Snap {
    private _obs: BABYLON.Observer<BABYLON.PointerInfo> | undefined;
    private _snapPoint: BABYLON.Vector3 | undefined;
    private _domManager: FollowDomManager;

    constructor(private options: SnapOptions) {
        this.options.tolerance ??= 8;

        this._domManager = new FollowDomManager(this.options.scene);
        const wapper = this._domManager.set("snap-box", Utils.createElement('div', {
            class: "snap-box-vertex",
            style: {
                width: "8px",
                height: "8px",
                border: "2px solid #4cff33"
            }
        }), new BABYLON.Vector3(0, 0, 0)).wapper;
        wapper.style.pointerEvents = 'none';
        wapper.className = "snap-box";
        this._domManager.setVisible(false);
    }

    get snapPoint() {
        return this._snapPoint;
    }

    private set snapPoint(value: BABYLON.Vector3 | undefined) {
        if (value) {
            this._domManager.get("snap-box").forEach(x => {
                x.setPosition(value);
            });
            this._domManager.setVisible(true);
        } else {
            this._domManager.setVisible(false);
        }
        this._snapPoint = value;
    }

    start() {
        if (this._obs) return;

        const scene = this.options.scene;

        this._obs = scene.onPointerObservable.add((p, e) => {

            if (p.type !== BABYLON.PointerEventTypes.POINTERMOVE) {
                return;
            };

            const pickInfo = Utils.pickSceneWithClipPlanes(scene, this.options.clipPlanes);
            const mesh = pickInfo.pickedMesh;
            const faceId = pickInfo.faceId;
            const point = pickInfo.pickedPoint;

            if (point && mesh && mesh instanceof BABYLON.Mesh) {
                const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh).clone().transform(mesh.getWorldMatrix());
                const positions = vertexData.positions!;
                const indices = vertexData.indices!;

                const i1 = indices[faceId * 3];
                const i2 = indices[faceId * 3 + 1];
                const i3 = indices[faceId * 3 + 2];

                const p1 = new BABYLON.Vector3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
                const p2 = new BABYLON.Vector3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);
                const p3 = new BABYLON.Vector3(positions[i3 * 3], positions[i3 * 3 + 1], positions[i3 * 3 + 2]);

                const point = pickInfo.pickedPoint!;
                let snapedPoint: BABYLON.Vector3 | undefined;
                let minDistance = Number.MAX_VALUE;

                const canvas = scene.getEngine().getRenderingCanvas()!;
                const coordScalePoint = BABYLON.Vector3.Project(
                    point,
                    BABYLON.Matrix.Identity(),
                    scene.getTransformMatrix(),
                    scene.activeCamera!.viewport);
                const top = canvas.clientHeight * coordScalePoint.y;
                const left = canvas.clientWidth * coordScalePoint.x;

                [p1, p2, p3].forEach(p => {
                    const coordScale = BABYLON.Vector3.Project(
                        p,
                        BABYLON.Matrix.Identity(),
                        scene.getTransformMatrix(),
                        scene.activeCamera!.viewport);
                    const top1 = canvas.clientHeight * coordScale.y;
                    const left1 = canvas.clientWidth * coordScale.x;

                    const d = Math.sqrt((top - top1) * (top - top1) + (left - left1) * (left - left1));
                    if (d < minDistance) {
                        minDistance = d;
                        if (d < this.options.tolerance!)
                            snapedPoint = p;
                    }
                });

                if (snapedPoint) {
                    this.snapPoint = snapedPoint;
                }
                else {
                    this.snapPoint = undefined;
                }
            } else {
                this.snapPoint = undefined;
            }
        });
    }

    stop() {
        if (this._obs) {
            this.options.scene.onPointerObservable.remove(this._obs);
        }
    }
}