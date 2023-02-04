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
  return {
    type:"Element",
    tag,
    children:[],
    isUnary
  }
}

console.log(JSON.stringify(parse('<div><span></span></div>'),false, ' '))