
// mini-vue
function Vue(options){
  this._init(options);
}

Vue.prototype._init=function(options){
  // options
  this.$options=options;
  // member init
  this.$parent=options.parent;
  // beforeCreated
  callHook(this,'beforeCreated');
  // state init
  initState(this);
  // ...
  // created
  callHook(this,'created');
}
Vue.set = Vue.prototype.$set = set;
Vue.delete = Vue.prototype.$delete = del;
// Vue.set
function set (target,key,val) {
  if(Array.isArray(target)){
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    // splice方法已经处理过了，会自动更新
    return val;
  }
  let ob = target.__ob__;
  if(!ob){
    target[key]= val;
    return val;
  }
  console.log("ob:",ob);
  // 设置动态属性拦截
  defineReactive(target,key,val);

  // 变更通知
  ob.dep.notify();
} 

// Vue.delete
function del (target,key){
  if(Array.isArray(target)){
    target.splice(key, 1);
    return ;
  }
  let ob = target.__ob__;
  delete target[key];
  if(ob){
    ob.dep.notify();
  }
}

function callHook(vm,hook){
  const hooks=vm.$options[hook];
  if(hooks){
    hooks.call(vm);
  }
}

function initState(vm){
  const opts = vm.$options;
  // props
  // setup
  // methods
  // data
  if (opts.data){
    initData(vm);
  }
  // computed
  // watch
}

function initData(vm){
  const data = vm._data = vm.$options.data.call(vm);

  // 代理data中的每一个属性
  const keys = Object.keys(data);
  let i = keys.length;
  while (i--) {
    const key = keys[i];
    proxy(vm, `_data`, key);
  }
  // 响应式处理
  observe(data);
}

// 代理指定对象的某个key到sourcekey上
function proxy(vm, sourceKey, key){
  Object.defineProperty(vm,key,{
    get(){
      return vm[sourceKey][key];
    },
    set(val){
      vm[sourceKey][key] = val;
    }
  })
}

Vue.prototype.$mount=function(el){
  // parent
  const parent=document.querySelector(el);
  // data
  // const data=this._data;

  const updateComponent=()=>{

      // 清空宿主内容
      parent.innerHTML = '';
      // append
      const node=this.$options.render.call(this);
      parent.appendChild(node);
  }

  // 创建watcher实例，作为当前组件的渲染watcher
  new Watcher(this,updateComponent);
}

// 响应式处理
function defineReactive(obj,key,val={}){
  // 递归处理
  const childOb = observe(val);

  // 每个属性都有一个dep
  const dep = new Dep();
  Object.defineProperty(obj,key,{
    get(){
      console.log('get ',key);
      console.log('Dep.target ',Dep.target);
      // 判断依赖收集的目标是否存在
      if(Dep.target){
        dep.depend();
        console.log('subs ',dep.subs);
        if(childOb){
          childOb.dep.depend();
          if(Array.isArray(val)){
            dependArray(val);
          }
        }
      }
      return val
    },
    set(newVal){
      console.log('set ',key);
      val=newVal;
      // 变更通知
      dep.notify();
    }
  })
}

function dependArray(items){
  for (const item of items) {
    // 如果item有ob，则对它伴生的dep做依赖收集
    if(item&&item.__ob__){
      item.__ob__.dep.depend();
    }
    // 如果item也是数组，向下递归
    if(Array.isArray(item)){
      dependArray(item)
    }
  }
}

function observe(obj){
  if(!(obj != null && typeof obj === 'object')){
    return ;
  }
  // 创建Observer实例，通过判断__ob__是否存在避免重复创建
  let ob;
  if(Object.prototype.hasOwnProperty.call(obj,'__ob__')){
    ob=obj.__ob__;
  }else{
    ob=new Observer(obj)
  }
  return ob;
}

