
import { ArcRotateCamera } from '@babylonjs/core';
import { Utils } from '../utils';

export interface RouletteViewerOptions {
    camera: ArcRotateCamera;
    style?: {
        hoverColor?: string;
    },
    customAction?: {
        title: string,
        action: () => void
    },
    lang?:{
        top: string,
        bottom: string,
        left: string,
        right: string,
        front: string,
        back: string,
        all: string
    }
}

const buttons = [{
    content: "顶视图",
    alpha: Math.PI / 2,
    beta: 0,
}, {
    content: "后视图",
    alpha: 3 * Math.PI / 2,
    beta: Math.PI / 2,
}, {
    content: "右视图",
    alpha: Math.PI,
    beta: Math.PI / 2,
},
    undefined,
{
    content: "底视图",
    alpha: Math.PI / 2,
    beta: Math.PI,
}, {
    content: "所有",
    alpha: undefined,
    beta: undefined,
}, {
    content: "左视图",
    alpha: 0,
    beta: Math.PI / 2,
}, {
    content: "前视图",
    alpha: Math.PI / 2,
    beta: Math.PI / 2,
}];

const size = 250;
const bgColor = "#2b2b2b";

export class RouletteViewer {
    private _container: HTMLDivElement;
    private position: { x: number, y: number } = { x: 0, y: 0 };
    private rotate = 0;
    private hoverBtnIndex = 0;

    get visible() {
        return this._container.style.display !== 'none';
    }

    set visible(value) {
        this._container.style.display = value ? 'flex' : 'none';
    }

    dispose: () => void;

    constructor(options: RouletteViewerOptions) {
        options.style ??= {};
        options.style.hoverColor ??= "#545454";
        if(options.lang){
            buttons[0]!.content = options.lang.top;
            buttons[1]!.content = options.lang.back;
            buttons[2]!.content = options.lang.right;
            buttons[4]!.content = options.lang.bottom;
            buttons[5]!.content = options.lang.all;
            buttons[6]!.content = options.lang.left;
            buttons[7]!.content = options.lang.front;
        }

        const that = this;
        this._container = Utils.createElement('div', {
            class: "camera-viewer",
            style: {
                height: size + "px",
                width: size + "px",
                position: "absolute",
                top: '0',
                left: '0',
                zIndex: "9999",
                transform: "translate(-50%, -50%)",
                display: "none",
                justifyContent: "center",
                alignItems: "center"
            },
            children: [
                Utils.createElement('div', {
                    class: "camera-viewer-controls",
                    style: {
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                    },
                    children: buttons.map((b, i) => {
                        const button = Utils.createElement('div', {
                            id: `camera-viewer-controls-button-${i}`,
                            class: "camera-viewer-controls-button" + (i === 0 ? " hover" : ""),
                            style: {
                                background: bgColor,
                                color: "#ffffff",
                                cursor: 'pointer',
                                borderRadius: "4px",
                                padding: '4px 8px',

                                position: 'absolute',
                                left: `50%`,
                                top: `50%`,
                                transform: `translate(-50%, -50%) rotate(${i * 360.0 / buttons.length - 90}deg) translate(${size / 2}px) rotate(${(i * 360.0 / buttons.length - 90) * -1}deg)`
                            }
                        });

                        if (b) {
                            button.innerText = b.content;
                            button.onclick = handleBtnClick;
                        } else {
                            if (options.customAction) {
                                button.innerText = options.customAction.title;
                                button.onclick = options.customAction.action;
                            } else {
                                button.style.display = 'none';
                            }

                        }

                        return button;
                    })
                }),

                Utils.createElement('div', {
                    class: "camera-viewer-center-circle",
                    style: {
                        width: "50px",
                        height: "50px",
                        position: "relative"
                    },
                    children: [
                        Utils.createElement('div', {
                            class: "camera-viewer-center-circle-back",
                            style: {
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                boxSizing: "border-box",

                                backgroundColor: "rgba(0,0,0,0)",
                                border: "10px solid #282621"
                            }
                        }),
                        Utils.createElement('div', {
                            id: "camera-viewer-center-circle-front",
                            class: "camera-viewer-center-circle-front",
                            style: {
                                transform: `rotate(${that.rotate}deg)`,

                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                boxSizing: "border-box",

                                backgroundColor: "rgba(0,0,0,0)",
                                border: `10px solid #63e2b7`,
                                clipPath: "polygon(35% 0%, 65% 0%, 50% 50%)"
                            }
                        })
                    ]
                })
            ]
        });

        this._container.innerHTML += `
            <style>
                .camera-viewer-controls-button.hover {
                    background: ${options.style.hoverColor} !important;
                }
            </style>
        `

        document.body.append(this._container);

        function handleKeyDown(e: KeyboardEvent) {
            // 防止一直按压重复触发
            if (e.repeat) return;

            // 控制控件显隐
            if (e.key === '`') {
                that.visible = !that.visible;
            }

            // 取消选择
            if (e.key === 'Escape' && that.visible) {
                that.visible = false;
            }
        }

        function handleMouseMove(e: MouseEvent) {
            if (that.visible) {  // 计算控件位置->鼠标位置的方向，设置button hover 
                const x0 = that.position.x;
                const y0 = that.position.y;
                const x1 = e.clientX;
                const y1 = e.clientY;

                // 计算方位角
                if (x1 === x0) {
                    if (y1 > y0) {
                        that.rotate = 180;
                    } else {
                        that.rotate = 0;
                    }
                } else {
                    const deg = Math.atan((y1 - y0) / (x1 - x0)) * 180 / Math.PI;
                    that.rotate = deg + (x1 > x0 ? 90 : 270);
                }

                document.getElementById(`camera-viewer-center-circle-front`)!.style.transform = `rotate(${that.rotate}deg)`;

                // 计算每一个button在360度（圆形）所占用的角度，并设置要hover的button index
                const dpn = 360 / buttons.length;
                const index = Math.floor((that.rotate + dpn / 2) / dpn);

                document.getElementById(`camera-viewer-controls-button-${that.hoverBtnIndex}`)?.classList.toggle('hover');
                that.hoverBtnIndex = index >= buttons.length ? 0 : index;
                document.getElementById(`camera-viewer-controls-button-${that.hoverBtnIndex}`)?.classList.toggle('hover');

            } else {  // 监听鼠标位置，为显示控件位置做准备
                that.position.x = e.clientX;
                that.position.y = e.clientY;

                that._container.style.top = that.position.y + "px";
                that._container.style.left = that.position.x + "px";
            }
        }

        function handleBtnClick() {
            if (that.visible) {
                that.visible = false;
                const button = buttons[that.hoverBtnIndex];

                Utils.zoomArcRotateCameraToAll(options.camera, {
                    alpha: button?.alpha,
                    beta: button?.beta
                });
            }
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('click', handleBtnClick);

        this.dispose = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleBtnClick);
        }
    }
}