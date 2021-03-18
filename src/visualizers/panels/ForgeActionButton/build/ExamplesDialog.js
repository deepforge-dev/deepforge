define((function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function o(t){t.forEach(e)}function i(t){return"function"==typeof t}function l(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function r(t,e){t.appendChild(e)}function s(t,e,n){t.insertBefore(e,n||null)}function c(t){t.parentNode.removeChild(t)}function a(t){return document.createElement(t)}function u(t){return document.createTextNode(t)}function d(){return u(" ")}function f(t,e,n,o){return t.addEventListener(e,n,o),()=>t.removeEventListener(e,n,o)}function h(t){return function(e){return e.preventDefault(),t.call(this,e)}}function p(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function m(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function y(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}let g;function $(t){g=t}function v(t){(function(){if(!g)throw new Error("Function called outside component initialization");return g})().$$.on_mount.push(t)}const x=[],b=[],w=[],j=[],_=Promise.resolve();let E=!1;function k(t){w.push(t)}let C=!1;const q=new Set;function A(){if(!C){C=!0;do{for(let t=0;t<x.length;t+=1){const e=x[t];$(e),L(e.$$)}for($(null),x.length=0;b.length;)b.pop()();for(let t=0;t<w.length;t+=1){const e=w[t];q.has(e)||(q.add(e),e())}w.length=0}while(x.length);for(;j.length;)j.pop()();E=!1,C=!1,q.clear()}}function L(t){if(null!==t.fragment){t.update(),o(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(k)}}const N=new Set;function T(t,e){-1===t.$$.dirty[0]&&(x.push(t),E||(E=!0,_.then(A)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function M(l,r,s,a,u,d,f=[-1]){const h=g;$(l);const p=r.props||{},m=l.$$={fragment:null,ctx:null,props:d,update:t,not_equal:u,bound:n(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(h?h.$$.context:[]),callbacks:n(),dirty:f,skip_bound:!1};let y=!1;if(m.ctx=s?s(l,p,(t,e,...n)=>{const o=n.length?n[0]:e;return m.ctx&&u(m.ctx[t],m.ctx[t]=o)&&(!m.skip_bound&&m.bound[t]&&m.bound[t](o),y&&T(l,t)),e}):[],m.update(),y=!0,o(m.before_update),m.fragment=!!a&&a(m.ctx),r.target){if(r.hydrate){const t=function(t){return Array.from(t.childNodes)}(r.target);m.fragment&&m.fragment.l(t),t.forEach(c)}else m.fragment&&m.fragment.c();r.intro&&((v=l.$$.fragment)&&v.i&&(N.delete(v),v.i(x))),function(t,n,l){const{fragment:r,on_mount:s,on_destroy:c,after_update:a}=t.$$;r&&r.m(n,l),k(()=>{const n=s.map(e).filter(i);c?c.push(...n):o(n),t.$$.on_mount=[]}),a.forEach(k)}(l,r.target,r.anchor),A()}var v,x;$(h)}function O(t,e,n){const o=t.slice();return o[9]=e[n],o}function z(t){let e,n,o,i,l,g,$,v,x,b,w,j,_,E,k=t[9].name+"",C=t[9].library+"",q=t[9].description+"";function A(){return t[7](t[9])}return{c(){e=a("tr"),n=a("td"),o=u(k),i=d(),l=a("td"),g=u(C),$=d(),v=a("td"),x=u(q),b=d(),w=a("td"),w.innerHTML='<i class="material-icons">get_app</i>',j=d(),m(v,"class","description svelte-1wyi7sj")},m(t,c){s(t,e,c),r(e,n),r(n,o),r(e,i),r(e,l),r(l,g),r(e,$),r(e,v),r(v,x),r(e,b),r(e,w),r(e,j),_||(E=f(w,"click",p(h(A))),_=!0)},p(e,n){t=e,1&n&&k!==(k=t[9].name+"")&&y(o,k),1&n&&C!==(C=t[9].library+"")&&y(g,C),1&n&&q!==(q=t[9].description+"")&&y(x,q)},d(t){t&&c(e),_=!1,E()}}}function B(e){let n,o,i,l,u,y,g,$,v,x,b,w,j,_,E,k,C=e[0],q=[];for(let t=0;t<C.length;t+=1)q[t]=z(O(e,C,t));return{c(){n=a("div"),o=a("div"),i=a("div"),l=a("div"),u=a("button"),u.textContent="x",y=d(),g=a("span"),g.textContent="Available Examples",$=d(),v=a("div"),x=a("div"),b=a("table"),w=a("thead"),w.innerHTML='<tr><th class="svelte-1wyi7sj">Name</th> \n                                <th class="svelte-1wyi7sj">Library</th> \n                                <th class="svelte-1wyi7sj">Description</th></tr>',j=d(),_=a("tbody");for(let t=0;t<q.length;t+=1)q[t].c();m(u,"type","button"),m(u,"class","close"),m(g,"class","title svelte-1wyi7sj"),m(l,"class","modal-header"),m(b,"class","table highlight"),m(v,"class","modal-body"),m(i,"class","modal-content"),m(o,"class","modal-dialog modal-lg"),m(n,"class","examples-modal modal fade in svelte-1wyi7sj"),m(n,"tabindex","-1"),m(n,"role","dialog")},m(t,c){s(t,n,c),r(n,o),r(o,i),r(i,l),r(l,u),r(l,y),r(l,g),r(i,$),r(i,v),r(v,x),r(x,b),r(b,w),r(b,j),r(b,_);for(let t=0;t<q.length;t+=1)q[t].m(_,null);e[8](n),E||(k=f(u,"click",p(h(e[1]))),E=!0)},p(t,[e]){if(9&e){let n;for(C=t[0],n=0;n<C.length;n+=1){const o=O(t,C,n);q[n]?q[n].p(o,e):(q[n]=z(o),q[n].c(),q[n].m(_,null))}for(;n<q.length;n+=1)q[n].d(1);q.length=C.length}},i:t,o:t,d(t){t&&c(n),function(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}(q,t),e[8](null),E=!1,k()}}}function D(t,e,n){let o,{examples:i=[]}=e,{jquery:l}=e,{client:r}=e;async function s(t){const e=new CustomEvent("importExample",{detail:t});o.dispatchEvent(e)}v(()=>l(o).modal("show"));return t.$$set=t=>{"examples"in t&&n(0,i=t.examples),"jquery"in t&&n(4,l=t.jquery),"client"in t&&n(5,r=t.client)},[i,function(){l(o).modal("hide")},o,s,l,r,function(){return o},t=>s(t),function(t){b[t?"unshift":"push"](()=>{o=t,n(2,o)})}]}return class extends class{$destroy(){!function(t,e){const n=t.$$;null!==n.fragment&&(o(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}{constructor(t){var e;super(),document.getElementById("svelte-1wyi7sj-style")||((e=a("style")).id="svelte-1wyi7sj-style",e.textContent=".description.svelte-1wyi7sj.svelte-1wyi7sj{font-style:italic}.title.svelte-1wyi7sj.svelte-1wyi7sj{font-size:28px;vertical-align:middle}.examples-modal.svelte-1wyi7sj th.svelte-1wyi7sj{text-align:left}",r(document.head,e)),M(this,t,D,B,l,{examples:0,jquery:4,client:5,destroy:1,events:6})}get destroy(){return this.$$.ctx[1]}get events(){return this.$$.ctx[6]}}}));
//# sourceMappingURL=ExamplesDialog.js.map