import { div } from 'prelude-ls';
import VisNetwork from '../components/VisNetwork';
import AstAnalizer from '../components/AstAnalizer';
 
export default function MainContainer() {

const code = `
function lol() {
    const s = 5;
    const n = 10;
    let a = 0;
    let b = 1;
    let c;
    let i;

    i = s + 1;
    while(i > n) {
        c = a + b;
        a = b + 1;
        b = c + 1;
        i = i + 1;
    }

    return b;
}
`;

    const ast = new AstAnalizer();

    ast.analyze(code);

    return (
        <div>
            { code }
            <VisNetwork />
        </div>
    );
}
