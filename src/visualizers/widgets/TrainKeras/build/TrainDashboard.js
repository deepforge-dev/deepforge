define((function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function l(t){t.forEach(e)}function o(t){return"function"==typeof t}function u(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function r(t,e){t.appendChild(e)}function c(t,e,n){t.insertBefore(e,n||null)}function i(t){t.parentNode.removeChild(t)}function a(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function s(t){return document.createElement(t)}function f(t){return document.createTextNode(t)}function p(){return f(" ")}function h(t,e,n,l){return t.addEventListener(e,n,l),()=>t.removeEventListener(e,n,l)}function d(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function m(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function g(t){return""===t?void 0:+t}function v(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}function _(t,e){t.value=null==e?"":e}function b(t,e,n,l){t.style.setProperty(e,n,l?"important":"")}function $(t,e){for(let n=0;n<t.options.length;n+=1){const l=t.options[n];if(l.__value===e)return void(l.selected=!0)}}function y(t){const e=t.querySelector(":checked")||t.options[0];return e&&e.__value}let x;function C(t){x=t}const j=[],E=[],k=[],z=[],A=Promise.resolve();let w=!1;function P(t){k.push(t)}let q=!1;const S=new Set;function O(){if(!q){q=!0;do{for(let t=0;t<j.length;t+=1){const e=j[t];C(e),T(e.$$)}for(j.length=0;E.length;)E.pop()();for(let t=0;t<k.length;t+=1){const e=k[t];S.has(e)||(S.add(e),e())}k.length=0}while(j.length);for(;z.length;)z.pop()();w=!1,q=!1,S.clear()}}function T(t){if(null!==t.fragment){t.update(),l(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(P)}}const D=new Set;function L(t,e){-1===t.$$.dirty[0]&&(j.push(t),w||(w=!0,A.then(O)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function N(u,r,c,a,s,f,p=[-1]){const h=x;C(u);const d=r.props||{},m=u.$$={fragment:null,ctx:null,props:f,update:t,not_equal:s,bound:n(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(h?h.$$.context:[]),callbacks:n(),dirty:p,skip_bound:!1};let g=!1;if(m.ctx=c?c(u,d,(t,e,...n)=>{const l=n.length?n[0]:e;return m.ctx&&s(m.ctx[t],m.ctx[t]=l)&&(!m.skip_bound&&m.bound[t]&&m.bound[t](l),g&&L(u,t)),e}):[],m.update(),g=!0,l(m.before_update),m.fragment=!!a&&a(m.ctx),r.target){if(r.hydrate){const t=function(t){return Array.from(t.childNodes)}(r.target);m.fragment&&m.fragment.l(t),t.forEach(i)}else m.fragment&&m.fragment.c();r.intro&&((v=u.$$.fragment)&&v.i&&(D.delete(v),v.i(_))),function(t,n,u){const{fragment:r,on_mount:c,on_destroy:i,after_update:a}=t.$$;r&&r.m(n,u),P(()=>{const n=c.map(e).filter(o);i?i.push(...n):l(n),t.$$.on_mount=[]}),a.forEach(P)}(u,r.target,r.anchor),O()}var v,_;C(h)}function B(t,e,n){const l=t.slice();return l[36]=e[n],l[37]=e,l[38]=n,l}function F(t,e,n){const l=t.slice();return l[39]=e[n],l}function M(t,e,n){const l=t.slice();return l[44]=e[n],l}function V(t,e,n){const l=t.slice();return l[36]=e[n],l[42]=e,l[43]=n,l}function G(t,e,n){const l=t.slice();return l[50]=e[n],l}function H(t,e,n){const l=t.slice();return l[47]=e[n],l}function I(t,e,n){const l=t.slice();return l[53]=e[n],l}function J(t){let e,n,l,o=t[53].name+"";return{c(){e=s("option"),n=f(o),e.__value=l=t[53],e.value=e.__value},m(t,l){c(t,e,l),r(e,n)},p(t,u){128&u[0]&&o!==(o=t[53].name+"")&&v(n,o),128&u[0]&&l!==(l=t[53])&&(e.__value=l,e.value=e.__value)},d(t){t&&i(e)}}}function K(t){let e,n,l,o=t[50].name+"";return{c(){e=s("option"),n=f(o),e.__value=l=t[50],e.value=e.__value},m(t,l){c(t,e,l),r(e,n)},p(t,u){64&u[0]&&o!==(o=t[50].name+"")&&v(n,o),64&u[0]&&l!==(l=t[50])&&(e.__value=l,e.value=e.__value)},d(t){t&&i(e)}}}function Q(t){let e,n,l=t[47][1],o=[];for(let e=0;e<l.length;e+=1)o[e]=K(G(t,l,e));return{c(){e=s("optgroup");for(let t=0;t<o.length;t+=1)o[t].c();m(e,"label",n=t[47][0])},m(t,n){c(t,e,n);for(let t=0;t<o.length;t+=1)o[t].m(e,null)},p(t,u){if(64&u[0]){let n;for(l=t[47][1],n=0;n<l.length;n+=1){const r=G(t,l,n);o[n]?o[n].p(r,u):(o[n]=K(r),o[n].c(),o[n].m(e,null))}for(;n<o.length;n+=1)o[n].d(1);o.length=l.length}64&u[0]&&n!==(n=t[47][0])&&m(e,"label",n)},d(t){t&&i(e),a(o,t)}}}function R(t){let e,n,l,o,u,a,d=t[36].name+"";function b(){t[24].call(o,t[42],t[43])}return{c(){e=s("label"),n=f(d),l=p(),o=s("input"),m(o,"type","number")},m(i,s){c(i,e,s),r(e,n),c(i,l,s),c(i,o,s),_(o,t[36].value),u||(a=h(o,"input",b),u=!0)},p(e,l){t=e,32&l[0]&&d!==(d=t[36].name+"")&&v(n,d),96&l[0]&&g(o.value)!==t[36].value&&_(o,t[36].value)},d(t){t&&i(e),t&&i(l),t&&i(o),u=!1,a()}}}function U(t){let e,n,l,o,u,d,m=t[36].name+"",g=t[36].options,_=[];for(let e=0;e<g.length;e+=1)_[e]=Y(M(t,g,e));function b(){t[23].call(o,t[42],t[43])}return{c(){e=s("label"),n=f(m),l=p(),o=s("select");for(let t=0;t<_.length;t+=1)_[t].c();void 0===t[36].value&&P(b)},m(i,a){c(i,e,a),r(e,n),c(i,l,a),c(i,o,a);for(let t=0;t<_.length;t+=1)_[t].m(o,null);$(o,t[36].value),u||(d=h(o,"change",b),u=!0)},p(e,l){if(t=e,32&l[0]&&m!==(m=t[36].name+"")&&v(n,m),32&l[0]){let e;for(g=t[36].options,e=0;e<g.length;e+=1){const n=M(t,g,e);_[e]?_[e].p(n,l):(_[e]=Y(n),_[e].c(),_[e].m(o,null))}for(;e<_.length;e+=1)_[e].d(1);_.length=g.length}96&l[0]&&$(o,t[36].value)},d(t){t&&i(e),t&&i(l),t&&i(o),a(_,t),u=!1,d()}}}function W(t){let e,n,l,o,u,a,d=t[36].name+"";function g(){t[22].call(o,t[42],t[43])}return{c(){e=s("label"),n=f(d),l=p(),o=s("input"),m(o,"type","text")},m(i,s){c(i,e,s),r(e,n),c(i,l,s),c(i,o,s),_(o,t[36].value),u||(a=h(o,"input",g),u=!0)},p(e,l){t=e,32&l[0]&&d!==(d=t[36].name+"")&&v(n,d),96&l[0]&&o.value!==t[36].value&&_(o,t[36].value)},d(t){t&&i(e),t&&i(l),t&&i(o),u=!1,a()}}}function X(e){return{c:t,m:t,p:t,d:t}}function Y(t){let e,n,l,o=t[44]+"";return{c(){e=s("option"),n=f(o),e.__value=l=t[44],e.value=e.__value},m(t,l){c(t,e,l),r(e,n)},p(t,u){32&u[0]&&o!==(o=t[44]+"")&&v(n,o),96&u[0]&&l!==(l=t[44])&&(e.__value=l,e.value=e.__value)},d(t){t&&i(e)}}}function Z(t){let e;function n(t,e){return"boolean"===t[36].type?X:"string"===t[36].type?W:"enum"===t[36].type?U:R}let l=n(t),o=l(t);return{c(){e=s("div"),o.c(),m(e,"class","form-group")},m(t,n){c(t,e,n),o.m(e,null)},p(t,u){l===(l=n(t))&&o?o.p(t,u):(o.d(1),o=l(t),o&&(o.c(),o.m(e,null)))},d(t){t&&i(e),o.d()}}}function tt(t){let e,n,l,o=t[39].name+"";return{c(){e=s("option"),n=f(o),e.__value=l=t[39],e.value=e.__value},m(t,l){c(t,e,l),r(e,n)},p(t,u){16&u[0]&&o!==(o=t[39].name+"")&&v(n,o),16&u[0]&&l!==(l=t[39])&&(e.__value=l,e.value=e.__value)},d(t){t&&i(e)}}}function et(t){let e,n,l,o,u,a,d=t[36].name+"";function b(){t[27].call(o,t[37],t[38])}return{c(){e=s("label"),n=f(d),l=p(),o=s("input"),m(o,"type","number")},m(i,s){c(i,e,s),r(e,n),c(i,l,s),c(i,o,s),_(o,t[36].value),u||(a=h(o,"input",b),u=!0)},p(e,l){t=e,8&l[0]&&d!==(d=t[36].name+"")&&v(n,d),24&l[0]&&g(o.value)!==t[36].value&&_(o,t[36].value)},d(t){t&&i(e),t&&i(l),t&&i(o),u=!1,a()}}}function nt(t){let e,n,l,o,u,a,d=t[36].name+"";function g(){t[26].call(o,t[37],t[38])}return{c(){e=s("label"),n=f(d),l=p(),o=s("input"),m(o,"type","text")},m(i,s){c(i,e,s),r(e,n),c(i,l,s),c(i,o,s),_(o,t[36].value),u||(a=h(o,"input",g),u=!0)},p(e,l){t=e,8&l[0]&&d!==(d=t[36].name+"")&&v(n,d),24&l[0]&&o.value!==t[36].value&&_(o,t[36].value)},d(t){t&&i(e),t&&i(l),t&&i(o),u=!1,a()}}}function lt(e){return{c:t,m:t,p:t,d:t}}function ot(t){let e;function n(t,e){return"boolean"===t[36].type?lt:"string"===t[36].type?nt:et}let l=n(t),o=l(t);return{c(){e=s("div"),o.c(),m(e,"class","form-group")},m(t,n){c(t,e,n),o.m(e,null)},p(t,u){l===(l=n(t))&&o?o.p(t,u):(o.d(1),o=l(t),o&&(o.c(),o.m(e,null)))},d(t){t&&i(e),o.d()}}}function ut(e){let n,o,u,f,v,y,x,C,j,E,k,z,A,w,q,S,O,T,D,L,N,M,G,K,R,U,W,X,Y,et,nt,lt,ut,rt,ct,it,at,st,ft,pt,ht,dt,mt,gt,vt,_t,bt,$t,yt=e[7],xt=[];for(let t=0;t<yt.length;t+=1)xt[t]=J(I(e,yt,t));let Ct=e[6],jt=[];for(let t=0;t<Ct.length;t+=1)jt[t]=Q(H(e,Ct,t));let Et=e[5].arguments,kt=[];for(let t=0;t<Et.length;t+=1)kt[t]=Z(V(e,Et,t));let zt=e[4],At=[];for(let t=0;t<zt.length;t+=1)At[t]=tt(F(e,zt,t));let wt=e[3].arguments,Pt=[];for(let t=0;t<wt.length;t+=1)Pt[t]=ot(B(e,wt,t));return{c(){n=s("main"),o=s("div"),u=s("div"),f=s("h3"),f.textContent="Training Parameters",v=p(),y=s("div"),x=s("form"),C=s("div"),j=s("label"),j.textContent="Architecture:",E=p(),k=s("select");for(let t=0;t<xt.length;t+=1)xt[t].c();z=p(),A=s("div"),w=s("label"),w.textContent="Loss Function:",q=p(),S=s("select");for(let t=0;t<jt.length;t+=1)jt[t].c();O=p(),T=s("span"),D=p();for(let t=0;t<kt.length;t+=1)kt[t].c();L=p(),N=s("div"),M=s("label"),M.textContent="Optimizer:",G=p(),K=s("select");for(let t=0;t<At.length;t+=1)At[t].c();R=p();for(let t=0;t<Pt.length;t+=1)Pt[t].c();U=p(),W=s("div"),X=s("label"),X.textContent="Batch Size",Y=p(),et=s("input"),nt=p(),lt=s("div"),ut=s("label"),ut.textContent="Epochs",rt=p(),ct=s("input"),it=p(),at=s("div"),st=s("label"),st.textContent="Validation Split",ft=p(),pt=s("input"),ht=p(),dt=s("button"),dt.textContent="Train",mt=p(),gt=s("div"),vt=p(),_t=s("div"),_t.textContent="test",m(j,"for","arch"),m(k,"id","arch"),void 0===e[8]&&P(()=>e[20].call(k)),m(C,"class","form-group"),m(w,"for","loss"),m(S,"id","loss"),void 0===e[5]&&P(()=>e[21].call(S)),m(T,"class","glyphicon glyphicon-info-sign"),m(T,"aria-hidden","true"),m(A,"class","form-group"),m(M,"for","optimizer"),m(K,"id","optimizer"),void 0===e[3]&&P(()=>e[25].call(K)),m(N,"class","form-group"),m(et,"type","number"),m(W,"class","form-group"),m(ct,"type","number"),m(lt,"class","form-group"),m(pt,"type","number"),m(at,"class","form-group"),m(dt,"type","button"),m(dt,"class","btn btn-primary"),m(y,"class","well"),m(u,"class","config-panel svelte-1jqbxjb"),m(gt,"class","plot-container"),b(gt,"flex-grow","4"),b(_t,"display","none"),m(_t,"class","output-panel svelte-1jqbxjb"),m(o,"class","row svelte-1jqbxjb"),m(n,"class","svelte-1jqbxjb")},m(t,l){c(t,n,l),r(n,o),r(o,u),r(u,f),r(u,v),r(u,y),r(y,x),r(x,C),r(C,j),r(C,E),r(C,k);for(let t=0;t<xt.length;t+=1)xt[t].m(k,null);$(k,e[8]),r(x,z),r(x,A),r(A,w),r(A,q),r(A,S);for(let t=0;t<jt.length;t+=1)jt[t].m(S,null);$(S,e[5]),r(A,O),r(A,T),r(x,D);for(let t=0;t<kt.length;t+=1)kt[t].m(x,null);r(x,L),r(x,N),r(N,M),r(N,G),r(N,K);for(let t=0;t<At.length;t+=1)At[t].m(K,null);$(K,e[3]),r(x,R);for(let t=0;t<Pt.length;t+=1)Pt[t].m(x,null);var i;r(x,U),r(x,W),r(W,X),r(W,Y),r(W,et),_(et,e[0]),r(x,nt),r(x,lt),r(lt,ut),r(lt,rt),r(lt,ct),_(ct,e[1]),r(x,it),r(x,at),r(at,st),r(at,ft),r(at,pt),_(pt,e[2]),r(y,ht),r(y,dt),r(o,mt),r(o,gt),e[31](gt),r(o,vt),r(o,_t),e[32](n),bt||($t=[h(k,"change",e[20]),h(S,"change",e[21]),h(K,"change",e[25]),h(et,"input",e[28]),h(ct,"input",e[29]),h(pt,"input",e[30]),h(dt,"click",d((i=e[11],function(t){return t.preventDefault(),i.call(this,t)})))],bt=!0)},p(t,e){if(128&e[0]){let n;for(yt=t[7],n=0;n<yt.length;n+=1){const l=I(t,yt,n);xt[n]?xt[n].p(l,e):(xt[n]=J(l),xt[n].c(),xt[n].m(k,null))}for(;n<xt.length;n+=1)xt[n].d(1);xt.length=yt.length}if(384&e[0]&&$(k,t[8]),64&e[0]){let n;for(Ct=t[6],n=0;n<Ct.length;n+=1){const l=H(t,Ct,n);jt[n]?jt[n].p(l,e):(jt[n]=Q(l),jt[n].c(),jt[n].m(S,null))}for(;n<jt.length;n+=1)jt[n].d(1);jt.length=Ct.length}if(96&e[0]&&$(S,t[5]),32&e[0]){let n;for(Et=t[5].arguments,n=0;n<Et.length;n+=1){const l=V(t,Et,n);kt[n]?kt[n].p(l,e):(kt[n]=Z(l),kt[n].c(),kt[n].m(x,L))}for(;n<kt.length;n+=1)kt[n].d(1);kt.length=Et.length}if(16&e[0]){let n;for(zt=t[4],n=0;n<zt.length;n+=1){const l=F(t,zt,n);At[n]?At[n].p(l,e):(At[n]=tt(l),At[n].c(),At[n].m(K,null))}for(;n<At.length;n+=1)At[n].d(1);At.length=zt.length}if(24&e[0]&&$(K,t[3]),8&e[0]){let n;for(wt=t[3].arguments,n=0;n<wt.length;n+=1){const l=B(t,wt,n);Pt[n]?Pt[n].p(l,e):(Pt[n]=ot(l),Pt[n].c(),Pt[n].m(x,U))}for(;n<Pt.length;n+=1)Pt[n].d(1);Pt.length=wt.length}1&e[0]&&g(et.value)!==t[0]&&_(et,t[0]),2&e[0]&&g(ct.value)!==t[1]&&_(ct,t[1]),4&e[0]&&g(pt.value)!==t[2]&&_(pt,t[2])},i:t,o:t,d(t){t&&i(n),a(xt,t),a(jt,t),a(kt,t),a(At,t),a(Pt,t),e[31](null),e[32](null),bt=!1,l($t)}}}function rt(t,e,n){const l={name:"",arguments:[]};let o,u,r,c,i=null,a=32,s=50,f=.1,p=l,h=[],d=l,m=[],v=[];return[a,s,f,p,h,d,m,v,o,u,c,function(){const t=new CustomEvent("onTrainClicked");c.dispatchEvent(t)},function(t,e){!function(t){t.losses.concat(t.optimizers).forEach(e=>{e.arguments=e.arguments.filter(t=>"name"!==t.name).map(e=>(e.name.includes("reduction")?(e.type="enum",e.options=t.reductions):e.type=typeof e.default,e.value=e.default,e))})}(e),n(4,h=e.optimizers),n(3,p=h[0]);const l={};e.losses.forEach(t=>{l[t.category]||(l[t.category]=[]),l[t.category].push(t)}),n(6,m=Object.entries(l)),n(5,d=e.losses[0]),i=t,i.newPlot(u)},function(){return c},function(t){r=t,i&&i.react(u,r)},function(t){n(7,v=v.concat(t)),o||n(8,o=v[0])},function(t){n(7,v=v.map(e=>e.id===t.id?t:e))},function(t){n(7,v=v.filter(e=>e.id!==t)),o&&o.id===t&&n(8,o=v[0])},function(t){n(5,d=t.loss||d),n(3,p=t.optimizer||p),n(7,v=t.architectures||v)},function(){return{architecture:o,batchSize:a,validation:f,optimizer:p,epochs:s,loss:d}},function(){o=y(this),n(8,o),n(7,v)},function(){d=y(this),n(5,d),n(6,m)},function(t,e){t[e].value=this.value,n(5,d),n(6,m)},function(t,e){t[e].value=y(this),n(5,d),n(6,m)},function(t,e){t[e].value=g(this.value),n(5,d),n(6,m)},function(){p=y(this),n(3,p),n(4,h)},function(t,e){t[e].value=this.value,n(3,p),n(4,h)},function(t,e){t[e].value=g(this.value),n(3,p),n(4,h)},function(){a=g(this.value),n(0,a)},function(){s=g(this.value),n(1,s)},function(){f=g(this.value),n(2,f)},function(t){E[t?"unshift":"push"](()=>{u=t,n(9,u)})},function(t){E[t?"unshift":"push"](()=>{c=t,n(10,c)})}]}return class extends class{$destroy(){!function(t,e){const n=t.$$;null!==n.fragment&&(l(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}{constructor(t){super(),N(this,t,rt,ut,u,{initialize:12,events:13,setPlotData:14,addArchitecture:15,updateArchitecture:16,removeArchitecture:17,set:18,data:19},[-1,-1])}get initialize(){return this.$$.ctx[12]}get events(){return this.$$.ctx[13]}get setPlotData(){return this.$$.ctx[14]}get addArchitecture(){return this.$$.ctx[15]}get updateArchitecture(){return this.$$.ctx[16]}get removeArchitecture(){return this.$$.ctx[17]}get set(){return this.$$.ctx[18]}get data(){return this.$$.ctx[19]}}}));
//# sourceMappingURL=TrainDashboard.js.map
