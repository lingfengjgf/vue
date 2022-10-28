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
  // ...
  // created
  callHook(this,'created');
}

function callHook(vm,hook){
  const hooks=vm.$options[hook];
  if(hooks){
    hooks.call(vm);
  }
}

Vue.prototype.$mount=function(el){
  // parent
  const parent=document.querySelector(el);
  // data
  const data=this.$options.data();
  // append
  const node=this.$options.render.call(data);
  parent.appendChild(node);
}

// 响应式处理
function defineReactive(obj,key,val={}){
  // 递归处理
  observe(val);

  Object.defineProperty(obj,key,{
    get(){
      console.log('get ',key);
      return val
    },
    set(newVal){
      console.log('set ',key);
      val=newVal;
    }
  })
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
    }else{
      //object
      this.walk(value);
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