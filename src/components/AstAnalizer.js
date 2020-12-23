const parse    = require('@babel/parser').parse;
const traverse = require('@babel/traverse').default;
// const generate = require('@babel/generator').default;

class AstAnalyzer {
    constructor() {
        this.tree   = null;
        this.code   = null;
        this.order  = 0;
        this.blocks = [];
    }

    parseCode() {
        const ast = parse(this.code);
        this.tree = ast;
    }

    analyze(code) {
        this.code = code;
        this.parseCode();
        this.createDDG();
    }

    createDDG() {
        const operaions = this.blocks;

        traverse(this.tree, {
            enter(path) {
                if (path.isVariableDeclaration()) {
                    const declaraion = path.node.declarations[0];
                    if (declaraion.init) {
                        operaions.push(`${path.node.kind} ${declaraion.id.name} = ${declaraion.init.value};`);
                    } else {
                        operaions.push(`${path.node.kind} ${declaraion.id.name} = 0;`);
                    }
                }
                if (path.isExpressionStatement()) {
                    // console.log('ExpressionStatement');
                }
                if (path.isAssignmentExpression()) {
                    // console.log('AssignmentExpression');
                    // console.log('ass path.node : ', path.node.name);
                }
                if (path.isStatement()) {
                    // console.log('path.node : ', path.node);
                }
                if (path.isIdentifier()) {
                    // console.log('path.node.name : ', path.node.name);
                }
                // in this example change all the variable `n` to `x`
                // if (path.isIdentifier({ name: 'n' })) {
                //     path.node.name = 'x';
                // }
            },
        });

        this.blocks.forEach(el => console.log(el));

        console.log('================================================');

        // generate code <- ast
        // const output = generate(this.tree, this.code);
        // console.log(output.code); // 'const x = 1;'
    }

}

module.exports = AstAnalyzer;