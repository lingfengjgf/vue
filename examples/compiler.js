function parse(template){
  const context={
    source:template,
    advance(num){
      context.source = context.source.slice(num)
    }
  }
  let nodes = parseChildren(context,[]);
  return nodes;
}

function parseChildren(context, stack){
  let nodes = [];

  // 开启状态判断
  while (!isEnd(context, stack)) {
    let node;
    // <
    if(context.source[0] === '<'){
      if(context.source[1] === '/'){
        // 不期望的结束标签
        console.error('不期望的结束标签');
        continue ;
      }else if(/[a-z]/i.test(context.source[1])){
        // 开始标签
        node = parseElement(context, stack);
      }
    }

    // {{
    if(context.source.startsWith('{{')){
      node = parseInterpolation(context);
    }

    // text
    if(!node){
      node = parseText(context);
    }

    nodes.push(node);
  }

  return nodes;
}

function isEnd(context, stack){
  if(!context.source){
    return true;
  }

  let parent = stack[stack.length - 1];
  if(parent&&context.source.startsWith(`</${parent.tag}>`)){
    return true;
  }
}

function parseElement(context, stack){
  const el = parseTag(context);
  if(el.isUnary){
    // 自闭合标签
    return el;
  }
  stack.push(el);

  // 递归处理子节点
  el.children = parseChildren(context, stack);
  stack.pop();

  parseTag(context, true);

  return el;
}

function parseTag(context, isEndTag = false){
  const pattern = isEndTag ? /^<\/([a-z][^\t\r\n\f />]*)/i : /^<([a-z][^\t\r\n\f />]*)/i;
  const match = pattern.exec(context.source);
  const tag= match[1];
  context.advance(match[0].length);
  const isUnary = context.source.startsWith("/>");
  context.advance(isUnary ? 2 : 1);

  // 构造元素节点并返回
  return {
    type:"Element",
    tag,
    children:[],
    isUnary
  }
}

function parseText(context){
  // content:{{text}}</div>
  let endIdx = context.source.length;
  const ltIdx = context.source.indexOf('<');
  const delimiterIdx = context.source.indexOf('{{');
  if(ltIdx>-1 && ltIdx<endIdx){
    endIdx = ltIdx;
  }
  if(delimiterIdx>-1 && delimiterIdx<endIdx){
    endIdx = delimiterIdx;
  }

  // 截取
  const content = context.source.slice(0,endIdx);
  context.advance(content.length);

  // 构造文本节点并返回
  return {
    type:'Text',
    content
  }
}

function parseInterpolation(context){
  // 去掉{{
  context.advance(2);

  // 查找}}
  const closeIdx = context.source.indexOf('}}');

  if(closeIdx === -1){
    console.error('插值表达式缺少结束分隔符');
    return ;
  }

  const content = context.source.slice(0, closeIdx);
  // 去掉content的长度
  context.advance(content.length);
  // 去掉}}
    context.advance(2);

  return {
    type:'Interpolation',
    content:{
      type:'Expression',
      content
    }
  }
}

// 代码生成
// with(this){ return _c('div',[...]) }
function generate(ast){
  const code = genNode(ast[0]);
  return `with(this){ return ${code} }`
}

function genNode(ast){
  if (ast.type === 'Element') {
    return genElement(ast);
  } else if(ast.type === 'Text'){
    return genText(ast);
  } else if(ast.type === 'Interpolation'){
    return genText(ast.content);
  }
  return '';
}

function genElement(el){
  const tag = `'${el.tag}'`;
  const children = genChildren(el);
  return `_c(${tag}${children?`,${children}`:''})`
}

function genChildren(el){
  const children = el.children;
  if(children){
    return `[${children.map(c=>genNode(c)).join(',')}]`
  }else{
    return ''
  }
}

function genText(text){
  const content = text.type === 'Expression' ? text.content : `'${text.content}'`;
  return `_v(${content})`;
}

console.log(JSON.stringify(parse('<div><span>num:{{num}}</span></div>'),false, ' '))
console.log(generate(parse('<div><span>num:{{num}}</span></div>')))