class Observer{
  constructor(value){
    // 创建一个伴生的dep实例，负责通知动态属性的添加
    this.dep = new Dep();

    // 定义__ob__属性
    Object.defineProperty(value,'__ob__',{
      value:this,
      enumerable:false,
      writable:true,
      configurable:true
    })
    // 数组和对象的处理方式不同
    if(Array.isArray(value)){
      //array
      // 覆盖原型
      value.__proto__ = arrayMethods;
      this.observeArray(value);
    }else{
      //object
      this.walk(value);
    }
  }
  observeArray(items){
    for (const item of items) {
      observe(item);
    }
  }
  walk(obj){
    // 循环obj的所有属性，依次拦截
    const keys=Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj,keys[i],obj[keys[i]]);
    }
  }
}

let watcherId = 0;
class Watcher {
  constructor(vm,expOrFn){
    this.id = ++watcherId;
    this.vm = vm;
    this.getter = expOrFn;
    // 保存管理的所有dep
    this.newDeps = [];
    this.newDepIds = new Set();

    this.get();
  }

  get(){
    // 设置依赖目标
    Dep.target = this;

    const vm = this.vm;
    // 调用getter
    try {
      this.getter.call(vm,vm);
    } catch (error) {
      throw error
    } finally {
      // 完成依赖收集后清空静态变量
      Dep.target = undefined;
    }
    
  }

  addDep(dep){
    // 去重
    if(!this.newDepIds.has(dep.id)){
      this.newDeps.push(dep);
      this.newDepIds.add(dep.id);

      dep.addSub(this);
    }
  }

  update(){
    // this.get();
    // 异步更新
    queueWatcher(this);
  }

  run(){
    this.get();
  }
}

const queue = []; // 存放待执行的watcher
const has = {};
let waiting = false; // 是否正在执行更新
let flashing = false; // 已在queue队列中的watcher是否已执行完毕
function queueWatcher(watcher) {
  let id = watcher.id;
  if(has[id] != null) {
    return ;
  }
  has[id] = true;
  queue.push(watcher);
  // if(!flashing){
  // }else{
  //   let i = queue.length - 1;
    
  //   queue.splice(i,1,watcher);
  // }
  if(!waiting){
    waiting = true;
    nextTick(flushSchedulerQueue);
  }
}

function flushSchedulerQueue(){
  let id;
  flashing = true;
  for (const watcher of queue) {
    id = watcher.id;
    // 清空has.id,对应的watcher可以被重新添加 没有清空queue？
    has[id] = null;

    // 执行更新
    watcher.run();
  }
  // 状态还原
  flashing = waiting = false;  
}

const timerFunc= () => Promise.resolve().then(flushCallbacks);

const callbacks = []; // 存放异步任务
let pending = false;
function nextTick(cb){
  callbacks.push(cb);

  if(!pending){
    pending = true;
    timerFunc();
  }
}

function flushCallbacks(){
  pending = false;
  // 复制一份，防止有新的异步任务进入
  const copies = callbacks.slice(0);
  // 清空异步队列
  callbacks.length = 0;

  for (const cb of copies) {
    cb();
  }

}

let uid = 0;
class Dep {
  constructor(){
    this.id = uid++;
    this.subs = [];
  }

  // 通知watcher添加dep
  depend(){
    Dep.target.addDep(this);
  }

  // 在dep中保存当前watcher
  addSub(watcher){
    this.subs.push(watcher);
  }

  notify(){
    for (const sub of this.subs) {
      sub.update();
    }
  }
}

// 获取数组原型
const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);

// 7个需要覆盖的方法
const methodsToPatch = ['push','pop','shift','unshift','splice','sort','reverse'];

methodsToPatch.forEach(function (method){
  // 保存原始方法
  const origin = arrayMethods[method];

  Object.defineProperty(arrayMethods,method,{
    value:function mutator(...args){
      // 执行原始操作
      const result = origin.apply(this,args);

      // 对有可能新增元素的操作做处理，新元素要响应式处理
      const ob = this.__ob__;
      let inserted;
      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args;
          break;
        case 'splice':
          // splice不一定是新增元素，当有2个以上的参数时，splice才有新增元素
          inserted = args.slice(2);
          break;
      }
      if(inserted) {
        ob.observeArray(args);
      }
      ob.dep.notify();
      return result;
    }
  })
})