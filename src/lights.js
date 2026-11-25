import {PracticeLights} from './practice-lights.js';
export {LightingControls,LightStalk,lightNames} from './practice-lights.js';
export const questions=[
 ...['请开启前照灯','夜间窄路与机动车会车','夜间窄桥与机动车会车','夜间与机动车会车','夜间在有路灯的道路上行驶','夜间在照明良好的道路上行驶','夜间直行通过路口','夜间同方向近距离跟车行驶'].map(text=>({text,answer:'low'})),
 ...['请将前照灯变成远光灯','夜间在没有路灯照明不良条件下行驶'].map(text=>({text,answer:'high'})),
 ...['夜间通过急弯、坡路','夜间通过坡路、拱桥','夜间通过急弯、拱桥','夜间通过拱桥、人行横道','夜间通过没有交通信号灯控制的路口','夜间超越前方车辆'].map(text=>({text,answer:'flash'})),
 ...['路边临时停车','夜间在道路上发生交通事故，妨碍交通又难以移动'].map(text=>({text,answer:'hazard-marker'})),
 {text:'考试结束请关闭所有灯光',answer:'off'}
];
export class LightingExam extends PracticeLights{
 constructor(mode,options){super(questions,mode,options);}
}
