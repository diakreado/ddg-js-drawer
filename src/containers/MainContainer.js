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

    const ast = new AstAnalizer();
    ast.analyze(code4);

    return (
        <div>
            <p>{ code1 }</p>
            <p>{ code2 }</p>
            <p>{ code3 }</p>
            <VisNetwork graph={ ast.blocks } links={ ast.links } />
        </div>
    );
}
