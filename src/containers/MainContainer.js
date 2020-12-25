import React, { useState, useEffect } from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/snippets/javascript";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";


import VisNetwork from '../components/VisNetwork';
import AstAnalizer from '../components/AstAnalizer';
 
export default function MainContainer() {

const code1 = `
function lol() {
    const boleanVar = true;
    const s = 5;
    const text = 'text';
    const n = 10;
    let a = 0;
    let b = 1;
    let p = a;
    let c;
    let i;

    text += '!';

    const arr = [0, p, 1, n, [s, a, '4', false]];

    n+=1;

    i = n;
    i = s + 1;
    i = arr;
    i = i + s + p;

    i = 6;

    while((i + 1) > (n - 1) && boleanVar) {
        c = a + b;
        a = b + 1;
        b = c + 1;
        i = i + 1;
        break;
        i = 0;
    }

    c = i;
}
`;
const code2 = `
function lol() {

    let x = 1;

    for(let i = x; i < 10; i++) {
        x += i + 1;
    }

    const result = x - 1;
}
`;
const code3 = `
function lol() {
    let a = 3;
    let b = a;
    let c = b + a;

    if (c < 10) {
        a = c;
        b = c + a;
    } else {
        a = b * 12;
    }

    b = a;

    if (a > 10 - c && a < 20 - a && c > a + b || a >= 12) {
        c = a - b;
    }

    const result = c + 1;
}
`;
const code4 = `
function lol() {
    let a = 3;
    let b = a;
    let c = b + a;

    if (c < 10) {
        a = c;
        b = c + a;
    } else {
        a = b * 12;
    }
    b = a;
}
`;
const code5 = `
function lol() {
    let a = 2;
    let b = a + 2;

    a += b;

    if (a > 10) {
     b = a;
    } else {
     b = a - 1;
    }

    a += 1;
    b = a*4;
}
`;
const code6 = `
function lol(n) {
    let a = 3;
    let b = a;
    b -= a;
    while (b < 30 * a) {
        a = b;
        b+= a;
    }
}
`;
const code7 = `
function lol(n) {
    let a = 3;
    let b = a;
    let c = b + a;
    if (c < 10) {
    a = c
    b = c + a
    }
    b = a
}
`;
const code8 = `
function lol(n) {
    let a = 3;
    let b = a;
    let c = 93 + n;
    let k = 12;
    for (let i = 0; i < c; i++){
        b += a + i
        a = k + 43
        break
        k = a + b
        c = k - a
    }
    b = c % k
}
`;
const code9 = `
function lol(n) {
    let a = 0;
    let b = 1;
    let c = 0;
    if (n < 2) {
      return n;
    }
    for (let i = 0; i < n; i++) {
    c = a + b
    a = b
    b = c
    }
    return c;
}
`;

    const [ast,  setAst ] = useState();
    const [code, setCode] = useState(code8);

    useEffect(() => {
        try {
            const localAst = new AstAnalizer();
            localAst.analyze(code);
            setAst(localAst);
        } catch (error) {
            console.log(error);
        }
    }, [code]);

    function handleCodeChange(newCode) {
        try {
            setCode(newCode)
            const localAst = new AstAnalizer();
            localAst.analyze(newCode);
            setAst(localAst);
        } catch (error) {
            console.log(error);
        }
    }

    return <>
        <AceEditor
            className="texteditor"
            mode="javascript"
            height="100%"
            width="100%"
            theme="solarized_light"
            value={ code }
            onChange={ handleCodeChange }
            fontSize={ 22 }
            showPrintMargin={ true }
          />
        { ast ? <VisNetwork graph={ ast.blocks } links={ ast.links } />
              : null }
    </>;
}
